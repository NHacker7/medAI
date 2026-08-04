from fastapi import APIRouter

from app.schemas.medicine import MedicineCreate
from app.services.medicine_service import add_medicine

router = APIRouter(
    prefix="/medicine",
    tags=["Medicine"]
)


@router.post("/add")
async def create_medicine(
    medicine: MedicineCreate
):

    result = add_medicine(
        medicine.model_dump()
    )

    return {
        "success": True,
        "medicine": result
    }