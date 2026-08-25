from sqlalchemy.orm import Session

from models import Doctor

SEED_DOCTORS = [
    dict(Name="Dr. Ananya Krishnan", Specialty="Cardiology", Department="Cardiology", ContactInfo="a.krishnan@cliniccare.example", Role="physician"),
    dict(Name="Dr. Vikram Reddy", Specialty="Orthopedics", Department="Orthopedics", ContactInfo="v.reddy@cliniccare.example", Role="physician"),
    dict(Name="Dr. Meera Nair", Specialty="Dermatology", Department="Dermatology", ContactInfo="m.nair@cliniccare.example", Role="physician"),
    dict(Name="Dr. Arjun Malhotra", Specialty="Neurology", Department="Neurology", ContactInfo="a.malhotra@cliniccare.example", Role="physician"),
    dict(Name="Dr. Priya Iyer", Specialty="Endocrinology", Department="Endocrinology", ContactInfo="p.iyer@cliniccare.example", Role="physician"),
    dict(Name="Dr. Rohan Sharma", Specialty="Family Medicine", Department="Primary Care", ContactInfo="r.sharma@cliniccare.example", Role="physician"),
    dict(Name="Dr. Kavita Desai", Specialty="Gastroenterology", Department="Gastroenterology", ContactInfo="k.desai@cliniccare.example", Role="physician"),
    dict(Name="Sanjay Kulkarni", Specialty="Laboratory", Department="Lab Services", ContactInfo="s.kulkarni@cliniccare.example", Role="lab_technician"),
    dict(Name="Divya Menon", Specialty="Laboratory", Department="Lab Services", ContactInfo="d.menon@cliniccare.example", Role="lab_technician"),
    dict(Name="Farhan Sheikh", Specialty="Laboratory", Department="Lab Services", ContactInfo="f.sheikh@cliniccare.example", Role="lab_technician"),
]


def seed_if_empty(db: Session) -> None:
    if db.query(Doctor).count() > 0:
        return
    for row in SEED_DOCTORS:
        db.add(Doctor(**row))
    db.commit()
