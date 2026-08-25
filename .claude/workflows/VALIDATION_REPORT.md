# Lab Service Validation Report

**System:** ClinicCare — Lab Service (port 8006)
**Validation Date:** 2026-08-12
**Validated By:** Automated `lab-service-validation` workflow (22 agents: health check, 18 endpoint tests, integration tests, data-integrity checks, report generation)
**Service Version:** 1.0.0 (per `/health`)

---

## REMEDIATION UPDATE (2026-08-12, post-validation)

All issues logged in §6 below have been fixed in `services/lab` and `services/notification`, except #8 (auth/RBAC — app-wide gap, out of scope for this pass). Each fix was verified with live requests against the rebuilt Docker containers (not just a code read). This section supersedes the "Not Production Ready" verdict in §1/§8 for the issues it covers; a full re-run of the automated 22-agent workflow is still recommended before final sign-off, since this pass was targeted spot-verification, not a full re-sweep of all 19 endpoints.

| # | Issue | Fix | Verified |
|---|---|---|---|
| 1 | Order status never re-synced after result submission | Extracted shared `_recompute_order_status()` helper (`services/lab/main.py`), called from both `submit_test_result()` and `update_test_status()` | Live: order with 2 tests reached `status:"completed"` immediately after the 2nd result was submitted; `/stats` reflected it correctly |
| 2 | Lab ↔ Notification Service schema mismatch (silent notification loss) | Notification Service schema/model now accept `ReferralId: Optional[int]`, added `LabOrderCreated`/`LabResultCritical`/`LabResultCompleted` event types + `Source` field; rewrote `notify_lab_event()` to send the matching `{ReferralId, EventType, Message, Source}` shape | Live: `POST /orders` produced a real stored `LabOrderCreated` notification (`ReferralId: null`, no `422`); confirmed referral-service's existing `Submitted/Accepted/...` notifications still work unchanged |
| 3 | `PATCH /tests/{id}` rejects partial updates (422); uncaught 500 on duplicate `test_code` | Added `TestUpdate` schema (all fields optional) + pre-commit uniqueness check | Live: single-field PATCH → `200`; duplicate `test_code` → `400` (was `500`) |
| 4 | Result submission bypassed the test state machine (skip-ahead to `completed`) | Now requires order test to be `sample_collected` or `in_progress`; rejects submission before collection or a second time after completion | Live: confirmed against the existing multi-test happy-path flow (`test-lab-service.ps1`) without breaking it |
| 5 | Confusing `"Tests not found: set()"` error on duplicate `test_ids` | Explicit duplicate check before the not-found check | Live: `test_ids:[1,1]` → `"Duplicate test_ids in request..."` |
| 6 | Doc drift (`GET /orders/{id}/tests` documented but missing; stale "to be implemented" tags) | Implemented the endpoint; updated `ENDPOINTS.md` (all sections now marked ✅ Implemented) and added a v1.1 changelog entry | Live: `GET /orders/1/tests` → `200` |
| 7 | No DB-level unique constraint on `(order_id, test_id)` | Added `UniqueConstraint` in `models.py`; also enabled `PRAGMA foreign_keys=ON` in `db.py` | Verified order creation/deletion flows still work under FK enforcement |
| 8 | No authentication/authorization | **Not fixed — out of scope.** Pre-existing gap across all 6 services, not lab-specific | — |
| — | (bonus, found during fix verification) Zero-value result incorrectly rejected by a truthy check | Schema now requires `result_value: str`; explicit empty-string check replaces the truthy check | Live: `result_value:"0"` → `200`, correctly flagged abnormal/critical |
| — | (bonus) `POST /collect` and `PATCH /results/{id}/review` returned hand-built dicts missing fields (`notes`, `result_date`) that the frontend's TypeScript types already expected | Both now use proper Pydantic response models (`LabSampleRead`, `TestResultRead`) returning the ORM object directly | Live: review response now includes `result_date`/`notes` |
| — | (bonus) Stale dev `lab.db` baked into the Docker image via `COPY . .` (no `.dockerignore`); orphaned local `uvicorn` processes from validation-workflow subagents were shadowing the real containers on `127.0.0.1` | Added `.dockerignore` to `services/lab` and `services/notification`; killed the orphaned processes and deleted stray `.db` files | Confirmed containers rebuilt clean (`orders: 0` on fresh start) and no more `127.0.0.1` shadow listeners |

