import traceback

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.database.supabase import supabase
from app.services.face_service import generate_face_encoding

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post("/register")
async def register_patient(
    patient_id: str = Form(...),
    full_name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        image_bytes = await file.read()

        encoding = generate_face_encoding(image_bytes)

        data = {
            "patient_id": patient_id,
            "full_name": full_name,
            "age": age,
            "gender": gender,
            "face_encoding": encoding,
            "medication_schedule": []
        }

        print("Inserting into Supabase...")
        print(data)

        response = (
            supabase
            .table("patients")
            .insert(data)
            .execute()
        )

        print("Insert response:", response)

        return {
            "success": True,
            "message": "Patient registered successfully.",
            "patient": response.data
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )