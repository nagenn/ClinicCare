from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# Test Catalog Schemas
class TestBase(BaseModel):
    test_code: str
    test_name: str
    description: Optional[str] = None
    sample_type: str
    processing_time_days: int = 1
    normal_range_min: Optional[float] = None
    normal_range_max: Optional[float] = None
    unit: Optional[str] = None
    specialty: Optional[str] = None


class TestCreate(TestBase):
    pass


class TestUpdate(BaseModel):
    test_code: Optional[str] = None
    test_name: Optional[str] = None
    description: Optional[str] = None
    sample_type: Optional[str] = None
    processing_time_days: Optional[int] = None
    normal_range_min: Optional[float] = None
    normal_range_max: Optional[float] = None
    unit: Optional[str] = None
    specialty: Optional[str] = None


class TestRead(TestBase):
    model_config = ConfigDict(from_attributes=True)
    test_id: int


# Lab Order Schemas
class LabOrderBase(BaseModel):
    patient_id: int
    referral_id: Optional[int] = None
    ordered_by: int
    priority: str = "routine"
    clinical_indication: Optional[str] = None


class LabOrderCreate(LabOrderBase):
    test_ids: list[int]


class LabOrderUpdate(BaseModel):
    status: Optional[str] = None
    clinical_indication: Optional[str] = None


class LabOrderRead(LabOrderBase):
    model_config = ConfigDict(from_attributes=True)
    order_id: int
    ordered_date: datetime
    status: str


# OrderTest Schemas
class OrderTestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    order_test_id: int
    order_id: int
    test_id: int
    order_status: str
    test: TestRead


class LabOrderDetail(LabOrderRead):
    order_tests: list[OrderTestRead] = []


# Lab Sample Schemas
class LabSampleBase(BaseModel):
    sample_type: str


class LabSampleCreate(LabSampleBase):
    pass


class LabSampleRead(LabSampleBase):
    model_config = ConfigDict(from_attributes=True)
    sample_id: int
    order_id: int
    collection_date: Optional[datetime] = None
    collected_by: Optional[int] = None
    sample_label: Optional[str] = None
    status: str


class SampleCollectRequest(BaseModel):
    collected_by: Optional[int] = None


# Order Test Status Schemas
class OrderTestStatusUpdate(BaseModel):
    new_status: str
    changed_by: Optional[int] = None


class OrderTestStatusRead(BaseModel):
    order_test_id: int
    order_id: int
    test_id: int
    old_status: str
    new_status: str


# Test Result Schemas
class TestResultBase(BaseModel):
    result_value: str
    is_abnormal: bool = False
    is_critical: bool = False
    notes: Optional[str] = None


class TestResultCreate(TestResultBase):
    pass


class TestResultSubmit(BaseModel):
    result_value: str
    is_abnormal: Optional[bool] = None
    is_critical: Optional[bool] = None
    notes: Optional[str] = None
    submitted_by: Optional[int] = None


class TestResultReview(BaseModel):
    reviewed_by: int


class TestResultRead(TestResultBase):
    model_config = ConfigDict(from_attributes=True)
    result_id: int
    order_test_id: int
    result_date: datetime
    reviewed_date: Optional[datetime] = None
    reviewed_by: Optional[int] = None


# Status History Schemas
class StatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    history_id: int
    order_test_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_at: datetime
    changed_by: Optional[int] = None