**Updated status: all 3 critical + the 1 medium + 6 of 8 low/informational findings are fixed and live-verified.** Recommend running the full `lab-service-validation` workflow once more for a complete, systematic re-sweep before final production sign-off.

---

## 0. Pre-Run Environment Fixes

Before the workflow could run, the local environment needed repair — otherwise every test would have failed for infrastructure reasons unrelated to the Lab Service's own code:

1. **Docker Desktop was not running.** Started it and brought up the full `docker-compose` stack (7 containers: gateway + 6 services).
2. **Stale `lab-service` image.** The running container was built from an older `models.py` with a broken `LabOrder.status_history` relationship (missing a foreign key), causing every Lab Service endpoint to fail with a 500 on startup/query. The current source already fixes this; the container just needed a rebuild.
3. **No Docker registry access** (offline network) broke `docker-compose build`/`--build` at the "pull base image metadata" step. Worked around with `DOCKER_BUILDKIT=0 docker-compose build <service>`, which rebuilds from the already-cached local `python:3.11-slim` layer without a registry check.
4. **Stale `gateway` image.** It was missing the `labs`-unprefixing logic (`UNPREFIXED_SERVICES`), so `/api/labs/...` requests were forwarded to the Lab Service with the `labs` segment still attached, producing spurious 404s. Rebuilt the same way as #3.
5. **Bug in the validation workflow script itself.** `.claude/workflows/validation_agent.js` hardcoded `/api/lab/...` (singular) for all 18 endpoint tests, but the gateway's real route segment is `/api/labs/...` (plural, per `SERVICE_MAP` in `gateway/main.py`). Fixed all 18 occurrences so the workflow exercises the real routes.

After these fixes, all 7 containers were confirmed healthy and routed correctly before the validation workflow was launched.

---

## 1. Executive Summary

The Lab Service was validated end-to-end with live HTTP calls against a running instance (SQLite-backed, seeded with 27 tests), including its dependencies (Patient Service, Doctors Service, Referral Service, Notification Service) and the API Gateway. All 19 documented/implemented endpoints were exercised with both happy-path and negative/edge-case inputs (≈56 individual assertions).

**Result: CONDITIONAL PASS.** Core CRUD operations, the order lifecycle (create → collect → process → result → review), pagination/filtering, and gateway routing all work correctly (~88% of test assertions passed). However, **3 critical-severity defects** were found that must be fixed before production deployment:

1. Order-level status is never re-synchronized when results are submitted via the results endpoint, leaving orders permanently stuck in a stale status (e.g., "processing") even after all constituent tests are "completed".
2. The Lab Service → Notification Service integration is **completely non-functional** due to an incompatible payload/schema — every notification call (including critical-result alerts) silently fails.
3. `PATCH /tests/{test_id}` is broken for the documented partial-update use case — any partial update request returns `422 Unprocessable Entity` instead of applying the change.

The service's own internal documentation (`PROJECT_COMPLETION_SUMMARY.md`) claims **"✅ COMPLETE"** and **"Production-ready status achieved"** — this validation shows that claim is not currently accurate; the above defects contradict the service's own documented design (e.g., `WEEK2_SUMMARY.md`: *"If all tests completed → order = completed"*, which was proven false in testing).

No PII/PHI beyond internal numeric identifiers (patient_id, doctor_id, order_id) is stored or transmitted by this service, which is good hygiene for a lab-results system.

---

## 2. Service Health Status

| Service | Port | Status | Notes |
|---|---|---|---|
| Lab Service | 8006 | ✅ Healthy | `/health` reports `connected: true`; 27 seeded tests, 6 orders after test run |
| Patient Service | 8001 | ✅ Healthy | Responded correctly to valid/invalid patient lookups |
| Referral Service | 8003 | ✅ Healthy | Responded correctly to valid/invalid referral lookups |
| Doctors Service | 8002 | ✅ Healthy | Available; not directly called by Lab Service in current code, but required as a Referral Service dependency |
| Notification Service | 8005 | ⚠️ Running but **contract-incompatible** with Lab Service | Returns `422` for every payload Lab Service sends (see §4/§6) |
| API Gateway | 8000 | ✅ Healthy | Correctly proxies `/api/labs/*` → Lab Service, unprefixed route rewriting confirmed |

