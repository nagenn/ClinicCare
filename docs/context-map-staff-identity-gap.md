# Context Map: Staff Identity Gap (Doctors ↔ Lab)

## Purpose

This document maps the bounded contexts (microservices) involved in
clinical-staff identity and highlights a design gap discovered while
building the Lab module: **the system has no concept of a "lab
technician" as distinct from a "doctor."**

## Bounded Context Map

```
┌─────────────────┐        Customer/Supplier        ┌──────────────────┐
│  Doctors Service │ ───────────────────────────────▶│ Referral Service │
│  (upstream)      │   "does doctor X exist?"         │ (downstream)     │
│  Owns: Doctor     │                                  └──────────────────┘
│  {DoctorId, Name,│
│   Specialty,     │        Conformist (gap)          ┌──────────────────┐
│   Department,    │ ───────────────────────────────▶ │   Lab Service    │
│   ContactInfo}   │   "give me a person to act as     │ (downstream)     │
│                  │    ordered_by / reviewed_by /     │ Stores actor refs│
│  No `role` field │    collected_by / changed_by /    │ as bare ints:    │
│  — every row is  │    submitted_by"                  │ ordered_by,      │
│  an undifferen-  │                                    │ collected_by,   │
│  tiated "doctor" │   Doctors Service has no way to    │ changed_by,     │
└──────────────────┘   answer "who is a lab tech vs.    │ reviewed_by,    │
         ▲              a treating physician" — it       submitted_by     │
         │              only knows medical specialties. └──────────────────┘
         │
   Conformist (gap)
         │
┌────────┴──────────────────────┐   ┌───────────────────────────────┐
│ Frontend: Lab Tech UI          │   │ Frontend: Lab Clinician UI     │
│ "Acting as: [Select            │   │ "Ordering Doctor" /            │
│  technician...]" dropdown      │   │ "Reviewing Doctor" dropdowns   │
│ → populated from the FULL      │   │ → also populated from the      │
│   doctor roster (cardiologists,│   │   full doctor roster (correct  │
│   orthopedists, etc.)          │   │   here — these ARE doctors)    │
└─────────────────────────────────┘   └───────────────────────────────┘
```

## The Gap

- **Doctors Service** (`services/doctors/models.py`) exposes exactly one
  entity, `Doctor`, with no attribute indicating role or staff type.
- **Lab Service** (`services/lab/main.py`, `models.py`) needs to record
  *who* performed each action (`ordered_by`, `collected_by`,
  `changed_by`, `reviewed_by`, `submitted_by`) but has no identity
  context of its own — it just stores whatever integer ID the frontend
  sends.
- Both Lab-facing frontends therefore **conform** to the only directory
  available (Doctors), even though semantically:
  - The **Lab Technician** dashboard's "Acting as" selector
    (`frontend/src/app/features/lab-technician/technician-dashboard.component.ts`)
    should only offer lab technicians, not cardiologists/orthopedists.
  - The **Lab Clinician** UI's "Ordering Doctor" / "Reviewing Doctor"
    selectors (`frontend/src/app/features/lab/create-lab-order.component.ts`,
    `lab-results.component.ts`) correctly want physicians.
- Result: in the current UI, a lab technician "acting as" dropdown lists
  every physician in the building, and there is no way to seed or
  filter for actual lab staff. It works today only because the two
  concepts happen to share an ID space by coincidence, not by design.

## Why This Matters

- **Data integrity**: nothing stops a cardiologist's ID from being
  recorded as the sample collector, or a lab tech's ID (if one existed)
  from being recorded as the ordering physician.
- **UX correctness**: as the doctor roster grows, the "Acting as"
  technician dropdown becomes increasingly wrong/noisy.
- **Future-proofing**: any real authentication/authorization work
  (mentioned as "planned" in `services/lab/ENDPOINTS.md`) will need a
  role concept to exist somewhere — better to introduce it narrowly now
  than retrofit it later.

## Proposed Fix (scoped, additive, non-breaking)

1. **Doctors Service**: add an optional `Role` field to `Doctor`
   (`"physician" | "lab_technician"`, default `"physician"`) — additive
   column, no migration risk to existing rows/consumers. Add a few
   `lab_technician` seed rows. Support `?role=` filter on `GET /doctors`.
2. **Frontend `Doctor` model/service**: add `Role` to the model; allow
   `DoctorService.search()` to filter by role.
3. **Lab Tech UI**: "Acting as" selector filters to `Role ===
   'lab_technician'` only.
4. **Lab Clinician UI**: "Ordering Doctor" / "Reviewing Doctor"
   selectors filter to `Role === 'physician'` (unchanged behavior for
   existing data, since default role is `physician`).
5. No changes to Referral/Patient/Document/Notification services or to
   existing Lab Service order data — this is purely additive to the
   Doctors bounded context and consuming UI filters.

## Status

- [x] Gap identified and mapped (this document)
- [x] Fix implemented — delegated to a subagent (see task below)
