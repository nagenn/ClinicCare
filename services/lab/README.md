# Lab Service

Laboratory Management System microservice for ClinicCare. Handles lab test catalog, lab orders, sample collection, test processing, and results management.

## Quick Start

### Prerequisites
- Python 3.11+
- FastAPI 0.115.0
- SQLAlchemy 2.0.35
- SQLite (included)

### Installation & Running Locally

```bash
cd services/lab

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will start on `http://localhost:8006`

### Running with Docker

```bash
docker-compose up lab-service
```

### Health Check

```bash
curl http://localhost:8006/health
```

---

## API Documentation

See [ENDPOINTS.md](./ENDPOINTS.md) for complete API reference with examples.

### Quick Endpoints

#### Test Catalog (6 endpoints)
- `GET /tests` - List all tests (with pagination & filtering)
- `GET /tests/{test_id}` - Get specific test by ID
- `GET /tests/code/{test_code}` - Get test by code
- `POST /tests` - Create new test
- `PATCH /tests/{test_id}` - Update test
- `DELETE /tests/{test_id}` - Delete test (safe deletion)

#### Lab Orders (4 endpoints)
- `POST /orders` - Create new order (with validation)
- `GET /orders` - List orders (with filtering & pagination)
- `GET /orders/{order_id}` - Get order details
- `PATCH /orders/{order_id}` - Update order status

#### Sample Collection (1 endpoint)
- `POST /orders/{order_id}/collect` - Mark sample collected

#### Status Tracking (2 endpoints)
- `PATCH /orders/{order_id}/tests/{test_id}/status` - Update test status
- `GET /orders/{order_id}/history` - Get status change history

#### Test Results (3 endpoints)
- `POST /orders/{order_id}/tests/{test_id}/result` - Submit test result
- `GET /orders/{order_id}/results` - Get all results for order
- `PATCH /results/{result_id}/review` - Mark result as reviewed

#### Statistics (2 endpoints)
- `GET /stats` - Lab operations statistics
- `GET /orders/stats/specialty/{specialty}` - Stats by specialty

#### Health (1 endpoint)
- `GET /health` - Service health & database stats

---

## Architecture

### Database Schema

**Test** (Test Catalog)
- test_id (PK)
- test_code (unique)
- test_name
- description
- sample_type (blood, urine, etc.)
- processing_time_days
- normal_range_min, normal_range_max
- unit (mg/dL, etc.)
- specialty (Hematology, Cardiology, etc.)

**LabOrder**
- order_id (PK)
- patient_id (FK to Patient Service)
- referral_id (FK to Referral Service)
- ordered_by (doctor_id)
- ordered_date
- priority (routine/stat)
- clinical_indication
- status (draft/placed/collected/processing/completed)

**OrderTest** (Join table)
- order_test_id (PK)
- order_id (FK to LabOrder)
- test_id (FK to Test)
- order_status (ordered/sample_collected/in_progress/completed)

**LabSample**
- sample_id (PK)
- order_id (FK to LabOrder)
- sample_type
- collection_date
- collected_by (technician_id)
- sample_label
- status (pending/collected/processed)

**TestResult**
- result_id (PK)
- order_test_id (FK to OrderTest)
- result_value
- result_date
- reviewed_date
- reviewed_by (doctor_id)
- is_abnormal
- is_critical
- notes

**StatusHistory** (Audit trail)
- history_id (PK)
- order_test_id (FK to OrderTest)
- old_status
- new_status
- changed_at
- changed_by (user_id)

---

## Service Integration

### Service Dependencies

Lab Service integrates with:

1. **Patient Service** (port 8001)
   - Validates patient exists before creating order
   - GET `/patients/{patient_id}` called during order creation

2. **Referral Service** (port 8003)
   - Validates referral exists when referral_id provided
   - GET `/referrals/{referral_id}` called during order creation

3. **Notification Service** (port 8005)
   - Sends notifications on lab order creation
   - Sends notifications on results completion
   - Alerts on critical results

4. **Gateway** (port 8000)
   - Routes frontend requests to Lab Service
   - All frontend requests go through `/api/lab/...`

### Service URLs (Docker)
```
PATIENT_SERVICE_URL=http://patient-service:8001
DOCTORS_SERVICE_URL=http://doctors-service:8002
REFERRAL_SERVICE_URL=http://referral-service:8003
NOTIFICATION_SERVICE_URL=http://notification-service:8005
```

