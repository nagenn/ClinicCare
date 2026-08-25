export const meta = {
  name: 'staff-identity-gap-fix',
  description: 'Detect and fix the Doctors <-> Lab staff-identity design gap (no role distinction between physicians and lab technicians)',
  phases: [
    { title: 'Gap Detection', detail: 'Check whether Role field, filtering, and UI wiring already exist' },
    { title: 'Fix Implementation', detail: 'Apply any missing backend/frontend changes' },
    { title: 'Verification', detail: 'Regression-test doctors/patients/referrals/labs endpoints and frontend build' },
    { title: 'Report', detail: 'Summarize findings and update the context map status' },
  ],
}

const REPO = 'c:\\Users\\Administrator\\Documents\\PE_Training\\ClinicCare'

const DETECTION_SCHEMA = {
  type: 'object',
  properties: {
    satisfied: { type: 'boolean' },
    details: { type: 'string' },
  },
  required: ['satisfied', 'details'],
}

phase('Gap Detection')

const DETECTION_CHECKS = [
  {
    key: 'backend_role_field',
    prompt: `In the ClinicCare repo at ${REPO}, read services/doctors/models.py, services/doctors/schemas.py, services/doctors/seed.py, and services/doctors/main.py.
Report whether ALL of the following are true:
(a) the Doctor SQLAlchemy model has a Role column (string, defaulting to "physician")
(b) the DoctorBase pydantic schema includes a Role field
(c) seed.py keeps the original 7 physician entries first, in the same order (Ananya Krishnan, Vikram Reddy, Meera Nair, Arjun Malhotra, Priya Iyer, Rohan Sharma, Kavita Desai), and appends at least 2 additional entries with Role="lab_technician"
(d) GET /doctors in main.py accepts an optional ?role= query parameter and filters by it
Return satisfied=true only if ALL four hold. Quote the relevant lines in details.`,
  },
  {
    key: 'frontend_model_service',
    prompt: `In the ClinicCare repo at ${REPO}, read frontend/src/app/core/models/doctor.model.ts and frontend/src/app/core/services/doctor.service.ts.
Report satisfied=true only if the Doctor interface has a Role: string field AND DoctorService.search() accepts an optional role parameter that is sent as an HTTP query param (matching the existing specialty param pattern).`,
  },
  {
    key: 'lab_tech_ui_filter',
    prompt: `In the ClinicCare repo at ${REPO}, read frontend/src/app/features/lab-technician/technician-dashboard.component.ts and frontend/src/app/features/lab-technician/sample-tracker.component.ts.
Report satisfied=true only if BOTH components' ngOnInit call doctorService.search(...) passing a 'lab_technician' role filter (not an unfiltered call). Also confirm frontend/src/app/features/lab/create-lab-order.component.ts and lab-results.component.ts (the clinician UI) were NOT changed to filter by role — they should still call search() unfiltered for physicians. If those clinician files WERE incorrectly filtered, report satisfied=false and explain.`,
  },
]

const detectionResults = await parallel(
  DETECTION_CHECKS.map((c) => () =>
    agent(c.prompt, { label: `detect:${c.key}`, phase: 'Gap Detection', schema: DETECTION_SCHEMA }).then((r) => ({
      ...r,
      key: c.key,
    })),
  ),
)

const satisfiedCount = detectionResults.filter((r) => r && r.satisfied).length
log(`Detection complete: ${satisfiedCount}/${detectionResults.length} checks already satisfied`)

phase('Fix Implementation')

