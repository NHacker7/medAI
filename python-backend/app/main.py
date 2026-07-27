from fastapi import FastAPI
from app.routes.face import router as face_router
from app.routes.patient import router as patient_router



app = FastAPI(
    title="SmartMedicationAI",
    version="1.0.0",
    description="AI-powered Face Recognition & Medication Validation System"
)
app.include_router(patient_router)
app.include_router(face_router)


@app.get("/")
def home():
    return {
        "status": "running",
        "message": "SmartMedicationAI Backend is running."
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }