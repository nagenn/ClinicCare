from sqlalchemy import Column, Integer, String

from db import Base


class Doctor(Base):
    __tablename__ = "doctors"

    DoctorId = Column(Integer, primary_key=True, index=True)
    Name = Column(String, nullable=False)
    Specialty = Column(String, nullable=False, index=True)
    Department = Column(String, nullable=False)
    ContactInfo = Column(String, nullable=False)
    Role = Column(String, nullable=False, default="physician", server_default="physician")
