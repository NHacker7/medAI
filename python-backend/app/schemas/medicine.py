from pydantic import BaseModel


class MedicineCreate(BaseModel):
    patient_id: str
    medicine_name: str
    dosage: str
    dosage_unit: str
    frequency: str
    intake_time: str
    before_food: bool
    instructions: str | None = None