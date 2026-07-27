from fastapi import APIRouter, UploadFile, File
import face_recognition
import cv2
import numpy as np
import traceback

router = APIRouter(prefix="/ai/face", tags=["Face Recognition"])


@router.post("/register")
async def register_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        nparr = np.frombuffer(contents, np.uint8)

        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return {"error": "Could not decode image"}

        print("Shape:", image.shape)
        print("Dtype:", image.dtype)

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        print("RGB Shape:", rgb.shape)
        print("RGB Dtype:", rgb.dtype)

        encodings = face_recognition.face_encodings(rgb)

        return {
            "success": True,
            "encoding_length": len(encodings[0])
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }