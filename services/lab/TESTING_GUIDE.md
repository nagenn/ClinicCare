# Lab Service Testing Guide

Complete testing guide for Lab Service endpoints.

## Prerequisites

- Lab Service running on `http://localhost:8006` (or deployed)
- Patient Service running on `http://localhost:8001` (for patient validation)
- Referral Service running on `http://localhost:8003` (for referral validation)
- All services started via `docker-compose up`

---

## Test Execution

All examples use `curl`. You can also use Postman, Insomnia, or any API client.

### Health Check

```bash
curl http://localhost:8006/health
```

Expected Response (200 OK):
```json
{
  "status": "healthy",
  "service": "lab-service",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "tests": 27,
    "orders": 0
  }
}
```

---

## Test Catalog Endpoints

### 1. GET /tests - List All Tests

```bash
curl http://localhost:8006/tests
```

**Expected:** 200 OK with array of 27 tests

**Test Cases:**

#### 1a. List with pagination
```bash
curl "http://localhost:8006/tests?skip=0&limit=5"
```
**Expected:** 200 OK with 5 tests

#### 1b. Filter by specialty
```bash
curl "http://localhost:8006/tests?specialty=Hematology"
```
**Expected:** 200 OK with 6 Hematology tests

#### 1c. Filter and paginate
```bash
curl "http://localhost:8006/tests?specialty=Cardiology&skip=0&limit=2"
```
**Expected:** 200 OK with 2 Cardiology tests

---

### 2. GET /tests/{test_id} - Get Test by ID

```bash
curl http://localhost:8006/tests/1
```

**Expected Response (200 OK):**
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

**Test Cases:**

#### 2a. Valid test ID
```bash
curl http://localhost:8006/tests/7
```
**Expected:** 200 OK (Glucose test)

#### 2b. Invalid test ID
```bash
curl http://localhost:8006/tests/999
```
**Expected:** 404 Not Found

---

### 3. GET /tests/code/{test_code} - Get Test by Code

```bash
curl http://localhost:8006/tests/code/CBC
```

**Expected Response (200 OK):**
```json
{
  "test_id": 1,
  "test_code": "CBC",
  "test_name": "Complete Blood Count",
  ...
}
```

**Test Cases:**

#### 3a. Valid test code (case insensitive)
```bash
curl http://localhost:8006/tests/code/glu
```
**Expected:** 200 OK (Glucose)

#### 3b. Invalid test code
```bash
curl http://localhost:8006/tests/code/INVALID
```
**Expected:** 404 Not Found

---

### 4. POST /tests - Create New Test

```bash
curl -X POST http://localhost:8006/tests \
  -H "Content-Type: application/json" \
  -d '{
    "test_code": "PSA",
    "test_name": "Prostate-Specific Antigen",
    "description": "Blood test for prostate health",
    "sample_type": "blood",
    "processing_time_days": 1,
    "normal_range_min": 0.0,
    "normal_range_max": 4.0,
    "unit": "ng/mL",
    "specialty": "Oncology"
  }'
```

**Expected Response (201 Created):**
```json
{
  "test_id": 28,
  "test_code": "PSA",
  "test_name": "Prostate-Specific Antigen",
  ...
}
```

**Test Cases:**

#### 4a. Duplicate test code (should fail)
```bash
curl -X POST http://localhost:8006/tests \
  -H "Content-Type: application/json" \
  -d '{
    "test_code": "CBC",
    "test_name": "Another CBC",
    "sample_type": "blood"
  }'
```
**Expected:** 400 Bad Request

#### 4b. Invalid range (min > max)
```bash
curl -X POST http://localhost:8006/tests \
  -H "Content-Type: application/json" \
  -d '{
    "test_code": "TEST1",
    "test_name": "Test",
    "sample_type": "blood",
    "normal_range_min": 100.0,
    "normal_range_max": 50.0
  }'
```
**Expected:** 400 Bad Request

---

### 5. PATCH /tests/{test_id} - Update Test

```bash
curl -X PATCH http://localhost:8006/tests/28 \
  -H "Content-Type: application/json" \
  -d '{
    "test_name": "Updated PSA Test",
    "normal_range_max": 5.0
  }'
```

