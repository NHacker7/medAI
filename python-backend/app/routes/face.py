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


# ==========================================================
# FACE REGISTRATION
# ==========================================================

@router.post("/register")
async def register_face(
    file: UploadFile = File(...)
):

    try:

        # Read uploaded image
        image_bytes = await file.read()

        # Generate face encoding
        encoding = generate_face_encoding(
            image_bytes
        )

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


# ==========================================================
# FACE RECOGNITION
# ==========================================================

@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...)
):

    try:

        # --------------------------------------------------
        # 1. Read uploaded image
        # --------------------------------------------------

        image_bytes = await file.read()


        # --------------------------------------------------
        # 2. Generate uploaded face encoding
        # --------------------------------------------------

        uploaded_encoding = generate_face_encoding(
            image_bytes
        )


        # --------------------------------------------------
        # 3. Get registered patients
        # --------------------------------------------------

        patients = (
            supabase
            .table("patients")
            .select(
                "patient_id, full_name, age, gender, face_encoding"
            )
            .execute()
        )


        # --------------------------------------------------
        # 4. Compare with every registered patient
        # --------------------------------------------------

        best_patient = None
        best_distance = 999.0


        for patient in patients.data or []:

            stored_encoding = patient.get(
                "face_encoding"
            )


            # Skip patients without registered faces
            if not stored_encoding:
                continue


            match, distance = compare_face(
                uploaded_encoding,
                stored_encoding
            )


            # Keep the closest matching patient
            if match and distance < best_distance:

                best_distance = distance
                best_patient = patient


        # --------------------------------------------------
        # 5. Matching patient found
        # --------------------------------------------------

        if best_patient:

            # Distance -> display score
            confidence = max(
                0.0,
                min(
                    100.0,
                    (1.0 - best_distance) * 100
                )
            )


            return {
                "success": True,

                "patient": {
                    "patient_id": best_patient["patient_id"],
                    "full_name": best_patient["full_name"],
                    "age": best_patient.get("age"),
                    "gender": best_patient.get("gender")
                },

                "distance": round(
                    best_distance,
                    4
                ),

                "confidence": round(
                    confidence,
                    2
                )
            }


        # --------------------------------------------------
        # 6. No matching patient
        # --------------------------------------------------

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