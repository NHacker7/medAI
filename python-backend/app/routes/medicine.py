from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import base64
import binascii

from app.services.medicine_detection_service import detect_medicine
from app.schemas.medicine import MedicineCreate
from app.services.medicine_service import (
    add_medicine,
    search_medicines,
    validate_medicine,
)

router = APIRouter(
    prefix="/medicine",
    tags=["Medicine"],
)


# ==========================================================
# Add Medicine
# ==========================================================

@router.post("/add")
def create_medicine(medicine: MedicineCreate):

    result = add_medicine(
        medicine.model_dump()
    )

    return {
        "success": True,
        "medicine": result,
    }


# ==========================================================
# Search Master Medicine Database
# ==========================================================

@router.get("/search")
def search_medicine(
    query: str = Query(
        ...,
        min_length=1,
        description="Medicine name, brand or active ingredient",
    ),
    limit: int = Query(
        10,
        ge=1,
        le=50,
    ),
):

    results = search_medicines(
        query=query,
        limit=limit,
    )

    return {
        "success": True,
        "count": len(results),
        "medicines": results,
    }


# ==========================================================
# Validate Medicine
# ==========================================================

@router.get("/validate")
def validate(
    medicine_name: str = Query(
        ...,
        min_length=1,
    ),
):

    result = validate_medicine(
        medicine_name
    )

    return result


# ==========================================================
# YOLO Medicine Detection
# ==========================================================

class MedicineDetectRequest(BaseModel):
    image: str


@router.post("/detect")
async def detect_medicine_route(
    request: MedicineDetectRequest
):

    try:

        # --------------------------------------------------
        # Get base64 image
        # --------------------------------------------------

        image_data = request.image

        # Handle data URLs such as:
        # data:image/jpeg;base64,/9j/4AAQ...
        if image_data.startswith("data:"):

            if "," not in image_data:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image data URL."
                )

            image_data = image_data.split(
                ",",
                1
            )[1]

        # --------------------------------------------------
        # Decode base64
        # --------------------------------------------------

        try:

            image_bytes = base64.b64decode(
                image_data,
                validate=True
            )

        except (binascii.Error, ValueError):

            raise HTTPException(
                status_code=400,
                detail="Invalid base64 image."
            )

        if not image_bytes:

            raise HTTPException(
                status_code=400,
                detail="Empty image."
            )

        # --------------------------------------------------
        # Run YOLO
        # --------------------------------------------------

        result = detect_medicine(
            image_bytes
        )

        # --------------------------------------------------
        # Return YOLO result
        # --------------------------------------------------

        return result

    except HTTPException:
        raise

    except Exception as e:

        import traceback
        traceback.print_exc()

        return {
            "success": False,
            "error": str(e)
        }