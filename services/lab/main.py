import logging
import os
from typing import Optional
from datetime import datetime

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models
import schemas
from db import Base, SessionLocal, engine, get_db
from seed import seed_if_empty

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lab Service",
    description="Laboratory Management System API",
    version="1.0.0"
)

PATIENT_SERVICE_URL = os.environ.get("PATIENT_SERVICE_URL", "http://localhost:8001")
DOCTORS_SERVICE_URL = os.environ.get("DOCTORS_SERVICE_URL", "http://localhost:8002")
REFERRAL_SERVICE_URL = os.environ.get("REFERRAL_SERVICE_URL", "http://localhost:8003")
NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://localhost:8005")


@app.on_event("startup")
def on_startup() -> None:
    db = SessionLocal()
    try:
        seed_if_empty(db)
        test_count = db.query(models.Test).count()
        logger.info(f"Lab Service initialized successfully with {test_count} test definitions")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    finally:
        db.close()


# ============ TEST CATALOG ENDPOINTS ============

@app.get("/tests", response_model=list[schemas.TestRead])
def list_tests(
    specialty: Optional[str] = Query(None, description="Filter by test specialty"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum items to return"),
    db: Session = Depends(get_db)
):
    """List all laboratory tests with optional filtering and pagination."""
    query = db.query(models.Test)
    if specialty:
        query = query.filter(models.Test.specialty.ilike(f"%{specialty}%"))

    total = query.count()
    tests = query.order_by(models.Test.test_id).offset(skip).limit(limit).all()

    logger.info(f"Listed {len(tests)} tests (specialty: {specialty}, total: {total})")
    return tests


@app.get("/tests/{test_id}", response_model=schemas.TestRead)
def get_test(test_id: int, db: Session = Depends(get_db)):
    """Get a specific test by ID."""
    test = db.query(models.Test).filter(models.Test.test_id == test_id).first()
    if test is None:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")
    return test


@app.get("/tests/code/{test_code}", response_model=schemas.TestRead)
def get_test_by_code(test_code: str, db: Session = Depends(get_db)):
    """Get a specific test by code (e.g., CBC, GLU)."""
    test = db.query(models.Test).filter(models.Test.test_code == test_code.upper()).first()
    if test is None:
        raise HTTPException(status_code=404, detail=f"Test with code {test_code} not found")
    return test


@app.post("/tests", response_model=schemas.TestRead, status_code=201)
def create_test(test: schemas.TestCreate, db: Session = Depends(get_db)):
    """Create a new test definition. Test code must be unique."""
    # Validate test code is unique
    existing = db.query(models.Test).filter(models.Test.test_code == test.test_code).first()
    if existing:
        logger.warning(f"Attempt to create duplicate test code: {test.test_code}")
        raise HTTPException(status_code=400, detail=f"Test with code {test.test_code} already exists")

    # Validate processing time is positive
    if test.processing_time_days <= 0:
        raise HTTPException(status_code=400, detail="processing_time_days must be greater than 0")

    # Validate range if provided
    if test.normal_range_min is not None and test.normal_range_max is not None:
        if test.normal_range_min > test.normal_range_max:
            raise HTTPException(status_code=400, detail="normal_range_min must be <= normal_range_max")

    db_test = models.Test(**test.model_dump())
    db.add(db_test)
    db.commit()
    db.refresh(db_test)

    logger.info(f"Created test: {test.test_code} (ID: {db_test.test_id})")
    return db_test


@app.patch("/tests/{test_id}", response_model=schemas.TestRead)
def update_test(test_id: int, test_update: schemas.TestUpdate, db: Session = Depends(get_db)):
    """Update an existing test definition. All fields are optional (partial update)."""
    db_test = db.query(models.Test).filter(models.Test.test_id == test_id).first()
    if db_test is None:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")

    update_data = test_update.model_dump(exclude_unset=True)

    # Validate test code stays unique if it's being changed
    if "test_code" in update_data and update_data["test_code"] != db_test.test_code:
        existing = (
            db.query(models.Test)
            .filter(models.Test.test_code == update_data["test_code"], models.Test.test_id != test_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail=f"Test with code {update_data['test_code']} already exists")

    # Validate processing time is positive if provided
    if "processing_time_days" in update_data and update_data["processing_time_days"] <= 0:
        raise HTTPException(status_code=400, detail="processing_time_days must be greater than 0")

    # Validate range if both provided (post-merge, so a single-sided update can't invert the range)
    effective_min = update_data.get("normal_range_min", db_test.normal_range_min)
    effective_max = update_data.get("normal_range_max", db_test.normal_range_max)
    if effective_min is not None and effective_max is not None and effective_min > effective_max:
        raise HTTPException(status_code=400, detail="normal_range_min must be <= normal_range_max")

    for key, value in update_data.items():
        setattr(db_test, key, value)

    db.commit()
    db.refresh(db_test)

    logger.info(f"Updated test: {db_test.test_code} (ID: {test_id})")
    return db_test


@app.delete("/tests/{test_id}", status_code=204)
def delete_test(test_id: int, db: Session = Depends(get_db)):
    """Delete a test definition. Cannot delete if tests are already ordered."""
    db_test = db.query(models.Test).filter(models.Test.test_id == test_id).first()
    if db_test is None:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")

    # Check if test is already used in any orders
    used_in_orders = db.query(models.OrderTest).filter(models.OrderTest.test_id == test_id).count()
    if used_in_orders > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete test: already used in {used_in_orders} order(s)")

    db.delete(db_test)
    db.commit()

    logger.info(f"Deleted test: {db_test.test_code} (ID: {test_id})")


# ============ LAB ORDER ENDPOINTS ============

async def verify_patient_exists(patient_id: int) -> bool:
    """Verify patient exists by calling Patient Service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{PATIENT_SERVICE_URL}/patients/{patient_id}")
            if response.status_code == 200:
                logger.debug(f"Patient {patient_id} verified")
                return True
            elif response.status_code == 404:
                logger.debug(f"Patient {patient_id} not found in Patient Service")
                return False
            else:
                logger.warning(f"Unexpected response from Patient Service: {response.status_code}")
                return False
    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to Patient Service: {e}")
        raise HTTPException(status_code=503, detail="Patient Service unavailable")
    except Exception as e:
        logger.error(f"Error verifying patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Error verifying patient")


async def verify_doctor_exists(doctor_id: int) -> bool:
    """Verify doctor exists by calling Doctors Service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{DOCTORS_SERVICE_URL}/doctors/{doctor_id}/exists")
            if response.status_code == 200:
                return bool(response.json().get("exists"))
            logger.warning(f"Unexpected response from Doctors Service: {response.status_code}")
            return False
    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to Doctors Service: {e}")
        raise HTTPException(status_code=503, detail="Doctors Service unavailable")
    except Exception as e:
        logger.error(f"Error verifying doctor {doctor_id}: {e}")
        raise HTTPException(status_code=500, detail="Error verifying doctor")


async def verify_referral_exists(referral_id: int) -> bool:
    """Verify referral exists by calling Referral Service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{REFERRAL_SERVICE_URL}/referrals/{referral_id}")
            if response.status_code == 200:
                logger.debug(f"Referral {referral_id} verified")
                return True
            elif response.status_code == 404:
                logger.debug(f"Referral {referral_id} not found in Referral Service")
                return False
            else:
                logger.warning(f"Unexpected response from Referral Service: {response.status_code}")
                return False
    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to Referral Service: {e}")
        raise HTTPException(status_code=503, detail="Referral Service unavailable")
    except Exception as e:
        logger.error(f"Error verifying referral {referral_id}: {e}")
        raise HTTPException(status_code=500, detail="Error verifying referral")


LAB_EVENT_TYPE_MAP = {
    "lab_order_created": "LabOrderCreated",
    "lab_result_critical": "LabResultCritical",
    "lab_result_completed": "LabResultCompleted",
}


async def notify_lab_event(event_type: str, referral_id: Optional[int], message: str) -> bool:
    """Send notification to Notification Service using its {ReferralId, EventType, Message} contract."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notifications",
                json={
                    "ReferralId": referral_id,
                    "EventType": LAB_EVENT_TYPE_MAP.get(event_type, event_type),
                    "Message": message,
                    "Source": "lab-service",
                }
            )
            if response.status_code in [200, 201]:
                logger.debug(f"Notification sent: {event_type}")
                return True
            else:
                logger.error(f"Notification service rejected {event_type} notification: {response.status_code} {response.text}")
                return False
    except Exception as e:
        logger.error(f"Could not send notification ({event_type}): {e}")
        return False


@app.get("/orders", response_model=list[schemas.LabOrderDetail])
def list_orders(
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    referral_id: Optional[int] = Query(None, description="Filter by referral ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    priority: Optional[str] = Query(None, description="Filter by priority (routine/stat)"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum items to return"),
    db: Session = Depends(get_db)
):
    """List laboratory orders with optional filtering and pagination."""
    query = db.query(models.LabOrder)

    if patient_id:
        query = query.filter(models.LabOrder.patient_id == patient_id)
    if referral_id:
        query = query.filter(models.LabOrder.referral_id == referral_id)
    if status:
        query = query.filter(models.LabOrder.status == status)
    if priority:
        query = query.filter(models.LabOrder.priority == priority)

    total = query.count()
    orders = query.order_by(desc(models.LabOrder.ordered_date)).offset(skip).limit(limit).all()

    logger.info(f"Listed {len(orders)} orders (filters: patient={patient_id}, referral={referral_id}, status={status}, total={total})")
    return orders


@app.get("/orders/{order_id}", response_model=schemas.LabOrderDetail)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return order


@app.post("/orders", response_model=schemas.LabOrderDetail, status_code=201)
async def create_order(order_data: schemas.LabOrderCreate, db: Session = Depends(get_db)):
    """Create a new lab order for a patient with specified tests."""
    # Validate test_ids is not empty
    if not order_data.test_ids or len(order_data.test_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one test must be ordered")

    # Validate priority
    if order_data.priority not in ["routine", "stat"]:
        raise HTTPException(status_code=400, detail="Priority must be 'routine' or 'stat'")

    # Reject duplicate test IDs up front so the error message reflects the real problem
    if len(set(order_data.test_ids)) != len(order_data.test_ids):
        raise HTTPException(status_code=400, detail="Duplicate test_ids in request; each test may only be ordered once per order")

    # Verify patient exists
    patient_exists = await verify_patient_exists(order_data.patient_id)
    if not patient_exists:
        logger.warning(f"Order creation failed: Patient {order_data.patient_id} not found")
        raise HTTPException(status_code=400, detail=f"Patient {order_data.patient_id} not found")

    # Verify ordering doctor exists
    doctor_exists = await verify_doctor_exists(order_data.ordered_by)
    if not doctor_exists:
        logger.warning(f"Order creation failed: Doctor {order_data.ordered_by} not found")
        raise HTTPException(status_code=400, detail=f"Doctor {order_data.ordered_by} not found")

    # Verify referral exists if provided
    if order_data.referral_id:
        referral_exists = await verify_referral_exists(order_data.referral_id)
        if not referral_exists:
            logger.warning(f"Order creation failed: Referral {order_data.referral_id} not found")
            raise HTTPException(status_code=400, detail=f"Referral {order_data.referral_id} not found")

    # Verify all tests exist and collect test details
    test_ids = order_data.test_ids
    tests = db.query(models.Test).filter(models.Test.test_id.in_(test_ids)).all()
    if len(tests) != len(test_ids):
        missing_ids = set(test_ids) - {t.test_id for t in tests}
        logger.warning(f"Order creation failed: Tests not found: {missing_ids}")
        raise HTTPException(status_code=400, detail=f"Tests not found: {missing_ids}")

    # Create lab order
    db_order = models.LabOrder(
        patient_id=order_data.patient_id,
        referral_id=order_data.referral_id,
        ordered_by=order_data.ordered_by,
        priority=order_data.priority,
        clinical_indication=order_data.clinical_indication,
        status="placed",
        ordered_date=datetime.utcnow()
    )
    db.add(db_order)
    db.flush()

    # Create OrderTest records for each test
    for test_id in test_ids:
        order_test = models.OrderTest(
            order_id=db_order.order_id,
            test_id=test_id,
            order_status="ordered"
        )
        db.add(order_test)

    # Create sample record
    sample = models.LabSample(
        order_id=db_order.order_id,
        sample_type="blood",
        status="pending"
    )
    db.add(sample)

    db.commit()
    db.refresh(db_order)

    logger.info(f"Lab order created: Order#{db_order.order_id} for Patient#{order_data.patient_id} with {len(test_ids)} tests")

    # Send notification (async, fire-and-forget)
    await notify_lab_event(
        "lab_order_created",
        db_order.referral_id,
        f"Lab order #{db_order.order_id} placed for patient #{order_data.patient_id} "
        f"({len(test_ids)} test(s), priority={order_data.priority})."
    )

    return db_order


VALID_ORDER_STATUSES = ["draft", "placed", "collected", "processing", "completed"]


@app.patch("/orders/{order_id}", response_model=schemas.LabOrderDetail)
def update_order(order_id: int, order_update: schemas.LabOrderUpdate, db: Session = Depends(get_db)):
    db_order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if db_order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    if order_update.status is not None:
        if order_update.status not in VALID_ORDER_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_ORDER_STATUSES}")
        db_order.status = order_update.status
    if order_update.clinical_indication is not None:
        db_order.clinical_indication = order_update.clinical_indication

    db.commit()
    db.refresh(db_order)
    return db_order


# ============ ORDER TESTS ENDPOINTS ============

@app.get("/orders/{order_id}/tests", response_model=list[schemas.OrderTestRead])
def get_order_tests(order_id: int, db: Session = Depends(get_db)):
    """Get all tests in an order."""
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return order.order_tests


# ============ SAMPLE COLLECTION ENDPOINTS ============

@app.post("/orders/{order_id}/collect", response_model=schemas.LabSampleRead)
def collect_sample(
    order_id: int,
    collection_data: schemas.SampleCollectRequest,
    db: Session = Depends(get_db)
):
    """Mark a sample as collected with collection details."""
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    sample = db.query(models.LabSample).filter(models.LabSample.order_id == order_id).first()
    if sample is None:
        raise HTTPException(status_code=400, detail=f"No sample found for order {order_id}")

    # Prevent duplicate collection - if already collected, return existing sample
    if sample.status == "collected":
        logger.info(f"Sample already collected for Order#{order_id}, returning existing sample")
        return sample

    # Update sample with collection info
    sample.collection_date = datetime.utcnow()
    sample.collected_by = collection_data.collected_by
    sample.sample_label = f"LAB-{datetime.utcnow().strftime('%Y-%m-%d')}-{order_id:03d}"
    sample.status = "collected"

    # Update order status
    order.status = "collected"

    # Create status history for sample collection
    for order_test in order.order_tests:
        history = models.StatusHistory(
            order_test_id=order_test.order_test_id,
            old_status=order_test.order_status,
            new_status="sample_collected",
            changed_at=datetime.utcnow(),
            changed_by=collection_data.collected_by
        )
        order_test.order_status = "sample_collected"
        db.add(history)

    db.commit()
    db.refresh(sample)

    logger.info(f"Sample collected for Order#{order_id}: {sample.sample_label}")

    return sample


# ============ STATUS TRACKING ENDPOINTS ============

VALID_ORDER_TEST_STATUSES = ["ordered", "sample_collected", "in_progress", "completed"]

ORDER_TEST_STATUS_TRANSITIONS = {
    "ordered": ["sample_collected"],
    "sample_collected": ["in_progress"],
    "in_progress": ["completed"],
    "completed": []
}


def _recompute_order_status(order: models.LabOrder) -> None:
    """Recompute the parent LabOrder's aggregate status from its OrderTests.

    Must be called (and the caller must db.commit()) any time an OrderTest's
    order_status changes, so order-level status never drifts out of sync with
    its constituent tests.
    """
    statuses = [ot.order_status for ot in order.order_tests]
    if statuses and all(s == "completed" for s in statuses):
        order.status = "completed"
    elif any(s == "in_progress" for s in statuses):
        order.status = "processing"


@app.patch("/orders/{order_id}/tests/{test_id}/status", response_model=schemas.OrderTestStatusRead)
def update_test_status(
    order_id: int,
    test_id: int,
    status_update: schemas.OrderTestStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update the status of a specific test in an order."""
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    order_test = (
        db.query(models.OrderTest)
        .filter(
            models.OrderTest.order_id == order_id,
            models.OrderTest.test_id == test_id
        )
        .first()
    )
    if order_test is None:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found in order {order_id}")

    new_status = status_update.new_status

    if new_status not in VALID_ORDER_TEST_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_ORDER_TEST_STATUSES}")

    # Validate state transition
    old_status = order_test.order_status

    if new_status not in ORDER_TEST_STATUS_TRANSITIONS.get(old_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {old_status} to {new_status}"
        )

    # Update test status
    order_test.order_status = new_status

    # Record status change
    history = models.StatusHistory(
        order_test_id=order_test.order_test_id,
        old_status=old_status,
        new_status=new_status,
        changed_at=datetime.utcnow(),
        changed_by=status_update.changed_by
    )
    db.add(history)

    # Update order status based on all tests
    _recompute_order_status(order)

    db.commit()

    logger.info(f"Test status updated: Order#{order_id}, Test#{test_id}: {old_status} → {new_status}")

    return {
        "order_test_id": order_test.order_test_id,
        "order_id": order_id,
        "test_id": test_id,
        "old_status": old_status,
        "new_status": new_status
    }


@app.get("/orders/{order_id}/history")
def get_order_history(order_id: int, db: Session = Depends(get_db)):
    """Get complete status history for an order."""
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    history = (
        db.query(models.StatusHistory)
        .join(models.OrderTest)
        .filter(models.OrderTest.order_id == order_id)
        .order_by(models.StatusHistory.changed_at)
        .all()
    )

    return [
        {
            "history_id": h.history_id,
            "order_test_id": h.order_test_id,
            "old_status": h.old_status,
            "new_status": h.new_status,
            "changed_at": h.changed_at,
            "changed_by": h.changed_by
        }
        for h in history
    ]


# ============ TEST RESULTS ENDPOINTS ============

@app.post("/orders/{order_id}/tests/{test_id}/result", response_model=schemas.TestResultRead)
async def submit_test_result(
    order_id: int,
    test_id: int,
    result_data: schemas.TestResultSubmit,
    db: Session = Depends(get_db)
):
    """Submit a test result with automatic abnormal flagging."""
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    order_test = (
        db.query(models.OrderTest)
        .filter(
            models.OrderTest.order_id == order_id,
            models.OrderTest.test_id == test_id
        )
        .first()
    )
    if order_test is None:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found in order {order_id}")

    test = db.query(models.Test).filter(models.Test.test_id == test_id).first()
    if test is None:
        raise HTTPException(status_code=404, detail=f"Test definition {test_id} not found")

    result_value = result_data.result_value
    if not result_value or not result_value.strip():
        raise HTTPException(status_code=400, detail="result_value is required")

    # A result can only be recorded once the sample has been collected, and not
    # a second time after the test is already completed (no silent overwrite).
    old_status = order_test.order_status
    if old_status not in ("sample_collected", "in_progress"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit a result: test is in '{old_status}' state; sample must be collected first"
        )

    # Determine if result is abnormal/critical
    is_abnormal = False
    is_critical = False

    try:
        numeric_value = float(result_value)

        if test.normal_range_min is not None and test.normal_range_max is not None:
            if numeric_value < test.normal_range_min or numeric_value > test.normal_range_max:
                is_abnormal = True

            # Critical if outside 1.5x range
            if numeric_value > test.normal_range_max * 1.5 or numeric_value < test.normal_range_min * 0.5:
                is_critical = True
    except ValueError:
        # Non-numeric result, use provided flags or defaults
        is_abnormal = bool(result_data.is_abnormal)
        is_critical = bool(result_data.is_critical)

    # Create result
    result = models.TestResult(
        order_test_id=order_test.order_test_id,
        result_value=str(result_value),
        result_date=datetime.utcnow(),
        is_abnormal=is_abnormal,
        is_critical=is_critical,
        notes=result_data.notes
    )
    db.add(result)

    # Update test status to completed
    order_test.order_status = "completed"

    # Record status change
    history = models.StatusHistory(
        order_test_id=order_test.order_test_id,
        old_status=old_status,
        new_status="completed",
        changed_at=datetime.utcnow(),
        changed_by=result_data.submitted_by
    )
    db.add(history)

    # Keep the parent order's aggregate status in sync with its OrderTests
    _recompute_order_status(order)

    db.commit()
    db.refresh(result)

    logger.info(
        f"Result submitted: Order#{order_id}, Test#{test_id}, Value={result_value}, "
        f"Abnormal={is_abnormal}, Critical={is_critical}"
    )

    # Send notification for results (especially critical)
    if is_critical:
        await notify_lab_event(
            "lab_result_critical",
            order.referral_id,
            f"CRITICAL result for order #{order_id}, test {test.test_code}: {result_value}"
            f"{f' {test.unit}' if test.unit else ''} "
            f"(normal range {test.normal_range_min}-{test.normal_range_max})."
        )
    else:
        await notify_lab_event(
            "lab_result_completed",
            order.referral_id,
            f"Result completed for order #{order_id}, test {test.test_code} (abnormal={is_abnormal})."
        )

    return result


@app.get("/orders/{order_id}/results")
def get_order_results(order_id: int, db: Session = Depends(get_db)):
    """Get all results for an order."""
    order = db.query(models.LabOrder).filter(models.LabOrder.order_id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    results = (
        db.query(models.TestResult)
        .join(models.OrderTest)
        .filter(models.OrderTest.order_id == order_id)
        .order_by(models.TestResult.result_date)
        .all()
    )

    return [
        {
            "result_id": r.result_id,
            "order_test_id": r.order_test_id,
            "result_value": r.result_value,
            "result_date": r.result_date,
            "reviewed_date": r.reviewed_date,
            "reviewed_by": r.reviewed_by,
            "is_abnormal": r.is_abnormal,
            "is_critical": r.is_critical,
            "notes": r.notes
        }
        for r in results
    ]


@app.patch("/results/{result_id}/review", response_model=schemas.TestResultRead)
def review_result(result_id: int, review_data: schemas.TestResultReview, db: Session = Depends(get_db)):
    """Mark a result as reviewed by a clinician."""
    result = db.query(models.TestResult).filter(models.TestResult.result_id == result_id).first()
    if result is None:
        raise HTTPException(status_code=404, detail=f"Result {result_id} not found")

    result.reviewed_date = datetime.utcnow()
    result.reviewed_by = review_data.reviewed_by

    db.commit()
    db.refresh(result)

    logger.info(f"Result reviewed: Result#{result_id} by Doctor#{result.reviewed_by}")

    return result


# ============ STATISTICS & DASHBOARD ============

@app.get("/stats")
def get_lab_statistics(db: Session = Depends(get_db)):
    """Get lab operations statistics and metrics."""
    total_orders = db.query(models.LabOrder).count()

    orders_by_status = {}
    for status in ["draft", "placed", "collected", "processing", "completed"]:
        count = db.query(models.LabOrder).filter(models.LabOrder.status == status).count()
        orders_by_status[status] = count

    total_tests = db.query(models.Test).count()

    test_status_counts = {}
    for status in ["ordered", "sample_collected", "in_progress", "completed"]:
        count = db.query(models.OrderTest).filter(models.OrderTest.order_status == status).count()
        test_status_counts[status] = count

    # Count critical results
    critical_results = db.query(models.TestResult).filter(models.TestResult.is_critical == True).count()
    abnormal_results = db.query(models.TestResult).filter(models.TestResult.is_abnormal == True).count()
    reviewed_results = db.query(models.TestResult).filter(models.TestResult.reviewed_by.isnot(None)).count()
    total_results = db.query(models.TestResult).count()

    logger.info("Lab statistics retrieved")

    return {
        "orders": {
            "total": total_orders,
            "by_status": orders_by_status
        },
        "tests": {
            "catalog_total": total_tests,
            "by_status": test_status_counts
        },
        "results": {
            "total": total_results,
            "abnormal": abnormal_results,
            "critical": critical_results,
            "reviewed": reviewed_results
        }
    }


@app.get("/orders/stats/specialty/{specialty}")
def get_specialty_stats(specialty: str, db: Session = Depends(get_db)):
    """Get statistics for orders by specialty."""
    orders = db.query(models.LabOrder).all()

    matching_orders = []
    for order in orders:
        for order_test in order.order_tests:
            if order_test.test.specialty and specialty.lower() in order_test.test.specialty.lower():
                matching_orders.append(order)
                break

    status_breakdown = {}
    for order in matching_orders:
        status = order.status
        status_breakdown[status] = status_breakdown.get(status, 0) + 1

    return {
        "specialty": specialty,
        "total_orders": len(matching_orders),
        "by_status": status_breakdown
    }


# ============ HEALTH CHECK ============

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Check service health and database connectivity."""
    try:
        # Test database connection
        test_count = db.query(models.Test).count()
        order_count = db.query(models.LabOrder).count()

        return {
            "status": "healthy",
            "service": "lab-service",
            "version": "1.0.0",
            "database": {
                "connected": True,
                "tests": test_count,
                "orders": order_count
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "lab-service",
            "error": str(e)
        }, 503
