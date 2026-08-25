# Lab Management Module — Context Map

**Source of intent:** [diagnostic_lab-intent.md](diagnostic_lab-intent.md)
**Purpose:** Maps each requirement/deliverable in the project plan to what actually exists in the codebase today, with file references and honest gaps. Legend: ✅ Done · ⚠️ Partial/gap · ❌ Not done.
**Snapshot date:** 2026-08-12

---

## 1. Executive Summary

The Lab Management Module is substantially complete across all four workstreams in the intent doc — backend, both frontend tracks, and Docker/QA setup. The backend (Member 1) was fully implemented per its own Week 1/2 summaries, then **re-validated end-to-end and had 3 critical + 1 medium + 6 low-severity defects fixed** on 2026-08-12 (see `.claude/workflows/VALIDATION_REPORT.md`). The frontend (Members 2 & 3) built out both the clinician-facing lab module and the lab-technician module, including routing, navigation, and a patient-chart integration — more complete than a first glance at `lab.service.ts` alone would suggest, since technician-side calls live in a second service file (`lab-tech.service.ts`).

**Overall: MVP functionally complete and demonstrable end-to-end.** Remaining gaps are role-based access control for the technician module, embedding lab data directly in the referral detail view (currently link-based instead), and the Phase 2 items the plan explicitly deferred.

---

## 2. Backend — Lab Service (Member 1 / Backend Lead)

Per `services/lab/WEEK1_SUMMARY.md` and `WEEK2_SUMMARY.md`, self-reported ✅ COMPLETE for both weeks. Independently confirmed via a live automated validation workflow, followed by fixes to what it found.

