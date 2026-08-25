# Lab Management Module - Project Plan

**Project**: ClinicCare Lab Management System  
**Timeline**: 2 weeks (10 working days)  
**Team Size**: 4 members  
**Start Date**: 2026-08-06  
**End Date**: 2026-08-20

---

## Executive Summary

The Lab Management Module is a new subsystem for ClinicCare that manages the complete lifecycle of laboratory testing from order creation through results delivery. This module bridges the gap between referral workflows and diagnostic lab services, enabling clinicians to order tests, track sample collection, monitor processing, and review results within the existing ClinicCare ecosystem.

---

## 1. Intent & Context

### Why This Matters

Currently, ClinicCare has:
- ✅ Patient data management
- ✅ Doctor/specialist directory
- ✅ Referral workflow system
- ❌ **No lab order tracking** ← First time this exists
- ❌ **No test catalog**
- ❌ **No sample management**
- ❌ **No results system**

Lab tests are a critical component of specialist care. Without this module, clinicians cannot:
- Formally order tests from the platform
- Track test progression
- Access results in a structured way
- Link test orders to patient/referral context

### Business Value

1. **Clinician Efficiency**: Order tests directly from referrals without external systems
2. **Patient Safety**: Structured tracking of test status reduces missed results
3. **Compliance**: Audit trail of all lab orders and results
4. **Integration**: Lab orders tied to referrals create complete clinical workflow

### Technical Context

This module operates within the existing microservices architecture:
- New **Lab Service** (port 8006) - independent microservice
- Integration with **Referral Service** - labs ordered as part of referral
- Integration with **Patient Service** - labs associated with patients
- Integration with **Notification Service** - alerts on test status changes
- New **Laboratory Staff Dashboard** - for lab personnel to process tests

---

## 2. Requirements Breakdown

### 2.1 Test Catalog Management
- Create/Read/Update/Delete test definitions
- Test properties: name, code, description, sample type (blood, urine, etc.), processing time estimate, normal ranges
- Specialty categories (cardiology labs, hematology, etc.)

### 2.2 Lab Orders
- Order tests for a patient as part of a referral
- Associate with patient and referral ID
- Specify priority (routine, stat)
- Add clinical notes/indication
- Order can contain multiple tests

### 2.3 Sample Collection
- Mark samples as collected
- Track collection date/time
- Capture collector info
- Generate sample labels/barcodes (mock)

### 2.4 Test Processing
- Track test status transitions: Ordered → Sample Collected → In Progress → Completed
- Timestamp each transition
- Assign to lab technician
- Add processing notes

### 2.5 Test Results
- Record numeric and text results per test
- Include reference ranges for numeric results
- Mark abnormal/critical results
- Clinician review capability
- Results visible in patient chart and referral view

---

## 3. Data Models & Schema

### Core Entities

```
Test (Test Catalog)
├── test_id (PK)
├── test_code (unique)
├── test_name
├── description
├── sample_type
├── processing_time_days
├── normal_range_min
├── normal_range_max
├── unit
└── specialty

LabOrder
├── order_id (PK)
├── patient_id (FK)
├── referral_id (FK)
├── ordered_by (doctor_id)
├── ordered_date
├── priority (routine/stat)
├── clinical_indication
└── status (draft/placed/collected/processing/completed)

OrderTest (Join: LabOrder + Test)
├── order_test_id (PK)
├── order_id (FK)
├── test_id (FK)
└── order_status

LabSample
├── sample_id (PK)
├── order_id (FK)
├── sample_type
├── collection_date
├── collected_by
├── sample_label
└── status (pending/collected/processed)

TestResult
├── result_id (PK)
├── order_test_id (FK)
├── result_value (numeric or text)
├── result_date
├── reviewed_date
├── reviewed_by (doctor_id)
├── is_abnormal
├── is_critical
└── notes

StatusHistory (Audit)
├── history_id (PK)
├── order_test_id (FK)
├── old_status
├── new_status
├── changed_at
└── changed_by
```

---

## 4. Team Structure & Role Assignments

### Option A: Role-Based Distribution (Recommended)

**Team Member 1: Backend Lead / API Developer**
- Tech Stack: Python, FastAPI, SQLAlchemy
- Responsibilities:
  - Architecture design & implementation
  - Core Lab Service creation
  - Database schema design
  - API endpoints for all CRUD operations
  - Service-to-service communication (Referral/Patient/Notification)
  - Authentication/authorization

