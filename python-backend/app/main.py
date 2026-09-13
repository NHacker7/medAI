from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.security import ApiContractError
from app.routes.ai import router as ai_router
from app.routes.face import router as face_router
from app.routes.patient import router as patient_router
from app.routes.medicine import router as medicine_router
from app.routes.validation import router as validation_router

app = FastAPI(
    title="SmartMedicationAI",
    version="1.0.0",
    description="AI-powered Face Recognition & Medication Validation System"
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# ROUTES
# ==========================================================

app.include_router(patient_router)
app.include_router(face_router)
app.include_router(medicine_router)
app.include_router(validation_router)
app.include_router(ai_router)


@app.exception_handler(ApiContractError)
async def ai_contract_error_handler(
    _request: Request,
    exc: ApiContractError,
):
    """Return stable, non-sensitive errors for versioned AI endpoints."""

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )

# ==========================================================
# HOME
# ==========================================================

@app.get("/")
def home():
    return {
        "status": "running",
        "message": "SmartMedicationAI Backend is running."
    }


# ==========================================================
# HEALTH
# ==========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