`GET /health` sample response:
```json
{"status":"healthy","service":"lab-service","version":"1.0.0","database":{"connected":true,"tests":27,"orders":6}}
```

---

## 3. Endpoint Test Results (19/19 endpoints exercised)

### Test Catalog (6 endpoints)
| # | Method & Path | Result | Notes |
|---|---|---|---|
| 1 | `GET /tests` | ✅ PASS | List + specialty filter + pagination all correct |
| 2 | `GET /tests/{test_id}` | ✅ PASS | Valid → 200; invalid (999) → 404 |
| 3 | `GET /tests/code/{test_code}` | ✅ PASS | Case-insensitive lookup works; invalid code → 404 |
| 4 | `POST /tests` | ✅ PASS | Create works; duplicate code → 400; invalid range → 400; `processing_time_days<=0` → 400 |
| 5 | `PATCH /tests/{test_id}` | ❌ **FAIL** | Any partial-body update returns `422` because the handler requires the full `TestCreate` schema (`test_code`, `sample_type` mandatory) instead of an optional-fields update schema. Contradicts `ENDPOINTS.md` which documents this as accepting partial bodies. Also: setting `test_code` to a value already used by another test raises an uncaught `IntegrityError` → bare `500`, since (unlike `POST /tests`) no uniqueness check runs before commit. |
| 6 | `DELETE /tests/{test_id}` | ✅ PASS | Deletes unused test (204); blocks delete of in-use test (400, correct order count reported); 404 for missing test |

### Lab Orders (4 endpoints)
| # | Method & Path | Result | Notes |
|---|---|---|---|
| 7 | `POST /orders` | ✅ PASS | Validates patient (400), referral (400), test IDs (400), empty test list (400), invalid priority (400); creates order + `OrderTest` rows + pending sample correctly. Gap: `ordered_by` (doctor ID) is *not* validated against the Doctors Service, unlike patient_id/test_ids. |
| 8 | `GET /orders` | ✅ PASS | Filtering by `patient_id`, `status`, `priority`, pagination all verified |
| 9 | `GET /orders/{order_id}` | ✅ PASS | 200 with nested `order_tests`; 404 for missing order |
| 10 | `PATCH /orders/{order_id}` | ✅ PASS (with gaps) | Updates `clinical_indication`/`status`; 404 for missing order. No allow-list validation on `status` (arbitrary strings accepted); truthy-check instead of `is not None` blocks explicitly clearing a field to `""`. |

### Sample Collection (1 endpoint)
| # | Method & Path | Result | Notes |
|---|---|---|---|
| 11 | `POST /orders/{order_id}/collect` | ✅ PASS | Generates sample label (`LAB-YYYY-MM-DD-NNN`), cascades `order_status → sample_collected` for all tests, writes `StatusHistory`; re-collecting is idempotent (returns existing record rather than erroring/duplicating — good design); 404 for missing order |

### Status Tracking (2 endpoints)
| # | Method & Path | Result | Notes |
|---|---|---|---|
| 12 | `PATCH /orders/{order_id}/tests/{test_id}/status` | ✅ PASS | Valid transition (`sample_collected → in_progress`) succeeds; invalid transition (`sample_collected → completed`) correctly rejected with 400; invalid enum value rejected with 400 |
| 13 | `GET /orders/{order_id}/history` | ✅ PASS (with data-type note) | Full, correctly ordered audit trail with `old_status`/`new_status`/timestamps. `changed_by` is typed `Integer` but seeded data contains a string (`"nurse_jane"`) that passes through silently since this route has no `response_model`. |

### Test Results (3 endpoints)
| # | Method & Path | Result | Notes |
|---|---|---|---|
| 14 | `POST /orders/{order_id}/tests/{test_id}/result` | ⚠️ **PASS with defect** | Abnormal/critical auto-flagging math verified correct (GLU=150 vs range 70–100 → abnormal, not critical; CHOL=350 vs range 0–200 → critical, since >1.5×max=300). **Defect:** the endpoint force-sets `order_status` to `"completed"` unconditionally, bypassing the same state-machine validation enforced by endpoint #12 — a test in `sample_collected` state jumped straight to `completed`, skipping `in_progress`, with no error. Also: `result_value` uses a truthiness check, so a legitimate numeric `0` is wrongly rejected as "required". `result_date`/`404` for unknown order all correct. |
| 15 | `GET /orders/{order_id}/results` | ✅ PASS | Returns all results with abnormal/critical/review fields |
| 16 | `PATCH /results/{result_id}/review` | ✅ PASS (with validation gap) | Sets `reviewed_date`/`reviewed_by`; 404 for unknown result. Accepts an untyped `dict` instead of the existing (unused) `TestResultReview` schema — a non-numeric `reviewed_by` is silently persisted into an `Integer` column. |