**Team Member 2: Frontend Developer**
- Tech Stack: Angular 18, TypeScript, RxJS
- Responsibilities:
  - Lab ordering form component
  - Lab results dashboard/viewer
  - Sample collection UI
  - Lab module integration into existing navigation
  - Styling & UX consistency
  - HTTP service client for Lab API

**Team Member 3: Lab Processing Interface Developer**
- Tech Stack: Angular 18, TypeScript, RxJS
- Responsibilities:
  - Lab technician dashboard
  - Sample collection tracking UI
  - Test processing workflow interface
  - Result entry forms
  - Status transition UI
  - Sample label generation UI

**Team Member 4: QA / DevOps / Integration Specialist**
- Responsibilities:
  - Database schema validation
  - API testing (unit & integration tests)
  - End-to-end workflow testing
  - Docker setup for Lab Service
  - Docker Compose integration
  - Manual testing & bug tracking
  - Documentation

---

## 5. Sprint Breakdown

### Week 1: Foundation & Core Development

#### Days 1-2: Planning, Design & Setup
**All Team**: 
- [ ] Finalize data schema design
- [ ] API endpoint specifications (OpenAPI/Swagger)
- [ ] UI/UX wireframes
- [ ] Git branch strategy & PR templates

**Backend Lead**:
- [ ] Initialize Lab Service project structure (FastAPI scaffold)
- [ ] Create database schema (SQLAlchemy models)
- [ ] Set up database migrations
- [ ] Configure service in docker-compose.yml

**QA Lead**:
- [ ] Prepare test plans & test case template
- [ ] Set up local environment for all team members
- [ ] Create Docker Compose configuration for Lab Service

#### Days 3-5: Core API Development & Database
**Backend Lead**:
- [ ] Implement Test Catalog endpoints (GET all, GET by ID, POST, PATCH, DELETE)
- [ ] Implement LabOrder endpoints (POST create, GET list, GET by ID)
- [ ] Implement OrderTest join endpoints
- [ ] Add validation & error handling
- [ ] Create seed data for test catalog (20-30 common tests)
- [ ] API documentation (auto-generated from FastAPI)

**Frontend Developer 1**:
- [ ] Create Lab Module structure & routing
- [ ] Build Test Catalog browser component
- [ ] Build Lab Order creation form (patient/referral selection)
- [ ] Implement Lab Order list view
- [ ] Create HTTP client service for Lab API

**Frontend Developer 2 (if using different person, else same person)**:
- [ ] Build Lab technician dashboard shell
- [ ] Build sample collection UI component
- [ ] Create status transition UI
- [ ] Create basic result entry form skeleton

**QA Lead**:
- [ ] Execute database schema validation tests
- [ ] Manual API testing via Postman/curl
- [ ] Create test data sets
- [ ] Document any schema issues

### Week 2: Workflow Implementation & Integration

#### Days 6-7: Sample Collection & Processing Workflows
**Backend Lead**:
- [ ] Implement Sample Collection endpoints (POST collect, GET by order)
- [ ] Implement Status History tracking
- [ ] Add status transition logic (Ordered → Collected → Processing → Completed)
- [ ] Implement service-to-service calls (notify referral service of lab status)

**Frontend Developer 1**:
- [ ] Implement sample collection workflow component
- [ ] Add real-time status updates to Lab Order view
- [ ] Build lab results viewer component
- [ ] Add notification display for status changes

**Frontend Developer 2**:
- [ ] Complete lab technician dashboard (show pending samples)
- [ ] Build test processing assignment UI
- [ ] Complete result entry form (numeric + text results)
- [ ] Add validation for result ranges

**QA Lead**:
- [ ] Test sample collection workflow end-to-end
- [ ] Test status transitions
- [ ] Verify integration with notification service
- [ ] Create test scripts for batch operations

#### Days 8-9: Results Management & Clinician Integration
**Backend Lead**:
- [ ] Implement TestResult endpoints (POST result, GET results for order)
- [ ] Implement result validation (abnormal/critical flags)
- [ ] Add "reviewed" status for results
- [ ] Implement referral service notification on results completion
- [ ] Add audit logging for all status changes

