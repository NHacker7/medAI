from fastapi import APIRouter, UploadFile, File
import traceback

from app.database.supabase import supabase
from app.services.face_service import (
    generate_face_encoding,
    compare_face
)

router = APIRouter(
    prefix="/ai/face",
    tags=["Face Recognition"]
)


@router.post("/register")
async def register_face(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        encoding = generate_face_encoding(image_bytes)

        return {
            "success": True,
            "encoding_length": len(encoding)
        }

    except Exception as e:
        traceback.print_exc()

        return {
            "success": False,
            "error": str(e)
        }


@router.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        uploaded_encoding = generate_face_encoding(image_bytes)

        patients = (
            supabase
            .table("patients")
            .select("*")
            .execute()
        )

        best_patient = None
        best_distance = 999

        for patient in patients.data:

            match, distance = compare_face(
                uploaded_encoding,
                patient["face_encoding"]
            )

            if match and distance < best_distance:
                best_distance = distance
                best_patient = patient

        if best_patient:

            return {
                "success": True,
                "patient": {
                    "patient_id": best_patient["patient_id"],
                    "full_name": best_patient["full_name"],
                    "age": best_patient["age"],
                    "gender": best_patient["gender"]
                },
                "distance": round(best_distance, 4),
                "confidence": round((1 - best_distance) * 100, 2)
            }

        return {
            "success": False,
            "message": "Unknown patient"
        }

    except Exception as e:
        traceback.print_exc()

        return {
            "success": False,
            "error": str(e)
        }