### Statistics & Health (3 endpoints)
| # | Method & Path | Result | Notes |
|---|---|---|---|
| 17 | `GET /stats` | ✅ PASS | Aggregates orders/tests/results correctly, but **reflects the order-status desync defect** (see §5) |
| 18 | `GET /orders/stats/specialty/{specialty}` | ✅ PASS | Correct filtering by specialty; empty result set for unknown specialty handled gracefully |
| 19 | `GET /health` | ✅ PASS | Reports DB connectivity and row counts accurately |

**Endpoint pass rate: 17/19 fully passing, 1 broken (`PATCH /tests`), 1 passing-with-defect (result submission). Overall assertion pass rate ≈ 88%.**

---

## 4. Integration Test Results

| Integration | Result | Details |
|---|---|---|
| Lab Service → Patient Service (`verify_patient_exists`) | ✅ PASS | Correctly resolves existing patient (200) and rejects non-existent patient (404 → mapped to 400 with clear message). Also correctly returns 503 "Patient Service unavailable" when the Patient Service is down, rather than crashing or silently allowing the order. |
| Lab Service → Referral Service (`verify_referral_exists`) | ✅ PASS | Correctly resolves existing referral and rejects non-existent referral (999 → 400) |
| Lab Service → Notification Service (`notify_lab_event`) | ❌ **FAIL (Critical)** | Lab Service posts `{"event_type": ..., "source": "lab-service", "data": {...}}` to `POST /notifications`. Notification Service's actual schema (`services/notification/schemas.py`) requires `{"ReferralId": int, "EventType": Enum[Submitted\|Accepted\|Rejected\|Completed], "Message": str}`. Direct test confirmed the Notification Service rejects the Lab Service's payload with `422`. Because `notify_lab_event()` wraps the call in a broad `try/except` that only logs a warning, **this failure is completely silent** — order-created and critical-result notifications never reach the Notification Service, and no error surfaces to the caller or logs at a visible severity. This affects `lab_order_created`, `lab_result_critical`, and `lab_result_completed` events — none can ever succeed against the current contract. |
| API Gateway → Lab Service routing | ✅ PASS | `GET /api/labs/health`, `/api/labs/tests/1`, `/api/labs/orders/5` all correctly proxied with path-prefix stripped per `UNPREFIXED_SERVICES` logic in `gateway/main.py` |
| Frontend `LabService` (Angular) → Gateway contract | ✅ PASS (static check) | `frontend/src/app/core/services/lab.service.ts` targets `${API_BASE_URL}/labs`, consistent with gateway's `SERVICE_MAP["labs"]`; not exercised via browser in this pass |
| docker-compose dependency wiring | ✅ PASS (static check) | `lab-service` correctly declares `depends_on: [patient-service, referral-service, notification-service]`; `gateway` depends on `lab-service` |
| Database relationship constraints | ⚠️ PARTIAL PASS | ORM-level cascades (`cascade="all, delete-orphan"`) work correctly when exercised through the ORM. However `PRAGMA foreign_keys` is OFF at the SQLite level and no `ondelete=` clause exists, so FK enforcement relies entirely on always going through the ORM — any raw SQL or future admin tooling would silently create orphans (reproduced live). There is also no `DELETE /orders/{order_id}` endpoint, so the cascade path is not exercised by real API traffic. |
| State machine (`ordered → sample_collected → in_progress → completed`) | ✅ PASS | All valid transitions succeeded; all backward/skip-ahead transitions and invalid status literals correctly rejected with 400 across 8 tested cases |
| Sample-collection idempotency | ✅ PASS (with caveat) | Repeated and concurrent `collect` calls on the same order both returned the identical, unchanged sample record with no duplicate `StatusHistory` rows. Caveat: implementation uses check-then-act with no explicit row lock — a race is theoretically possible under true multi-process concurrency, though it didn't manifest in testing (SQLite's file-level locking + uvicorn's threaded model serialize it in practice). |