**Frontend Developer 1**:
- [ ] Build detailed results view component (with ranges & abnormal flags)
- [ ] Add result review/acknowledge capability
- [ ] Integrate lab results into patient chart view
- [ ] Integrate lab section into referral detail view

**Frontend Developer 2**:
- [ ] Add lab results export/print capability
- [ ] Build result trend visualization (if applicable)
- [ ] Create lab report template display
- [ ] Add results notification bell integration

**QA Lead**:
- [ ] Test result submission workflow
- [ ] Test abnormal result flagging
- [ ] Test result validation rules
- [ ] Verify data consistency across services

#### Day 10: Testing, Documentation & Deployment
**All Team**:
- [ ] Fix critical bugs identified in testing
- [ ] Smoke testing of complete workflow
- [ ] Performance testing

**Backend Lead**:
- [ ] Write API documentation (README in lab service)
- [ ] Create deployment checklist
- [ ] Update docker-compose.yml final version

**Frontend Developers**:
- [ ] Update CLAUDE.md with lab module information
- [ ] Create component documentation
- [ ] Add JSDoc comments to key services

**QA Lead**:
- [ ] Final UAT testing
- [ ] Create bug report summary
- [ ] Prepare release notes
- [ ] Verify Docker deployment process

---

## 6. Detailed Task Assignments

### BACKEND LEAD - Lab Service Development

**Task Summary**

| Week | Day | Task | Est. Hours |
|------|-----|------|-----------|
| 1 | Day 1 | 1.1 Lab Service scaffold | 2h |
| 1 | Day 1 | 1.2a API endpoint design (start) | 2h |
| 1 | Day 2 | 1.2b API endpoint docs (finish) | 1h |
| 1 | Day 2 | 1.3 SQLAlchemy models | 3h |
| 1 | Day 3 | 2.1 Test Catalog API (CRUD) | 4h |
| 1 | Day 4 | 2.2 Lab Order Creation API | 4h |
| 1 | Day 5 | 2.3 DB seeding & migration setup | 2h |
| 1 | Day 5 | 2.4 Service-to-service integration setup | 2h |
| 2 | Day 6 | 3.1a Sample Collection endpoints | 3h |
| 2 | Day 7 | 3.1b Status Tracking (finish) | 2h |
| 2 | Day 7 | 3.3 Notification integration | 2h |
| 2 | Day 8 | 3.2a Test Results Management (submission) | 3h |
| 2 | Day 9 | 3.2b Test Results Management (review) | 1h |
| 2 | Day 9 | 3.4 Audit & logging | 2h |
| 2 | Day 10 | 3.5 API documentation & testing | 2h |

#### WEEK 1 (Days 1-5)

**Day 1**
```
Task 1.1: Create Lab Service scaffold
- New folder: services/lab/
- Create main.py, models.py, schemas.py, db.py, seed.py
- Copy requirements.txt pattern from existing services
- Add to docker-compose.yml (port 8006)
- Estimate: 2 hours
- Acceptance: Service structure complete, can import without errors

Task 1.2a: Design API endpoints (start)
- Draft ENDPOINTS.md with all lab endpoints & request/response schemas
- Estimate: 2 hours
- Acceptance: Draft endpoint list ready for team review
```

**Day 2**
```
Task 1.2b: Finalize API endpoint documentation
- Define status transitions and validation rules
- Walk team through ENDPOINTS.md at standup, incorporate feedback
- Estimate: 1 hour
- Acceptance: All endpoints documented, team reviewed & approved

Task 1.3: Create SQLAlchemy models
- Implement Test, LabOrder, OrderTest, LabSample, TestResult, StatusHistory models
- Add relationships and constraints
- Add indexes on frequently queried fields
- Estimate: 3 hours
- Acceptance: Models created, relationships verified, db.py configured
```

**Day 3**
```
Task 2.1: Test Catalog API (CRUD endpoints)
- GET /tests - list all tests (with pagination & filtering by specialty)
- GET /tests/{test_id} - get test details
- POST /tests - create new test (admin only)
- PATCH /tests/{test_id} - update test
- DELETE /tests/{test_id} - delete test
- Create seed data: 25 common lab tests
- Estimate: 4 hours
- Acceptance: All endpoints working, seed data loads on startup, filtering works
```