const FIX_PROMPTS = {
  backend_role_field: `In the ClinicCare repo at ${REPO}, ensure services/doctors has a Role field end-to-end:
- Doctor SQLAlchemy model: add a Role column (String, nullable=False, default="physician", server_default="physician")
- DoctorBase pydantic schema: add Role: str = "physician"
- main.py: GET /doctors accepts role: Optional[str] = None query param and filters models.Doctor.Role == role when provided
- seed.py: keep the original 7 physician entries FIRST, in their existing order and with all existing fields unchanged (add Role="physician" explicitly to each), then APPEND at least 2 new entries with Role="lab_technician" (e.g. Specialty="Laboratory", Department="Lab Services")
If services/doctors/doctors.db already exists with the old schema (no Role column), delete it so it gets recreated fresh with correct seed data. Then restart the doctors-service: find the process listening on port 8002 (PowerShell: netstat -ano | findstr :8002), stop it, and start a fresh one in the background: cd services/doctors; py -3.11 -m uvicorn main:app --host 0.0.0.0 --port 8002 (use "py -3.11", plain python/python3 are not on PATH in this environment). Report exactly what you changed and confirm the service restarted successfully.`,
  frontend_model_service: `In the ClinicCare repo at ${REPO}, add a Role: string field to the Doctor interface in frontend/src/app/core/models/doctor.model.ts, and extend DoctorService.search() in frontend/src/app/core/services/doctor.service.ts to accept an optional role parameter, passed as an HTTP query param alongside the existing specialty param. Report exactly what you changed.`,
  lab_tech_ui_filter: `In the ClinicCare repo at ${REPO}, update frontend/src/app/features/lab-technician/technician-dashboard.component.ts and frontend/src/app/features/lab-technician/sample-tracker.component.ts so their ngOnInit calls doctorService.search() with a 'lab_technician' role filter, matching whatever signature DoctorService.search() actually has. Do NOT touch frontend/src/app/features/lab/*.ts (clinician UI) — those must keep calling search() unfiltered for physicians. Report exactly what you changed.`,
}

const unresolved = detectionResults.filter((r) => r && !r.satisfied)

const fixResults =
  unresolved.length === 0
    ? []
    : await parallel(
        unresolved.map((item) => () =>
          agent(FIX_PROMPTS[item.key], { label: `fix:${item.key}`, phase: 'Fix Implementation' }).then((text) => ({
            key: item.key,
            result: text,
          })),
        ),
      )

if (unresolved.length === 0) {
  log('All gap-fix checks already satisfied — nothing to fix, proceeding straight to verification.')
} else {
  log(`Applied fixes for: ${unresolved.map((r) => r.key).join(', ')}`)
}

phase('Verification')

const verification = await agent(
  `Verify the ClinicCare staff-identity fix end-to-end against the already-running local app (gateway at http://localhost:8000, frontend at http://localhost:4200). Run these checks with curl/PowerShell and report actual output:
1. curl http://localhost:8000/api/doctors — must return 200 and include the 7 original physicians at DoctorId 1-7 with Role":"physician", plus at least 2 entries with Role":"lab_technician".
2. curl "http://localhost:8000/api/doctors?role=lab_technician" — must return ONLY lab_technician entries.
3. curl "http://localhost:8000/api/doctors?role=physician" — must return ONLY the original 7 physicians (DoctorId 1-7).
4. curl http://localhost:8000/api/patients, curl http://localhost:8000/api/referrals, curl http://localhost:8000/api/labs/orders — each must return 200 (no regression from this change).
5. Run: cmd /c "cd ${REPO}\\frontend && npm run build 2>&1" — must complete with zero errors.
Report pass/fail booleans for each check plus a one-line detail.`,
  {
    label: 'verify-fix',
    phase: 'Verification',
    schema: {
      type: 'object',
      properties: {
        doctors_list_ok: { type: 'boolean' },
        role_filter_lab_tech_ok: { type: 'boolean' },
        role_filter_physician_ok: { type: 'boolean' },
        no_regressions: { type: 'boolean' },
        frontend_build_ok: { type: 'boolean' },
        details: { type: 'string' },
      },
      required: [
        'doctors_list_ok',
        'role_filter_lab_tech_ok',
        'role_filter_physician_ok',
        'no_regressions',
        'frontend_build_ok',
        'details',
      ],
    },
  },
)

phase('Report')

const allPass =
  verification.doctors_list_ok &&
  verification.role_filter_lab_tech_ok &&
  verification.role_filter_physician_ok &&
  verification.no_regressions &&
  verification.frontend_build_ok

log(
  `Gap fix ${allPass ? 'VERIFIED' : 'NEEDS ATTENTION'} — ${unresolved.length} item(s) needed fixing, ${
    detectionResults.length - unresolved.length
  } already satisfied.`,
)

return {
  detection: detectionResults,
  fixes_applied: fixResults,
  verification,
  overall_status: allPass ? 'fixed_and_verified' : 'needs_attention',
}