**Expected Response (200 OK):**
```json
{
  "test_id": 28,
  "test_code": "PSA",
  "test_name": "Updated PSA Test",
  "normal_range_max": 5.0,
  ...
}
```

**Test Cases:**

#### 5a. Update non-existent test
```bash
curl -X PATCH http://localhost:8006/tests/999 \
  -H "Content-Type: application/json" \
  -d '{"test_name": "Updated"}'
```
**Expected:** 404 Not Found

---

### 6. DELETE /tests/{test_id} - Delete Test

```bash
curl -X DELETE http://localhost:8006/tests/28
```

**Expected Response:** 204 No Content

**Test Cases:**

#### 6a. Delete non-existent test
```bash
curl -X DELETE http://localhost:8006/tests/999
```
**Expected:** 404 Not Found

#### 6b. Delete test already used in orders (should fail after orders are created)
After creating orders, attempt:
```bash
curl -X DELETE http://localhost:8006/tests/1
```
**Expected:** 400 Bad Request (test in use)

---

## Lab Order Endpoints

### 7. POST /orders - Create Lab Order

**Setup:** Ensure patients exist (seeded in patient service)

```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "referral_id": 1,
    "ordered_by": 1,
    "priority": "routine",
    "clinical_indication": "Annual physical exam",
    "test_ids": [1, 2, 7, 20]
  }'
```

**Expected Response (201 Created):**
```json
{
  "order_id": 1,
  "patient_id": 1,
  "referral_id": 1,
  "ordered_by": 1,
  "ordered_date": "2026-08-09T...",
  "priority": "routine",
  "clinical_indication": "Annual physical exam",
  "status": "placed",
  "order_tests": [
    {
      "order_test_id": 1,
      "order_id": 1,
      "test_id": 1,
      "order_status": "ordered",
      "test": {...}
    },
    ...
  ]
}
```

**Test Cases:**

#### 7a. Create order with non-existent patient
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 999,
    "ordered_by": 1,
    "test_ids": [1, 2]
  }'
```
**Expected:** 400 Bad Request

#### 7b. Create order with invalid referral
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "referral_id": 999,
    "ordered_by": 1,
    "test_ids": [1, 2]
  }'
```
**Expected:** 400 Bad Request

#### 7c. Create order with non-existent test
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "ordered_by": 1,
    "test_ids": [1, 999]
  }'
```
**Expected:** 400 Bad Request

#### 7d. Create order without tests
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "ordered_by": 1,
    "test_ids": []
  }'
```
**Expected:** 400 Bad Request

#### 7e. Create order with invalid priority
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "ordered_by": 1,
    "priority": "urgent",
    "test_ids": [1]
  }'
```
**Expected:** 400 Bad Request

#### 7f. Create STAT order
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "ordered_by": 1,
    "priority": "stat",
    "clinical_indication": "Emergency evaluation",
    "test_ids": [1, 2]
  }'
```
**Expected:** 201 Created with priority: "stat"

---

### 8. GET /orders - List Orders

```bash
curl http://localhost:8006/orders
```

**Expected:** 200 OK with array of orders

**Test Cases:**

#### 8a. List all orders
```bash
curl http://localhost:8006/orders
```
**Expected:** 200 OK with all orders

#### 8b. Filter by patient
```bash
curl "http://localhost:8006/orders?patient_id=1"
```
**Expected:** 200 OK with patient 1's orders only

#### 8c. Filter by status
```bash
curl "http://localhost:8006/orders?status=placed"
```
**Expected:** 200 OK with "placed" orders only

#### 8d. Filter by priority
```bash
curl "http://localhost:8006/orders?priority=stat"
```
**Expected:** 200 OK with STAT orders only

#### 8e. Combine filters
```bash
curl "http://localhost:8006/orders?patient_id=1&status=placed&priority=routine"
```
**Expected:** 200 OK with matching orders

#### 8f. Pagination
```bash
curl "http://localhost:8006/orders?skip=0&limit=5"
```
**Expected:** 200 OK with first 5 orders