**Day 4**
```
Task 2.2: Lab Order Creation API
- POST /orders - create lab order (accepts patient_id, referral_id, test_ids[], priority, clinical_indication)
- GET /orders - list orders (with filtering by patient, referral, status)
- GET /orders/{order_id} - get order with all associated tests
- PATCH /orders/{order_id} - update order (status transitions)
- Validation: Patient exists, Referral exists, Tests exist
- Estimate: 4 hours
- Acceptance: Create order workflow tested, validation working, status transitions allowed
```

**Day 5**
```
Task 2.3: Database Seeding & Migration Setup
- Create seed.py with test catalog data
- Set up Alembic for migrations (optional, or use Base.metadata.create_all)
- Add initial migration
- Estimate: 2 hours
- Acceptance: Fresh database loads with test data, all tables created

Task 2.4: Service-to-Service Integration Setup
- Implement httpx client for calling Referral Service (GET /referrals/{id})
- Implement httpx client for calling Patient Service (GET /patients/{id})
- Add environment variables for service URLs
- Estimate: 2 hours
- Acceptance: Can verify patient/referral existence before creating order

- Prepare & present mid-sprint demo (Test Catalog + Order creation via API)
```

#### WEEK 2 (Days 6-10)

**Day 6**
```
Task 3.1a: Sample Collection endpoints
- POST /orders/{order_id}/collect - mark sample collected, record collection time
- Implement StatusHistory model tracking
- Estimate: 3 hours
- Acceptance: Sample can be marked collected, history recorded
```

**Day 7**
```
Task 3.1b: Status Tracking (finish)
- PATCH /orders/{order_id}/tests/{test_id}/status - update test status
- GET /orders/{order_id}/history - get full status history
- Estimate: 2 hours
- Acceptance: Status transitions validated end-to-end

Task 3.3: Notification Integration
- Call Notification Service when lab order created
- Call Notification Service when results completed
- Call Notification Service when critical result detected
- Estimate: 2 hours
- Acceptance: Notifications sent for status changes, no crashes on notification service unavailability
```

**Day 8**
```
Task 3.2a: Test Results Management (submission)
- POST /orders/{order_id}/tests/{test_id}/result - submit test result (value + optional notes)
- GET /orders/{order_id}/results - get all results for an order
- Implement validation: numeric results checked against normal range
- Estimate: 3 hours
- Acceptance: Results can be submitted, abnormal flags set automatically
```

**Day 9**
```
Task 3.2b: Test Results Management (review)
- PATCH /results/{result_id}/review - mark result as reviewed by doctor
- Estimate: 1 hour
- Acceptance: Results can be reviewed by a clinician

Task 3.4: Audit & Logging
- Add logging to all major operations
- Implement "changed_by" tracking in StatusHistory
- Add error handling & validation error messages
- Estimate: 2 hours
- Acceptance: All operations logged, errors have meaningful messages
```

**Day 10**
```
Task 3.5: API Documentation & Testing
- Generate OpenAPI/Swagger documentation
- Write README for Lab Service
- Create example curl requests for all endpoints
- Estimate: 2 hours
- Acceptance: API docs complete, all endpoints documented with examples

- Finalize docker-compose.yml, support QA on deployment checklist, fix critical bugs found in testing
```

---

### FRONTEND DEVELOPER 1 - Clinician Interface

**Task Summary**

| Week | Day | Task | Est. Hours |
|------|-----|------|-----------|
| 1 | Day 1 | F1.1 Lab Module structure | 2h |
| 1 | Day 2 | F1.2 Lab HTTP service | 2h |
| 1 | Day 3 | F2.1 Lab Order List component | 3h |
| 1 | Day 4 | F2.2a Order Creation Form (steps 1-3) | 3h |
| 1 | Day 5 | F2.2b Order Creation Form (finish) | 2h |
| 1 | Day 5 | F2.3 Lab Results Viewer component | 3h |
| 2 | Day 6 | F3.1 Lab Results into Patient Chart | 2h |
| 2 | Day 7 | F3.2 Lab Section into Referral Detail | 3h |
| 2 | Day 8 | F3.3 Real-Time Status Updates | 2h |
| 2 | Day 9 | F3.4 Styling & UX Polish | 3h |
| 2 | Day 10 | Bug fixes, smoke testing support, docs | - |

