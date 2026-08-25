# Lab Service Testing Script
# Run all tests for Lab Service

Write-Host "=== Lab Service Testing ===" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n[1/22] Health Check..." -ForegroundColor Cyan
curl http://localhost:8006/health

# Test 2: List Tests
Write-Host "`n[2/22] List All Tests..." -ForegroundColor Cyan
curl http://localhost:8006/tests | head -20

# Test 3: Get Test by ID
Write-Host "`n[3/22] Get Test by ID (1)..." -ForegroundColor Cyan
curl http://localhost:8006/tests/1

# Test 4: Get Test by Code
Write-Host "`n[4/22] Get Test by Code (GLU)..." -ForegroundColor Cyan
curl http://localhost:8006/tests/code/GLU

# Test 5: Create New Test
Write-Host "`n[5/22] Create New Test..." -ForegroundColor Cyan
curl -X POST http://localhost:8006/tests `
  -H "Content-Type: application/json" `
  -d '{
    "test_code": "TESTLAB",
    "test_name": "Test Lab Endpoint",
    "sample_type": "blood",
    "processing_time_days": 1,
    "normal_range_min": 10.0,
    "normal_range_max": 20.0,
    "unit": "mg/dL",
    "specialty": "Testing"
  }'

# Test 6: Filter by Specialty
Write-Host "`n[6/22] Filter by Specialty (Cardiology)..." -ForegroundColor Cyan
curl "http://localhost:8006/tests?specialty=Cardiology"

# Test 7: Test Pagination
Write-Host "`n[7/22] Test Pagination (skip=0, limit=5)..." -ForegroundColor Cyan
curl "http://localhost:8006/tests?skip=0&limit=5"

# Test 8: Create Lab Order
Write-Host "`n[8/22] Create Lab Order..." -ForegroundColor Cyan
curl -X POST http://localhost:8006/orders `
  -H "Content-Type: application/json" `
  -d '{
    "patient_id": 1,
    "referral_id": 1,
    "ordered_by": 1,
    "priority": "routine",
    "clinical_indication": "Annual physical exam",
    "test_ids": [1, 7, 20, 23]
  }'

# Test 9: List Orders
Write-Host "`n[9/22] List Orders..." -ForegroundColor Cyan
curl http://localhost:8006/orders

# Test 10: Get Order Details
Write-Host "`n[10/22] Get Order Details (order_id=1)..." -ForegroundColor Cyan
curl http://localhost:8006/orders/1

# Test 11: Filter Orders by Patient
Write-Host "`n[11/22] Filter Orders by Patient (patient_id=1)..." -ForegroundColor Cyan
curl "http://localhost:8006/orders?patient_id=1"

# Test 12: Mark Sample Collected
Write-Host "`n[12/22] Mark Sample Collected..." -ForegroundColor Cyan
curl -X POST http://localhost:8006/orders/1/collect `
  -H "Content-Type: application/json" `
  -d '{
    "collected_by": 3,
    "notes": "Sample collected successfully"
  }'

# Test 13: Update Test Status
Write-Host "`n[13/22] Update Test Status..." -ForegroundColor Cyan
curl -X PATCH http://localhost:8006/orders/1/tests/1/status `
  -H "Content-Type: application/json" `
  -d '{
    "new_status": "in_progress",
    "changed_by": 3
  }'

# Test 14: Get Status History
Write-Host "`n[14/22] Get Status History..." -ForegroundColor Cyan
curl http://localhost:8006/orders/1/history

# Test 15: Submit Normal Result
Write-Host "`n[15/22] Submit Normal Result..." -ForegroundColor Cyan
curl -X POST http://localhost:8006/orders/1/tests/1/result `
  -H "Content-Type: application/json" `
  -d '{
    "result_value": "5.5",
    "submitted_by": 3,
    "notes": "Normal result"
  }'

# Test 16: Submit Abnormal Result
Write-Host "`n[16/22] Submit Abnormal Result..." -ForegroundColor Cyan
curl -X POST http://localhost:8006/orders/1/tests/7/result `
  -H "Content-Type: application/json" `
  -d '{
    "result_value": "150",
    "submitted_by": 3,
    "notes": "Elevated glucose"
  }'

# Test 17: Submit Critical Result
Write-Host "`n[17/22] Submit Critical Result..." -ForegroundColor Cyan
curl -X POST http://localhost:8006/orders/1/tests/20/result `
  -H "Content-Type: application/json" `
  -d '{
    "result_value": "350",
    "submitted_by": 3,
    "notes": "Critical cholesterol"
  }'

# Test 18: Get All Results
Write-Host "`n[18/22] Get All Results..." -ForegroundColor Cyan
curl http://localhost:8006/orders/1/results

# Test 19: Review Result
Write-Host "`n[19/22] Review Result..." -ForegroundColor Cyan
curl -X PATCH http://localhost:8006/results/1/review `
  -H "Content-Type: application/json" `
  -d '{
    "reviewed_by": 1
  }'

# Test 20: Get Statistics
Write-Host "`n[20/22] Get Lab Statistics..." -ForegroundColor Cyan
curl http://localhost:8006/stats

# Test 21: Error Test - Invalid Patient
Write-Host "`n[21/22] Error Test - Invalid Patient (should fail)..." -ForegroundColor Yellow
curl -X POST http://localhost:8006/orders `
  -H "Content-Type: application/json" `
  -d '{
    "patient_id": 999,
    "ordered_by": 1,
    "test_ids": [1]
  }'

# Test 22: Error Test - Invalid State Transition
Write-Host "`n[22/22] Error Test - Invalid Transition (should fail)..." -ForegroundColor Yellow
curl -X PATCH http://localhost:8006/orders/1/tests/7/status `
  -H "Content-Type: application/json" `
  -d '{
    "new_status": "completed",
    "changed_by": 3
  }'

Write-Host "`n=== Testing Complete ===" -ForegroundColor Green
Write-Host "Check above for any errors. All tests should pass!" -ForegroundColor Cyan