---

### 9. GET /orders/{order_id} - Get Order Details

```bash
curl http://localhost:8006/orders/1
```

**Expected Response (200 OK):**
```json
{
  "order_id": 1,
  "patient_id": 1,
  "referral_id": 1,
  "ordered_by": 1,
  "ordered_date": "2026-08-09T...",
  "priority": "routine",
  "clinical_indication": "Annual physical exam",
  "status": "placed",
  "order_tests": [...]
}
```

**Test Cases:**

#### 9a. Valid order ID
```bash
curl http://localhost:8006/orders/1
```
**Expected:** 200 OK

#### 9b. Non-existent order
```bash
curl http://localhost:8006/orders/999
```
**Expected:** 404 Not Found

---

### 10. PATCH /orders/{order_id} - Update Order

```bash
curl -X PATCH http://localhost:8006/orders/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "collected",
    "clinical_indication": "Updated reason"
  }'
```

**Expected Response (200 OK):**
```json
{
  "order_id": 1,
  "status": "collected",
  "clinical_indication": "Updated reason",
  ...
}
```

**Test Cases:**

#### 10a. Update non-existent order
```bash
curl -X PATCH http://localhost:8006/orders/999 \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```
**Expected:** 404 Not Found

---

## Integration Testing

### Test Complete Workflow

1. **Create test order**
   ```bash
   ORDER_RESPONSE=$(curl -s -X POST http://localhost:8006/orders \
     -H "Content-Type: application/json" \
     -d '{"patient_id": 1, "ordered_by": 1, "test_ids": [1,2,3]}')
   ```

2. **Extract order ID**
   ```bash
   ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"order_id":[0-9]*' | grep -o '[0-9]*')
   ```

3. **Retrieve order**
   ```bash
   curl http://localhost:8006/orders/$ORDER_ID
   ```

4. **Update order status**
   ```bash
   curl -X PATCH http://localhost:8006/orders/$ORDER_ID \
     -H "Content-Type: application/json" \
     -d '{"status": "collected"}'
   ```

---

## Performance Testing

### Bulk Create Orders

```bash
for i in {1..10}; do
  curl -X POST http://localhost:8006/orders \
    -H "Content-Type: application/json" \
    -d "{
      \"patient_id\": $((i % 5 + 1)),
      \"ordered_by\": 1,
      \"test_ids\": [1,2,3,4,5]
    }"
done
```

**Expected:** All succeed with 201 Created

### List with Large Limit

```bash
curl "http://localhost:8006/orders?limit=1000"
```

**Expected:** 200 OK, respects limit parameter

---

## Error Scenarios

### 1. Service Unavailable (Patient Service Down)

When Patient Service is down:
```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 1, "ordered_by": 1, "test_ids": [1]}'
```

**Expected:** 503 Service Unavailable

### 2. Database Connection Error

If database is unavailable:
```bash
curl http://localhost:8006/health
```

**Expected:** 503 Unhealthy

### 3. Malformed Request

```bash
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{"invalid": "json"'
```

**Expected:** 422 Unprocessable Entity

---

## Success Criteria

All tests should pass:
- ✅ 27 tests seeded on startup
- ✅ All test CRUD operations working
- ✅ All order operations working
- ✅ Patient/referral validation working
- ✅ Pagination working
- ✅ Filtering working
- ✅ Error handling working
- ✅ Health check returning accurate data
- ✅ Logging information appearing in console

---

## Debugging Tips

### Check Service Logs

```bash
docker-compose logs lab-service
```

### Verify Database

```bash
sqlite3 services/lab/lab.db
.tables
SELECT COUNT(*) FROM tests;
SELECT * FROM lab_orders;
```

### Test Service Connectivity

```bash
curl http://localhost:8006/health
curl http://localhost:8001/patients/1  # Patient Service
curl http://localhost:8003/referrals/1 # Referral Service
```

### Clean Database

```bash
rm services/lab/lab.db
docker-compose restart lab-service
```

---

## Contact

Questions? Check ENDPOINTS.md and README.md for API documentation.