#### WEEK 1 (Days 1-5)

**Day 1**
```
Task F1.1: Create Lab Module structure
- Create src/app/features/lab/ folder
- Create routing: /lab/orders, /lab/results, /lab/tests
- Create lab.service.ts HTTP client
- Generate components: lab-orders-list, create-lab-order, lab-results
- Estimate: 2 hours
- Acceptance: Lab module routes work, service client initialized
```

**Day 2**
```
Task F1.2: Design Lab HTTP service
- Create lab.service.ts with methods:
  - getTests()
  - createOrder(orderData)
  - getOrders()
  - getOrder(id)
  - getResults(orderId)
- Add error handling & loading states
- Estimate: 2 hours
- Acceptance: Service methods callable, HTTP calls routed to gateway
```

**Day 3**
```
Task F2.1: Create Lab Order List Component
- Display table of lab orders for current patient/context
- Show order status, test names, creation date
- Link to detail view
- Add filter by status
- Estimate: 3 hours
- Acceptance: Orders display, sortable, filterable, loads from API
```

**Day 4**
```
Task F2.2a: Lab Order Creation Form (steps 1-3)
- Stepper/multi-step form:
  Step 1: Select patient (from referral context or dropdown)
  Step 2: Select referral (or mark as standalone order)
  Step 3: Select tests (multi-select from test catalog)
- Client-side validation on completed steps
- Estimate: 3 hours
- Acceptance: Steps 1-3 functional, validation working
```

**Day 5**
```
Task F2.2b: Lab Order Creation Form (finish)
- Step 4: Set priority & clinical indication
- Step 5: Review & submit; success message & redirect to orders list
- Estimate: 2 hours
- Acceptance: Full form functional end-to-end, order created successfully

Task F2.3: Create Lab Results Viewer Component
- Display results for a completed lab order
- Show: test name, result value, normal range (visual indicator: green/red),
  abnormal/critical flags, collection date & completion date, doctor notes
- Add print/export button
- Estimate: 3 hours
- Acceptance: Results display correctly, ranges shown, abnormal flags visible
```

#### WEEK 2 (Days 6-10)

**Day 6**
```
Task F3.1: Integrate Lab Results into Patient Chart
- Add "Lab Results" section to patient-details component
- Show recent lab results with status
- Link to full results view
- Estimate: 2 hours
- Acceptance: Lab section visible in patient chart, results load
```

**Day 7**
```
Task F3.2: Integrate Lab Section into Referral Detail
- Show associated lab orders in referral view
- Allow ordering new tests from referral view
- Show lab results within referral context
- Estimate: 3 hours
- Acceptance: Lab orders shown in referral, can order tests from referral
```

**Day 8**
```
Task F3.3: Add Real-Time Status Updates
- Implement polling or WebSocket (simple polling acceptable for MVP)
- Auto-refresh lab order status every 30 seconds when order in progress
- Show status badges (Ordered, Collected, Processing, Completed)
- Estimate: 2 hours
- Acceptance: Status updates visible without manual refresh
```

**Day 9**
```
Task F3.4: Styling & UX Polish
- Apply consistent styling with existing app
- Add loading spinners
- Add error messages
- Responsive design for mobile
- Estimate: 3 hours
- Acceptance: All components styled, consistent with app design system
```

**Day 10**
```
- Fix critical bugs found during Week 2 testing
- Support end-to-end smoke testing with QA
- Add component documentation / JSDoc comments to lab services
```

---

### FRONTEND DEVELOPER 2 - Lab Technician Interface

**Task Summary**

| Week | Day | Task | Est. Hours |
|------|-----|------|-----------|
| 1 | Day 1 | F2.1 Lab Technician Module | 3h |
| 1 | Day 2 | F2.2 Technician Dashboard component | 2h |
| 1 | Day 3 | F3.1 Sample Collection Tracking component | 4h |
| 1 | Day 4 | F3.2 Test Processing component | 3h |
| 1 | Day 5 | F3.3 Result Entry Form component | 4h |
| 2 | Day 6 | F4.1 Sample Barcode/Label component | 2h |
| 2 | Day 7 | F4.2 Bulk Operations UI (optional MVP+) | 2h |
| 2 | Day 8 | F4.3 Lab Statistics/Dashboard | 3h |
| 2 | Day 9 | F4.4 Styling, validation & error handling | 3h |
| 2 | Day 10 | Bug fixes, smoke testing support, docs | - |

