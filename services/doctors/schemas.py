from pydantic import BaseModel, ConfigDict


class DoctorBase(BaseModel):
    Name: str
    Specialty: str
    Department: str
    ContactInfo: str
    Role: str = "physician"


class DoctorCreate(DoctorBase):
    pass


class DoctorRead(DoctorBase):
    model_config = ConfigDict(from_attributes=True)

    DoctorId: int


class ExistsResponse(BaseModel):
    exists: bool