### Service URLs (Local Development)
```
PATIENT_SERVICE_URL=http://localhost:8001
DOCTORS_SERVICE_URL=http://localhost:8002
REFERRAL_SERVICE_URL=http://localhost:8003
NOTIFICATION_SERVICE_URL=http://localhost:8005
```

---

## Seed Data

Lab Service includes 25 pre-seeded laboratory tests covering:
- **Hematology** (6 tests): CBC, WBC, RBC, Hemoglobin, Hematocrit, Platelets
- **Chemistry** (9 tests): Glucose, BUN, Creatinine, Electrolytes, Albumin, Protein
- **Liver Function** (4 tests): ALT, AST, ALP, Bilirubin
- **Cardiology/Lipids** (4 tests): Total Cholesterol, LDL, HDL, Triglycerides
- **Endocrinology** (3 tests): TSH, T3, T4
- **Urology** (1 test): Urinalysis

Seed data loads automatically on first startup if database is empty.

---

## Configuration

### Environment Variables

```bash
# Service URLs
PATIENT_SERVICE_URL=http://patient-service:8001
DOCTORS_SERVICE_URL=http://doctors-service:8002
REFERRAL_SERVICE_URL=http://referral-service:8003
NOTIFICATION_SERVICE_URL=http://notification-service:8005

# Database (optional, defaults to sqlite:///./lab.db)
DATABASE_URL=sqlite:///./lab.db
```

### Database

Lab Service uses SQLite by default (file: `lab.db` in service directory).

For production, update `db.py`:
```python
# Change from:
engine = create_engine("sqlite:///./lab.db", connect_args={"check_same_thread": False})

# To PostgreSQL:
engine = create_engine("postgresql://user:password@localhost/labdb")
```

---

## Status Transitions

### Order Status Flow
```
draft → placed → collected → processing → completed
```

### OrderTest Status Flow
```
ordered → sample_collected → in_progress → completed
```

### Sample Status Flow
```
pending → collected → processed
```

---

## Error Handling

Lab Service returns standard HTTP status codes:

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET, PATCH successful |
| 201 | Created | POST successful |
| 204 | No Content | DELETE successful |
| 400 | Bad Request | Invalid data, patient not found |
| 404 | Not Found | Test/Order not found |
| 422 | Validation Error | Malformed request |
| 500 | Server Error | Unexpected error |

All errors return:
```json
{
  "detail": "Descriptive error message"
}
```

---

## Logging

Lab Service logs important operations to stdout:

```
INFO: Lab Service initialized successfully with 25 test definitions
INFO: Listed 10 tests (specialty: Hematology, total: 25)
INFO: Created test: PSA (ID: 26)
INFO: Lab order created: Order#10 for Patient#1 with 4 tests
WARNING: Order creation failed: Patient 999 not found
ERROR: Startup error: Database connection failed
```

---

## Development

### Project Structure

```
services/lab/
├── main.py              # FastAPI application & endpoints
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic request/response schemas
├── db.py                # Database configuration
├── seed.py              # Seed data
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker image definition
├── ENDPOINTS.md         # Complete API documentation
└── README.md            # This file
```

### Running Tests

```bash
# Unit tests (to be implemented)
pytest tests/

# Manual API testing
curl http://localhost:8006/tests
curl -X POST http://localhost:8006/orders \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 1, "ordered_by": 2, "test_ids": [1, 2, 3]}'
```

---

## Week 1 Completion Status

✅ **Day 1:** Lab Service scaffold created  
✅ **Day 2:** API endpoint documentation (ENDPOINTS.md)  
✅ **Day 3:** Test Catalog CRUD endpoints implemented  
✅ **Day 4:** Lab Order creation and listing endpoints implemented  
✅ **Day 5:** Database seeding configured, service integration setup  

---

## Week 2 Completion Status

✅ **Day 6:** Sample Collection endpoints implemented  
✅ **Day 7:** Status Tracking & Notification Service integration  
✅ **Day 8:** Test Results submission with auto-flagging  
✅ **Day 9:** Results review & audit logging  
✅ **Day 10:** Statistics endpoints & final documentation  

**Total Endpoints:** 19 (6 test catalog + 4 orders + 1 sample + 2 status + 3 results + 2 stats + 1 health)

---

## Contact

**Service Owner:** Backend Team Lead  
**Last Updated:** 2026-08-09  
**Version:** 1.0.0

---

## License

Part of ClinicCare Platform © 2026