#### WEEK 1 (Days 1-5)

**Day 1**
```
Task F2.1: Create Lab Technician Module
- Create src/app/features/lab-technician/ folder
- Create routing: /lab-tech/dashboard, /lab-tech/samples, /lab-tech/process
- Create lab-tech.service.ts (shared data with main lab service)
- Generate components: technician-dashboard, sample-tracker, result-entry
- Add role-based access (lab technician role only)
- Estimate: 3 hours
- Acceptance: Lab tech module routes work, access control in place
```

**Day 2**
```
Task F2.2: Create Technician Dashboard Component
- Display pending/in-progress lab orders
- Show sample collection status
- Show which samples need processing
- List tests awaiting results
- Estimate: 2 hours
- Acceptance: Dashboard shows orders, sortable by status/date
```

**Day 3**
```
Task F3.1: Create Sample Collection Tracking Component
- Show orders pending sample collection
- Button to mark "Sample Collected" (opens modal)
- Modal captures: collection date/time, collected by (dropdown/search doctor),
  sample label/barcode (generated), notes
- Confirm & submit
- Estimate: 4 hours
- Acceptance: Sample marked collected, UI validates inputs
```

**Day 4**
```
Task F3.2: Create Test Processing Component
- Show tests with samples collected, not yet started
- Assign test to technician (optional UI)
- Move to "In Progress" status
- Track test progress (checkbox/progress bar)
- Estimate: 3 hours
- Acceptance: Test status can transition, assignment working
```

**Day 5**
```
Task F3.3: Create Result Entry Form Component
- Form for entering test results
- Numeric result input (with live validation against normal range)
- Text result input (for qualitative tests)
- Reference range display
- Abnormal/Critical checkbox (pre-populated based on validation)
- Add notes field; submit button
- Estimate: 4 hours
- Acceptance: Results entered, validation working, abnormal flag auto-set
```

#### WEEK 2 (Days 6-10)

**Day 6**
```
Task F4.1: Create Sample Barcode/Label Component
- Generate mock barcode labels
- Display label preview
- Print functionality
- Estimate: 2 hours
- Acceptance: Labels generate and display
```

**Day 7**
```
Task F4.2: Build Bulk Operations UI (optional MVP+)
- Bulk mark samples collected
- Bulk transition test statuses
- Estimate: 2 hours
- Acceptance: Bulk operations reduce technician workload
```

**Day 8**
```
Task F4.3: Add Lab Statistics/Dashboard
- Count of pending vs completed orders
- Tests by status
- Performance metrics (avg processing time)
- Estimate: 3 hours
- Acceptance: Metrics dashboard displays
```

**Day 9**
```
Task F4.4: Styling, Validation & Error Handling
- Apply consistent styling
- Add validation messages
- Add error toast notifications
- Ensure responsive design
- Estimate: 3 hours
- Acceptance: UI matches app design, all inputs validated
```

**Day 10**
```
- Fix critical bugs found during Week 2 testing
- Support end-to-end smoke testing with QA
- Add component documentation / JSDoc comments to lab-tech services
```

---

### QA / DEVOPS / INTEGRATION LEAD

**Task Summary**

| Week | Day | Task | Est. Hours |
|------|-----|------|-----------|
| 1 | Day 1 | Q1.1 Testing strategy & checklist | 2h |
| 1 | Day 1 | Q1.2 Lab Service Docker setup | 2h |
| 1 | Day 2 | Q1.3 Local dev environment setup | 1h |
| 1 | Day 2 | Q1.4 DB schema validation tests | 2h |
| 1 | Day 3 | Q2.1a API endpoint testing (Catalog & Orders) | 2h |
| 1 | Day 4 | Q2.1b API endpoint testing (finish) | 2h |
| 1 | Day 4 | Q2.2 Order-to-Sample-to-Result workflow test | 2h |
| 1 | Day 5 | Q2.3 Validation & error handling tests | 2h |
| 1 | Day 5 | Q2.4 Service integration tests | 2h |
| 2 | Day 6 | Q3.1a Frontend testing (Clinician side) | 2h |
| 2 | Day 7 | Q3.1b Frontend testing (Technician side) | 2h |
| 2 | Day 7 | Q3.2a Clinician+Technician workflow test (start) | 1h |
| 2 | Day 8 | Q3.2b Clinician+Technician workflow test (finish) | 1h |
| 2 | Day 8 | Regression testing | - |
| 2 | Day 9 | Q3.3 Deployment checklist | 2h |
| 2 | Day 10 | Q3.4 Documentation & bug report | 2h |
| 2 | Day 10 | Final UAT sign-off | - |

