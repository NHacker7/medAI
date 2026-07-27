from pydantic import BaseModel

class PatientCreate(BaseModel):
    patient_id: str
    full_name: str
    age: int
    gender: str