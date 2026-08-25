from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from db import Base, SessionLocal, engine, get_db
from seed import seed_if_empty

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Doctors Service")


@app.on_event("startup")
def on_startup() -> None:
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/doctors", response_model=list[schemas.DoctorRead])
def list_doctors(specialty: Optional[str] = None, role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Doctor)
    if specialty:
        query = query.filter(models.Doctor.Specialty == specialty)
    if role:
        query = query.filter(models.Doctor.Role == role)
    return query.order_by(models.Doctor.DoctorId).all()


@app.get("/doctors/{doctor_id}", response_model=schemas.DoctorRead)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.get(models.Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail=f"Doctor {doctor_id} not found")
    return doctor


@app.get("/doctors/{doctor_id}/exists", response_model=schemas.ExistsResponse)
def doctor_exists(doctor_id: int, db: Session = Depends(get_db)):
    exists = db.get(models.Doctor, doctor_id) is not None
    return schemas.ExistsResponse(exists=exists)


@app.post("/doctors", response_model=schemas.DoctorRead, status_code=201)
def create_doctor(payload: schemas.DoctorCreate, db: Session = Depends(get_db)):
    doctor = models.Doctor(**payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor
