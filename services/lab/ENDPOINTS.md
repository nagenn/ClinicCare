# Lab Service API Endpoints

**Base URL:** `http://localhost:8006` (local) | `http://lab-service:8006` (Docker)

**API Version:** 1.0

---

## Table of Contents
1. [Health Check](#health-check)
2. [Test Catalog](#test-catalog)
3. [Lab Orders](#lab-orders)
4. [Order Tests](#order-tests)
5. [Sample Collection](#sample-collection)
6. [Test Results](#test-results)
7. [Status Tracking](#status-tracking)
8. [Status Transitions](#status-transitions)
9. [Error Handling](#error-handling)

---

## Health Check

### GET /health
Verify service is running.

**Response:** 200 OK
```json
{
  "status": "healthy"
}
```

---

## Test Catalog

### GET /tests
List all laboratory tests with optional filtering.

**Query Parameters:**
- `specialty` (optional, string): Filter by test specialty (e.g., "Hematology", "Cardiology")

**Response:** 200 OK
```json
[
  {
    "test_id": 1,
    "test_code": "CBC",
    "test_name": "Complete Blood Count",
    "description": null,
    "sample_type": "blood",
    "processing_time_days": 1,
    "normal_range_min": null,
    "normal_range_max": null,
    "unit": null,
    "specialty": "Hematology"
  },
  {
    "test_id": 7,
    "test_code": "GLU",
    "test_name": "Glucose",
    "description": null,
    "sample_type": "blood",
    "processing_time_days": 1,
    "normal_range_min": 70.0,
    "normal_range_max": 100.0,
    "unit": "mg/dL",
    "specialty": "Chemistry"
  }
]
```

**Example Requests:**
```bash
# Get all tests
curl http://localhost:8006/tests

# Filter by specialty
curl http://localhost:8006/tests?specialty=Cardiology
```

---

### GET /tests/{test_id}
Get a specific test by ID.

**Path Parameters:**
- `test_id` (required, integer): Test identifier

**Response:** 200 OK
```json
{
  "test_id": 1,
  "test_code": "CBC",
  "test_name": "Complete Blood Count",
  "description": null,
  "sample_type": "blood",
  "processing_time_days": 1,
  "normal_range_min": null,
  "normal_range_max": null,
  "unit": null,
  "specialty": "Hematology"
}
```

**Error Responses:**
- **404 Not Found:** Test not found
```json
{
  "detail": "Test 999 not found"
}
```

**Example Request:**
```bash
curl http://localhost:8006/tests/1
```

---

### POST /tests
Create a new test definition (admin only).

**Request Body:**
```json
{
  "test_code": "PSA",
  "test_name": "Prostate-Specific Antigen",
  "description": "Blood test for prostate cancer screening",
  "sample_type": "blood",
  "processing_time_days": 1,
  "normal_range_min": 0.0,
  "normal_range_max": 4.0,
  "unit": "ng/mL",
  "specialty": "Oncology"
}
```

**Response:** 201 Created
```json
{
  "test_id": 26,
  "test_code": "PSA",
  "test_name": "Prostate-Specific Antigen",
  "description": "Blood test for prostate cancer screening",
  "sample_type": "blood",
  "processing_time_days": 1,
  "normal_range_min": 0.0,
  "normal_range_max": 4.0,
  "unit": "ng/mL",
  "specialty": "Oncology"
}
```

**Error Responses:**
- **400 Bad Request:** Test code already exists
```json
{
  "detail": "Test with code PSA already exists"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8006/tests \
  -H "Content-Type: application/json" \
  -d '{
    "test_code": "PSA",
    "test_name": "Prostate-Specific Antigen",
    "sample_type": "blood",
    "processing_time_days": 1,
    "normal_range_min": 0.0,
    "normal_range_max": 4.0,
    "unit": "ng/mL",
    "specialty": "Oncology"
  }'
```

---

### PATCH /tests/{test_id}
Update an existing test definition.

**Path Parameters:**
- `test_id` (required, integer): Test identifier

**Request Body:** (all fields optional)
```json
{
  "test_name": "Updated Test Name",
  "normal_range_min": 5.0,
  "normal_range_max": 10.0
}
```

**Response:** 200 OK
```json
{
  "test_id": 1,
  "test_code": "CBC",
  "test_name": "Updated Test Name",
  "description": null,
  "sample_type": "blood",
  "processing_time_days": 1,
  "normal_range_min": 5.0,
  "normal_range_max": 10.0,
  "unit": null,
  "specialty": "Hematology"
}
```

**Error Responses:**
- **400 Bad Request:** New test_code already used by another test
```json
{
  "detail": "Test with code CBC already exists"
}
```

**Example Request:**
```bash
curl -X PATCH http://localhost:8006/tests/1 \
  -H "Content-Type: application/json" \
  -d '{"test_name": "Updated CBC"}'
```

---

### DELETE /tests/{test_id}
Delete a test definition.

**Path Parameters:**
- `test_id` (required, integer): Test identifier

**Response:** 204 No Content

**Error Responses:**
- **404 Not Found:** Test not found

**Example Request:**
```bash
curl -X DELETE http://localhost:8006/tests/26
```

---

## Lab Orders

### POST /orders
Create a new laboratory order for a patient.

**Request Body:**
```json
{
  "patient_id": 1,
  "referral_id": 5,
  "ordered_by": 2,
  "priority": "routine",
  "clinical_indication": "Annual physical exam - check lipid levels",
  "test_ids": [20, 21, 22, 23]
}
```

**Request Parameters:**
- `patient_id` (required, integer): Patient identifier
- `referral_id` (optional, integer): Associated referral ID
- `ordered_by` (required, integer): Doctor/clinician who ordered
- `priority` (optional, string): "routine" or "stat" (default: "routine")
- `clinical_indication` (optional, string): Clinical reason for testing
- `test_ids` (required, array of integers): List of test IDs to order

**Response:** 201 Created
```json
{
  "order_id": 10,
  "patient_id": 1,
  "referral_id": 5,
  "ordered_by": 2,
  "ordered_date": "2026-08-09T14:30:00",
  "priority": "routine",
  "clinical_indication": "Annual physical exam - check lipid levels",
  "status": "placed",
  "order_tests": [
    {
      "order_test_id": 1,
      "order_id": 10,
      "test_id": 20,
      "order_status": "ordered",
      "test": {
        "test_id": 20,
        "test_code": "CHOL",
        "test_name": "Total Cholesterol",
        "description": null,
        "sample_type": "blood",
        "processing_time_days": 1,
        "normal_range_min": 0.0,
        "normal_range_max": 200.0,
        "unit": "mg/dL",
        "specialty": "Cardiology"
      }
    }
  ]
}
```

**Error Responses:**
- **400 Bad Request:** Duplicate test_ids in the request
```json
{
  "detail": "Duplicate test_ids in request; each test may only be ordered once per order"
}
```
- **400 Bad Request:** Patient not found
```json
{
  "detail": "Patient 999 not found"
}
```
- **400 Bad Request:** Ordering doctor not found
```json
{
  "detail": "Doctor 999 not found"
}
```
- **400 Bad Request:** Referral not found
```json
{
  "detail": "Referral 999 not found"
}
```
- **400 Bad Request:** One or more tests not found
```json
{
  "detail": "Tests not found: {999}"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "referral_id": 5,
    "ordered_by": 2,
    "priority": "routine",
    "clinical_indication": "Annual physical exam",
    "test_ids": [20, 21, 22, 23]
  }'
```

---

### GET /orders
List laboratory orders with optional filtering.

**Query Parameters:**
- `patient_id` (optional, integer): Filter by patient
- `referral_id` (optional, integer): Filter by referral
- `status` (optional, string): Filter by order status

**Response:** 200 OK
```json
[
  {
    "order_id": 10,
    "patient_id": 1,
    "referral_id": 5,
    "ordered_by": 2,
    "ordered_date": "2026-08-09T14:30:00",
    "priority": "routine",
    "clinical_indication": "Annual physical exam",
    "status": "placed",
    "order_tests": [...]
  }
]
```

**Example Requests:**
```bash
# Get all orders
curl http://localhost:8006/orders

# Filter by patient
curl http://localhost:8006/orders?patient_id=1

# Filter by status
curl http://localhost:8006/orders?status=placed

# Combine filters
curl http://localhost:8006/orders?patient_id=1&status=placed
```

---

### GET /orders/{order_id}
Get a specific lab order with all associated tests.

**Path Parameters:**
- `order_id` (required, integer): Order identifier

**Response:** 200 OK
```json
{
  "order_id": 10,
  "patient_id": 1,
  "referral_id": 5,
  "ordered_by": 2,
  "ordered_date": "2026-08-09T14:30:00",
  "priority": "routine",
  "clinical_indication": "Annual physical exam",
  "status": "placed",
  "order_tests": [
    {
      "order_test_id": 1,
      "order_id": 10,
      "test_id": 20,
      "order_status": "ordered",
      "test": {...}
    }
  ]
}
```

**Error Responses:**
- **404 Not Found:** Order not found

**Example Request:**
```bash
curl http://localhost:8006/orders/10
```

---

### PATCH /orders/{order_id}
Update an existing lab order.

**Path Parameters:**
- `order_id` (required, integer): Order identifier

**Request Body:** (all fields optional)
```json
{
  "status": "completed",
  "clinical_indication": "Updated indication"
}
```

**Response:** 200 OK

**Example Request:**
```bash
curl -X PATCH http://localhost:8006/orders/10 \
  -H "Content-Type: application/json" \
  -d '{"status": "collected"}'
```

---

## Order Tests

### GET /orders/{order_id}/tests
Get all tests in an order.

**Path Parameters:**
- `order_id` (required, integer): Order identifier

**Response:** 200 OK
```json
[
  {
    "order_test_id": 1,
    "order_id": 10,
    "test_id": 20,
    "order_status": "ordered",
    "test": {...}
  }
]
```

**Status:** ✅ Implemented

---

## Sample Collection

### POST /orders/{order_id}/collect
Mark a sample as collected.

**Path Parameters:**
- `order_id` (required, integer): Order identifier

**Request Body:**
```json
{
  "collection_date": "2026-08-09T15:00:00",
  "collected_by": 3,
  "notes": "Sample collected from patient arm, no issues"
}
```

**Response:** 200 OK
```json
{
  "sample_id": 1,
  "order_id": 10,
  "sample_type": "blood",
  "collection_date": "2026-08-09T15:00:00",
  "collected_by": 3,
  "sample_label": "LAB-2026-08-09-001",
  "status": "collected"
}
```

**Status:** ✅ Implemented

---

## Test Results

### POST /orders/{order_id}/tests/{test_id}/result
Submit a test result.

**Path Parameters:**
- `order_id` (required, integer): Order identifier
- `test_id` (required, integer): Test identifier

**Request Body:**
```json
{
  "result_value": "145",
  "notes": "Slightly elevated, monitor next visit"
}
```

**Response:** 200 OK
```json
{
  "result_id": 1,
  "order_test_id": 1,
  "result_value": "145",
  "result_date": "2026-08-09T16:00:00",
  "reviewed_date": null,
  "reviewed_by": null,
  "is_abnormal": true,
  "is_critical": false,
  "notes": "Slightly elevated, monitor next visit"
}
```

**Validation Rules:**
- If test has `normal_range_min/max`, numeric results outside range → `is_abnormal: true`
- If result > 1.5x `normal_range_max` → `is_critical: true` (auto-flagged)
- Result value is validated as number if range exists
- The order test must have status `sample_collected` or `in_progress` (i.e. the sample has already been collected); submitting before collection or a second time after completion returns `400`
- Submitting a result recomputes the parent order's aggregate `status` from all of its order tests

**Status:** ✅ Implemented

---

### GET /orders/{order_id}/results
Get all results for an order.

**Path Parameters:**
- `order_id` (required, integer): Order identifier

**Response:** 200 OK
```json
[
  {
    "result_id": 1,
    "order_test_id": 1,
    "result_value": "145",
    "result_date": "2026-08-09T16:00:00",
    "reviewed_date": null,
    "reviewed_by": null,
    "is_abnormal": true,
    "is_critical": false,
    "notes": "Slightly elevated"
  }
]
```

**Status:** ✅ Implemented

---

### PATCH /results/{result_id}/review
Mark a result as reviewed by a clinician.

**Path Parameters:**
- `result_id` (required, integer): Result identifier

**Request Body:**
```json
{
  "reviewed_by": 2
}
```

**Response:** 200 OK
```json
{
  "result_id": 1,
  "order_test_id": 1,
  "result_value": "145",
  "result_date": "2026-08-09T16:00:00",
  "reviewed_date": "2026-08-09T16:30:00",
  "reviewed_by": 2,
  "is_abnormal": true,
  "is_critical": false,
  "notes": "Slightly elevated"
}
```

**Status:** ✅ Implemented

---

## Status Tracking

### PATCH /orders/{order_id}/tests/{test_id}/status
Update the status of a specific test in an order.

**Path Parameters:**
- `order_id` (required, integer): Order identifier
- `test_id` (required, integer): Test identifier

**Request Body:**
```json
{
  "new_status": "in_progress",
  "changed_by": 3
}
```

**Response:** 200 OK
```json
{
  "order_test_id": 1,
  "order_id": 10,
  "test_id": 20,
  "order_status": "in_progress"
}
```

**Status:** ✅ Implemented

---

### GET /orders/{order_id}/history
Get full status history for an order.

**Path Parameters:**
- `order_id` (required, integer): Order identifier

**Response:** 200 OK
```json
[
  {
    "history_id": 1,
    "order_test_id": 1,
    "old_status": "ordered",
    "new_status": "sample_collected",
    "changed_at": "2026-08-09T15:00:00",
    "changed_by": 3
  },
  {
    "history_id": 2,
    "order_test_id": 1,
    "old_status": "sample_collected",
    "new_status": "in_progress",
    "changed_at": "2026-08-09T16:00:00",
    "changed_by": 3
  }
]
```

**Status:** ✅ Implemented

---

## Status Transitions

### Valid State Machine

```
Order Status Flow:
draft → placed → collected → processing → completed

OrderTest Status Flow:
ordered → sample_collected → in_progress → completed

Sample Status Flow:
pending → collected → processed
```

### Validation Rules

**Order Status Transitions:**
| Current | Allowed Next | Notes |
|---------|-------------|-------|
| draft | placed | Initial order submission |
| placed | collected | Sample collected |
| collected | processing | Tests started |
| processing | completed | All tests done |
| completed | - | Terminal state |

**OrderTest Status Transitions:**
| Current | Allowed Next | Notes |
|---------|-------------|-------|
| ordered | sample_collected | Sample marked collected |
| sample_collected | in_progress | Test processing started |
| in_progress | completed | Results submitted |
| completed | - | Terminal state |

**Rejected Transitions:**
- Cannot skip states (e.g., ordered → completed is invalid)
- Cannot go backwards (e.g., completed → processing is invalid)
- Status must be one of defined values only

**Status Change Rules:**
1. When order status changes, all order_tests must be in compatible states
2. StatusHistory record created for each transition
3. "changed_by" field records who made the change (doctor/technician ID)
4. Timestamp automatically recorded

---

## Error Handling

### Standard Error Response Format

```json
{
  "detail": "Descriptive error message"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid patient_id, missing required field |
| 404 | Not Found | Test/Order/Result not found |
| 422 | Unprocessable Entity | Validation error (Pydantic) |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Scenarios

**Invalid Patient:**
```json
{
  "detail": "Patient 999 not found"
}
```

**Duplicate Test Code:**
```json
{
  "detail": "Test with code CBC already exists"
}
```

**Invalid State Transition:**
```json
{
  "detail": "Cannot transition from ordered to completed (invalid state)"
}
```

**Missing Required Field:**
```json
{
  "detail": "Field 'test_ids' is required"
}
```

---

## Authentication & Authorization

**Current Status:** ⏳ *Planned for future implementation*

**Future Plan:**
- Bearer token validation on all endpoints
- Role-based access control:
  - `clinician` - Can create/review orders, see results
  - `lab_technician` - Can collect samples, process tests, enter results
  - `admin` - Can manage test catalog
- All endpoints will require `Authorization: Bearer <token>` header

---

## Rate Limiting

**Current Status:** ⏳ *Not implemented (future enhancement)*

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-09 | Initial version with Test Catalog and Lab Order endpoints |
| 1.1 | 2026-08-12 | Fixed order/test status desync, Notification Service contract mismatch, and `PATCH /tests` partial-update bug found during validation; implemented `GET /orders/{order_id}/tests`; documented all Sample Collection/Results/Status Tracking endpoints as implemented (see `VALIDATION_REPORT.md`) |

---

## Contact

Lab Service Owner: Backend Team Lead  
Documentation Last Updated: 2026-08-09
