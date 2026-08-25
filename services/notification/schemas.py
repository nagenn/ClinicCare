from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EventType(str, Enum):
    submitted = "Submitted"
    accepted = "Accepted"
    rejected = "Rejected"
    completed = "Completed"
    lab_order_created = "LabOrderCreated"
    lab_result_critical = "LabResultCritical"
    lab_result_completed = "LabResultCompleted"


class NotificationBase(BaseModel):
    # Optional because not every event (e.g. lab-service events) is tied to a referral.
    ReferralId: Optional[int] = None
    EventType: EventType
    Message: str
    Source: Optional[str] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    NotificationId: int
    Timestamp: datetime