| Requirement (§2.1–2.5, §6) | Status | Evidence |
|---|---|---|
| Test Catalog CRUD (list/get/get-by-code/create/update/delete) | ✅ | `services/lab/main.py` — 6 endpoints; `PATCH` partial-update bug found in validation is now fixed |
| Lab Orders (create/list/get/update), patient+referral+doctor validation | ✅ | `main.py` `create_order()` — now also validates `ordered_by` against the Doctors Service (added during remediation; previously unchecked) |
| Sample Collection (`POST /orders/{id}/collect`) | ✅ | `main.py`, returns typed `LabSampleRead` (fixed during remediation — previously a hand-built dict missing type safety) |
| Status Tracking (`PATCH .../status`, `GET .../history`) | ✅ | `main.py` — shared `ORDER_TEST_STATUS_TRANSITIONS` map + `_recompute_order_status()` helper (added during remediation to fix order/test status desync) |
| Test Results (submit/list/review) | ✅ | `main.py` — result submission now requires prior sample collection; zero-value truthiness bug fixed; review endpoint returns full `TestResultRead` |
| Notification integration (order created, result completed, critical result) | ✅ (fixed) | Was **broken** — schema mismatch with `services/notification` meant every lab notification silently failed with `422`. Fixed by extending the Notification Service's schema (`ReferralId` optional, new `LabOrderCreated`/`LabResultCritical`/`LabResultCompleted` event types) and rewriting `notify_lab_event()`. Verified live. |
| Audit logging / StatusHistory | ✅ | `models.StatusHistory`, populated on every status-mutating endpoint |
| Statistics (`GET /stats`, `GET /orders/stats/specialty/{specialty}`) | ✅ | `main.py` |
| Seed data (25+ tests) | ✅ | `services/lab/seed.py` — 27 tests across 6 specialties |
| DB schema, relationships, cascades | ✅ | `services/lab/models.py` — added a `UniqueConstraint(order_id, test_id)` and enabled `PRAGMA foreign_keys=ON` during remediation (previously unenforced) |
| Dockerfile + docker-compose entry | ✅ | `services/lab/Dockerfile`, `docker-compose.yml` |
| Gateway routing (`/api/labs/*`) | ✅ | `gateway/main.py` `SERVICE_MAP["labs"]` + `UNPREFIXED_SERVICES` |
| API docs (`ENDPOINTS.md`, `README.md`) | ✅ | Updated during remediation to drop stale "to be implemented" tags and correct a documented-but-wrong `201` status code |
| `GET /orders/{order_id}/tests` (documented in plan's data model as "OrderTest") | ⚠️→✅ | Was documented in `ENDPOINTS.md` but never implemented — **added** during remediation |

**Not done (explicit, out of scope for the fix pass):** Authentication/authorization on any endpoint — flagged in the plan's Member 1 responsibilities ("Authentication/authorization") but genuinely absent across **all** ClinicCare services, not lab-specific. Tracked as a known gap, not silently missing.

---

## 3. Frontend — Clinician Interface (Member 2)

`frontend/src/app/features/lab/`

| Requirement (§F1–F3 in plan) | Status | Evidence |
|---|---|---|
| Lab module structure & routing | ✅ | `app.routes.ts`: `lab/tests`, `lab/orders`, `lab/orders/new`, `lab/orders/:id` |
| HTTP client service (`lab.service.ts`) | ✅ | `core/services/lab.service.ts` — wraps tests/orders/results list+detail, `createOrder`, `reviewResult` |
| Test Catalog browser | ✅ | `lab-test-catalog.component.ts/html/css` |
| Lab Order creation form (multi-step) | ✅ | `create-lab-order.component.ts/html/css` (171 lines — full form, not a stub) |
| Lab Order list view (filterable) | ✅ | `lab-orders-list.component.ts/html/css` |
| Lab Results viewer | ✅ | `lab-results.component.ts/html/css`, routed at `lab/orders/:id` |
| Integration into patient chart | ✅ | `patient-details.component.html` embeds `<app-lab-results-panel [patientId]="patient.PatientId" />`, backed by `lab-results-panel.component.ts` |
| Integration into referral detail view | ⚠️ | `referral-tracking.component.html` links out to `/lab/orders` and `/lab/orders/new` with `referralId`/`patientId` query params — **navigation-based, not an embedded lab widget** inside a referral detail screen (the plan called for "Show associated lab orders in referral view" / "Show lab results within referral context") |
| Real-time status updates (polling) | ❌ | Not found in any lab component — plan asked for 30s auto-refresh on in-progress orders |
| Styling consistent with app | ✅ | Each component ships its own `.css`; consistent with sibling features (patients/referrals) |
| Print/export on results | ✅ | `lab-results.component.html` has a "Print / Export" button calling `print()` |

---

## 4. Frontend — Lab Technician Interface (Member 3)

`frontend/src/app/features/lab-technician/`

| Requirement (§F2–F4 in plan) | Status | Evidence |
|---|---|---|
| Lab Technician module & routing | ✅ | `app.routes.ts` nested `lab-tech` route: `dashboard`, `samples`, `process`, `stats` |
| Technician dashboard | ✅ | `technician-dashboard.component.ts/html/css` |
| Sample Collection tracking UI | ✅ | `sample-tracker.component.ts/html/css` (142 lines) |
| Test Processing UI | ✅ | `test-processing.component.ts/html/css` (128 lines), includes bulk-select ("Start Selected" bulk button) |
| Result Entry form | ✅ | `result-entry.component.ts/html/css` — embedded inside `test-processing.component.html` (`<app-result-entry>`), not a standalone route |
| Sample Barcode/Label component | ✅ | `sample-label.component.ts/html/css` — embedded inside `sample-tracker.component.html` (`<app-sample-label>`) |
| Bulk Operations UI (optional MVP+) | ✅ | `bulk-btn` present in both `sample-tracker` and `test-processing` templates |
| Lab Statistics dashboard | ✅ | `lab-stats.component.ts/html/css`, routed at `lab-tech/stats` |
| HTTP client for technician actions | ✅ | `core/services/lab-tech.service.ts` (separate from `lab.service.ts`) — wraps `collectSample`, `updateTestStatus`, `submitResult`, `getHistory`, `loadStats` |
| Role-based access (technician role only) | ❌ | Plan explicitly calls for this ("Add role-based access (lab technician role only)"). `core/guards/auth.guard.ts` only checks `isAuthenticated()` — no role check exists anywhere in `frontend/src/app/core`. `/lab-tech/*` is reachable by any logged-in user. |
| Styling & validation/error handling | ✅ | Each component has its own `.css`; forms include client-side validation |

---

## 5. QA / DevOps / Integration (Member 4)

| Requirement (§7 Deliverables Checklist) | Status | Evidence |
|---|---|---|
| Docker setup for Lab Service | ✅ | `services/lab/Dockerfile`, `docker-compose.yml` |
| Docker Compose integration | ✅ | Gateway, lab-service, notification-service all wired; verified via live `docker-compose up` |
| API testing (endpoint-by-endpoint) | ✅ | Automated `lab-service-validation` workflow (22 agents) — see `.claude/workflows/VALIDATION_REPORT.md` |
| End-to-end workflow testing (order → collect → process → result → review) | ✅ | Both the automated workflow and manual live verification during remediation (order lifecycle re-run and confirmed `status: "completed"`) |
| Bug tracking / bug report | ✅ | `.claude/workflows/VALIDATION_REPORT.md` — full findings list with severity, all now fixed except auth |
| Test plan document / 50+ test case checklist | ✅ | `services/lab/TESTING_GUIDE.md` (40+ cases) + `WEEK2_SUMMARY.md` (60+ cases documented) |
| UAT sign-off document | ⚠️ | No standalone UAT sign-off doc exists; `PROJECT_COMPLETION_SUMMARY.md` served this role but its "production-ready" claim was found inaccurate by validation and has been corrected with a pointer to the remediation |
| Deployment checklist | ⚠️ | Present narratively inside `PROJECT_COMPLETION_SUMMARY.md` ("Production Readiness" section) rather than as a separate checklist artifact |
| Updated CLAUDE.md with lab module info | ❌ | `CLAUDE.md` at the repo root does not mention the Lab Service, its port (8006), or its endpoints — the "Adding a New Feature" / "Service Dependencies" sections predate this module |

---

## 6. Consolidated Gap List (things to do next)

Ordered by how much they block calling this "done" per the original plan's own success criteria (§10):

1. **Role-based access control** for `/lab-tech/*` routes — explicitly required by the plan, absent app-wide (not just lab). Needs a role/claim on the auth token and a route guard, e.g. `labTechGuard`.
2. **CLAUDE.md update** — the plan's own Day 10 QA task ("Update CLAUDE.md with lab module information") was never done; the root `CLAUDE.md` still lists only 5 backend services and doesn't mention port 8006 or the gateway's `labs` route quirk (`UNPREFIXED_SERVICES`).
3. **Referral detail embedding** — currently link/query-param navigation to a separate lab page rather than an embedded panel inside the referral detail view (patient chart already got the embedded-panel treatment; referral view didn't).
4. **Real-time status polling** on the clinician's order view — plan asked for a 30s auto-refresh; not implemented (no polling logic found in any lab component).
5. **Formal UAT sign-off doc and standalone deployment checklist** — content exists but is folded into `PROJECT_COMPLETION_SUMMARY.md` rather than being the standalone artifacts the plan's checklist (§7) calls for.

**Explicitly out of scope (Phase 2, per §11 of the intent doc — correctly not attempted):** email notifications to patients, result trend graphs, advanced filtering, batch barcode printing, HL7/FHIR integration, formal result-approval workflow, external lab performance dashboards, result templates.

---

## 7. Related Documents

- [diagnostic_lab-intent.md](diagnostic_lab-intent.md) — the original plan this map is scored against
- [.claude/workflows/VALIDATION_REPORT.md](.claude/workflows/VALIDATION_REPORT.md) — full backend validation findings + remediation record
- [services/lab/ENDPOINTS.md](services/lab/ENDPOINTS.md) — current API reference (v1.1, post-remediation)
- [services/lab/PROJECT_COMPLETION_SUMMARY.md](services/lab/PROJECT_COMPLETION_SUMMARY.md) — Member 1's completion claim, now annotated with the 2026-08-12 validation update
- [services/lab/WEEK1_SUMMARY.md](services/lab/WEEK1_SUMMARY.md), [WEEK2_SUMMARY.md](services/lab/WEEK2_SUMMARY.md) — backend's own sprint records