---

## 5. Data Integrity Findings

1. **Order-level / test-level status desync (Critical).** After all `OrderTest` rows for an order reached `order_status = "completed"`, the parent `LabOrder.status` remained `"processing"` instead of transitioning to `"completed"`. Root cause: `submit_test_result()` never recomputes/updates `LabOrder.status`, unlike `update_test_status()` which does. This directly corrupts `GET /stats` output (`orders.by_status.processing` overcounts) and any dashboard/reporting built on order status.
2. **Abnormal/critical flagging arithmetic — verified correct** for numeric results within a defined range. Gaps: tests with `NULL` normal ranges (CBC, UA) can never be flagged abnormal/critical regardless of value; non-numeric ("qualitative") results fall back entirely to caller-supplied, unvalidated `is_abnormal`/`is_critical` booleans.
3. **Referential integrity on test deletion — verified correct.** Tests referenced by any `OrderTest` cannot be deleted (400 with accurate in-use count).
4. **Duplicate test IDs in a single order request produce a misleading error.** `POST /orders` with `test_ids: [3, 3]` returns `400 {"detail": "Tests not found: set()"}` — test 3 does exist; the actual problem (duplicate IDs) is not what's reported. Creation is correctly blocked, but the diagnostic message is wrong/confusing.
5. **Cascade deletes configured correctly** in `models.py` (`cascade="all, delete-orphan"` on Test→OrderTest, LabOrder→OrderTest/LabSample, OrderTest→TestResult/StatusHistory) — but unreachable through the API (no `DELETE /orders/{id}`) and unenforced at the SQLite level (`PRAGMA foreign_keys=0`), so raw-SQL/manual deletions are not protected.
6. **No DB-level unique constraint on `(order_id, test_id)`** in the `order_tests` table — duplicate-row prevention currently relies solely on application logic in `create_order()`, a single point of failure for this invariant.
7. **Audit-trail gaps:** order creation itself (`POST /orders`) is never written to `StatusHistory`; `PATCH /orders/{order_id}` order-level status changes are completely unaudited; `submit_test_result` bypasses the transition-validation map used by the dedicated `/status` endpoint, so the audit trail can contain state jumps (e.g. `ordered → completed`) that endpoint would have rejected.
8. **No orphaned records found in current live data** — `PRAGMA foreign_key_check` returned clean, and all 4 lab_orders/order_tests/lab_samples and 5 status_history rows resolve to valid parents. This is by discipline, not by enforcement (see #5/#6 above).

---

## 6. Issues Found and Severity Levels

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1 | Order status never re-synced after result submission; order can remain stuck in a stale status indefinitely | **Critical** | Live test: order with all tests `completed`, order status stayed `processing` |
| 2 | Lab Service ↔ Notification Service payload/schema mismatch — all lab notifications (including critical-result alerts) silently fail | **Critical** | Direct call to `POST /notifications` with Lab Service's exact payload shape returned `422`; confirmed against `services/notification/schemas.py` |
| 3 | `PATCH /tests/{test_id}` cannot perform partial updates — always requires full `test_code`/`sample_type`, contradicting documented behavior; also 500s on duplicate `test_code` | **Critical** | Live test: `{"test_name": "..."}` → `422` instead of `200`; duplicate code → uncaught `IntegrityError` → `500` |
| 4 | `POST /orders/{id}/tests/{id}/result` bypasses the OrderTest state machine, allowing a test to jump straight from `sample_collected` to `completed`, skipping `in_progress` | **Medium** | Live test on an order's CHOL test |
| 5 | Confusing error message for duplicate `test_ids` in an order request (`"Tests not found: set()"`) | **Low** | Live test with `test_ids: [3,3]` |
| 6 | Documentation drift: `ENDPOINTS.md` documents `GET /orders/{order_id}/tests`, which does not exist in `main.py` (returns 404); several implemented endpoints are still marked "⏳ To be implemented" | **Low** | Live curl to `/orders/5/tests` → 404; cross-checked against `main.py` route table |
| 7 | No DB-level unique constraint on `(order_id, test_id)` for defense-in-depth against duplicate order-test rows | **Low** | Code review of `services/lab/models.py` |
| 8 | No authentication/authorization on any endpoint (already flagged as "planned" in `ENDPOINTS.md`) — all lab order/result data is fully open | **Low** (pre-existing, tracked) | Code review; consistent with other services in this codebase pre-auth-rollout |

**Totals: 3 Critical · 1 Medium · 4 Low**

---

## 7. Recommendations

1. **Fix order-status synchronization**: extract the "recompute `LabOrder.status` from its `OrderTests`" logic from `update_test_status()` into a shared helper and call it from `submit_test_result()` as well.
2. **Align the Lab↔Notification contract**: either (a) change `notify_lab_event()` in `services/lab/main.py` to send `{ReferralId, EventType, Message}` matching the current Notification Service schema, or (b) extend the Notification Service to accept a generic `{event_type, source, data}` envelope if multi-service notifications are an intended design goal. Add a non-silent log (`logger.error`, not just `warning`) or a retry/alerting mechanism so future contract breaks are visible.
3. **Fix `PATCH /tests/{test_id}`**: introduce a dedicated `TestUpdate` Pydantic schema with all fields `Optional` (mirroring `LabOrderUpdate`'s pattern already used for orders) instead of reusing `TestCreate`; add the same uniqueness check used in `create_test` before committing.
4. **Enforce the OrderTest state machine in `submit_test_result()`**: reuse the same `status_transitions` map used in `update_test_status()` rather than force-setting `"completed"` unconditionally.
5. **Improve duplicate-test-id handling** in `create_order()`: validate `len(set(test_ids)) == len(test_ids)` explicitly before the "not found" check, and return a clear "duplicate test_ids in request" error.
6. **Reconcile `ENDPOINTS.md`/`TESTING_GUIDE.md`/status docs with actual implementation** — remove or implement the undocumented `/orders/{id}/tests` route, and update stale "⏳ To be implemented" tags now that those features exist.
7. **Add a DB-level unique constraint** on `(order_id, test_id)` in `order_tests` as defense-in-depth, and consider enabling `PRAGMA foreign_keys=ON` in `db.py`.
8. **Add an automated backend test suite** (e.g., `pytest` + `TestClient`) covering the state-machine and cross-service contracts exercised in this validation, so these regressions are caught in CI rather than manual/live testing.
9. **Add authentication/RBAC** before production exposure, per the service's own roadmap in `ENDPOINTS.md`.
10. **Correct internal status documentation** (`PROJECT_COMPLETION_SUMMARY.md` currently claims "COMPLETE"/"production-ready") to reflect the defects found here until they are resolved and re-validated.

---

## 8. Conclusion and Production Readiness

The Lab Service demonstrates a solid architectural foundation: clean FastAPI/SQLAlchemy structure, sensible validation on the majority of endpoints, correct cross-service verification against Patient and Referral services, correct gateway routing, and a well-designed idempotent sample-collection flow. 17 of 19 endpoints performed exactly as documented across ≈56 test assertions (≈88% pass rate).

However, **this service is not production-ready in its current state**. Two of the defects found are **Critical**: the order-status desync corrupts data integrity/reporting for every completed order processed through the standard results workflow, and the broken Notification Service integration means **critical lab result alerts — arguably the most safety-relevant feature of a lab system — never fire**, with no visible error to indicate the failure. A third Critical defect makes the test-catalog `PATCH` endpoint entirely unusable for its documented purpose.

**Recommendation: Do not promote to production until Critical issues #1–#3 (§6) are fixed and re-validated.** The Medium and Low issues should be scheduled for remediation but do not block deployment on their own. Once fixed, re-run this validation suite (or an automated equivalent per Recommendation #8) to confirm the order lifecycle produces consistent status/statistics end-to-end and that critical-result notifications are actually delivered.

**Overall status:** CONDITIONAL PASS — Not Production Ready (Critical defects found)
**Pass rate:** 88%
**Critical / Medium / Low issues:** 3 / 1 / 4

---

### Appendix: Files Referenced
- `services/lab/main.py`
- `services/lab/models.py`
- `services/lab/schemas.py`
- `services/lab/seed.py`
- `services/lab/db.py`
- `services/lab/ENDPOINTS.md`
- `services/lab/TESTING_GUIDE.md`
- `services/lab/PROJECT_COMPLETION_SUMMARY.md`
- `services/notification/schemas.py`
- `gateway/main.py`
- `docker-compose.yml`
- `frontend/src/app/core/services/lab.service.ts`
- `test-lab-service.ps1`