#### WEEK 1 (Days 1-5)

**Day 1**
```
Task Q1.1: Prepare Testing Strategy & Checklist
- Define test cases for all features:
  Test Catalog CRUD, Lab Order creation workflow, Sample collection workflow,
  Result entry workflow, Status transitions, Integration with other services,
  Error scenarios
- Create test case template (spreadsheet or Confluence)
- Estimate: 2 hours
- Acceptance: Test plan documented, test cases listed

Task Q1.2: Setup Lab Service in Docker
- Create Dockerfile for Lab Service
- Copy pattern from existing services
- Add Lab Service to docker-compose.yml
- Ensure port 8006 is configured
- Test that service starts without errors
- Estimate: 2 hours
- Acceptance: Lab Service starts via docker-compose
```

**Day 2**
```
Task Q1.3: Setup Local Development Environment
- Create setup guide for team
- Ensure all team members can: run docker-compose up, access all services,
  access frontend at localhost:4200, access lab service at localhost:8006
- Estimate: 1 hour
- Acceptance: All team members can run full stack locally

Task Q1.4: Create Database Schema Validation Tests
- Verify all models created correctly
- Check relationships (foreign keys)
- Validate indexes
- Test seed data loads
- Estimate: 2 hours
- Acceptance: Schema validated, seed data loads, relationships work
```

**Day 3**
```
Task Q2.1a: Execute API Endpoint Testing (Test Catalog & Orders)
- Test Catalog endpoints (create, read, list, update, delete)
- Lab Orders endpoints (create, list, retrieve, update)
- Document results in test checklist
- Estimate: 2 hours
- Acceptance: Catalog & Order endpoints tested, results documented
```

**Day 4**
```
Task Q2.1b: Execute API Endpoint Testing (finish)
- Sample Collection (mark collected)
- Test Status Transitions (validate invalid transitions blocked)
- Estimate: 2 hours
- Acceptance: All endpoints tested, blockers flagged

Task Q2.2: Test Order-to-Sample-to-Result Workflow
- Create sample order → collect sample → submit results
- Verify status transitions at each step
- Check that history is recorded
- Estimate: 2 hours
- Acceptance: End-to-end workflow successful, history tracking works
```

**Day 5**
```
Task Q2.3: Test Validation & Error Handling
- Test required field validation
- Test invalid data (non-existent patient, etc.)
- Test boundary conditions (extreme result values)
- Test abnormal result flagging
- Estimate: 2 hours
- Acceptance: All validations work, error messages meaningful

Task Q2.4: Test Service Integration
- Verify Lab Service calls Referral Service correctly
- Verify Lab Service calls Patient Service correctly
- Test behavior if upstream service is unavailable
- Estimate: 2 hours
- Acceptance: Service communication working, graceful failures

- Prepare & run mid-sprint demo checklist with Backend Lead
```

#### WEEK 2 (Days 6-10)

**Day 6**
```
Task Q3.1a: Execute Frontend Testing (Clinician side)
- Test Lab order creation form (happy path)
- Test order list display & filtering
- Test results viewer component
- Estimate: 2 hours
- Acceptance: Clinician-facing features work as designed, no UI bugs
```

**Day 7**
```
Task Q3.1b: Execute Frontend Testing (Technician side)
- Test lab technician dashboard
- Test sample collection UI
- Test result entry form
- Estimate: 2 hours
- Acceptance: Technician-facing features work as designed, no UI bugs

Task Q3.2a: Test Clinician + Technician Workflows (start)
- Clinician creates order → Technician collects sample
- Test that status reflects in both UIs
- Estimate: 1 hour
```

**Day 8**
```
Task Q3.2b: Test Clinician + Technician Workflows (finish)
- Technician enters results → Clinician reviews
- Test notifications at each step (if implemented)
- Estimate: 1 hour
- Acceptance: Complete workflow successful

- Regression testing across all lab module features
```

