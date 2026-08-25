from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

import models
import schemas
from db import Base, SessionLocal, engine, get_db
from seed import seed_if_empty

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Notification Service")


@app.on_event("startup")
def on_startup() -> None:
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/notifications", response_model=list[schemas.NotificationRead])
def list_notifications(referralId: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Notification)
    if referralId is not None:
        query = query.filter(models.Notification.ReferralId == referralId)
    return query.order_by(models.Notification.Timestamp).all()


@app.post("/notifications", response_model=schemas.NotificationRead, status_code=201)
def create_notification(payload: schemas.NotificationCreate, db: Session = Depends(get_db)):
    notification = models.Notification(
        ReferralId=payload.ReferralId,
        EventType=payload.EventType.value,
        Message=payload.Message,
        Source=payload.Source,
        Timestamp=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    referral_label = f"Referral #{notification.ReferralId}" if notification.ReferralId is not None else (notification.Source or "unknown source")
    print(f"[notification] {referral_label} -> {notification.EventType}: {notification.Message}")
    return notification
