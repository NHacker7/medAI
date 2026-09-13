from pydantic import BaseModel


class MedicineCreate(BaseModel):
    name: str
    generic_name: str | None = None
    category: str | None = None
    dosage_form: str | None = None
    strength: str | None = None
    manufacturer: str | None = None
    description: str | None = None
    side_effects: str | None = None
    color: str | None = None
    shape: str | None = None
    barcode: str | None = None
    image_url: str | None = None