**Day 9**
```
Task Q3.3: Create Deployment Checklist
- Document all environment variables needed
- List all migrations/schema changes
- Create rollback plan if needed
- Test docker-compose deployment
- Estimate: 2 hours
- Acceptance: Deployment checklist complete, no surprises
```

**Day 10**
```
Task Q3.4: Documentation & Bug Report
- Document any issues found (critical, major, minor)
- Create release notes
- Update CLAUDE.md with Lab Module documentation
- Update README with Lab Service info
- Estimate: 2 hours
- Acceptance: Documentation complete, bugs tracked in issue system

- Final UAT sign-off and go/no-go recommendation
```

---

## 7. Deliverables Checklist

### Backend
- [ ] Lab Service codebase (GitHub/Git)
- [ ] All 5 main endpoints working (Catalog, Orders, Samples, Results, Status)
- [ ] SQLite database with schema
- [ ] Seed data (25+ test definitions)
- [ ] Integration with Referral & Patient services
- [ ] API documentation (README + OpenAPI)
- [ ] Dockerfile for Lab Service
- [ ] Updated docker-compose.yml

### Frontend - Clinician
- [ ] Lab module with routing (/lab/*)
- [ ] Test catalog browser
- [ ] Lab order creation form (5-step)
- [ ] Lab order list view
- [ ] Lab results viewer
- [ ] Integration into patient chart
- [ ] Integration into referral detail view
- [ ] Styling consistent with existing app

### Frontend - Lab Technician
- [ ] Lab technician module (/lab-tech/*)
- [ ] Technician dashboard
- [ ] Sample collection tracking
- [ ] Test processing interface
- [ ] Result entry form
- [ ] Styling and error handling

### Testing & QA
- [ ] Test plan document
- [ ] Test case checklist (50+ test cases)
- [ ] Bug report (if any)
- [ ] UAT sign-off document
- [ ] Deployment checklist
- [ ] Updated CLAUDE.md

---

## 8. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Scope creep (additional features requested) | High | High | Define MVP strictly; say "Phase 2" for nice-to-haves |
| Service integration issues (calling Referral/Patient service) | Medium | High | Test integration early (Day 3-4); have fallback behavior |
| Database schema changes mid-project | Medium | Medium | Design schema thoroughly on Day 2; review with team before implementation |
| Frontend components too complex | Medium | Medium | Build simple MVP first; enhance after core works |
| Docker/deployment issues at end | Low | High | Test Docker setup early; don't leave for last day |

---

## 9. Communication & Standup Plan

### Daily Standups (10 minutes)
- **Time**: 9:00 AM (or team preference)
- **Format**: What did you do? What's next? Any blockers?

### Status Board
- Use GitHub Projects or similar (Trello, Asana)
- Update task status daily
- Flag blockers immediately

### Mid-Sprint Review (Day 5, end of week)
- Demo working features
- Discuss any pivots needed
- Plan adjustments for Week 2

### Final Sprint Review (Day 10)
- Full demo of Lab Module
- UAT sign-off
- Release decision

---

## 10. Success Criteria

**By End of Week 1:**
- ✅ Lab Service deployed and running
- ✅ All CRUD endpoints functional
- ✅ Lab order creation working end-to-end (API)
- ✅ Frontend lab module scaffolding complete
- ✅ Team aligned on remaining work

**By End of Week 2:**
- ✅ Complete workflow: Order → Collect → Process → Result → Review
- ✅ All components styled and functional
- ✅ No critical bugs
- ✅ 80%+ test coverage (unit + manual)
- ✅ Documentation complete
- ✅ Ready for production deployment

---

## 11. Optional Enhancements (Phase 2, post-MVP)

These are NOT in scope for 2-week delivery but should be documented for future:

- [ ] Email notifications to patients with results
- [ ] Lab result trend graphs (if patient has multiple results over time)
- [ ] Advanced filtering (date range, test type, status)
- [ ] Batch sample barcode printing
- [ ] Integration with external lab systems (HL7/FHIR)
- [ ] Result approval workflow (requires reviewer role)
- [ ] Lab performance metrics dashboard
- [ ] Result templates for common test profiles (lipid panel, etc.)

