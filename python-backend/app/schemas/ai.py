"""Typed request and response schemas for the versioned AI contract."""

from __future__ import annotations

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, Field


class ApiErrorDetail(BaseModel):
    code: str
    message: str


class ApiErrorResponse(BaseModel):
    error: ApiErrorDetail


PayloadT = TypeVar("PayloadT")


class ApiResponse(BaseModel, Generic[PayloadT]):
    data: PayloadT


class ImageRequest(BaseModel):
    image: str = Field(min_length=1, description="Base64 image or image data URL")


class FaceEncodingData(BaseModel):
    embedding: list[float] = Field(min_length=128, max_length=128)
    face_count: int = Field(ge=1)


class FaceEncodingResponse(ApiResponse[FaceEncodingData]):
    pass


class FaceCandidate(BaseModel):
    patient_id: str = Field(min_length=1)
    full_name: str = Field(min_length=1)
    embedding: list[float] = Field(min_length=128, max_length=128)


class FaceMatchRequest(ImageRequest):
    candidates: list[FaceCandidate] = Field(default_factory=list)


class FaceMatch(BaseModel):
    patient_id: str
    full_name: str
    distance: float = Field(ge=0)
    confidence: float = Field(ge=0, le=100)


class FaceMatchData(BaseModel):
    face_count: int = Field(ge=0)
    matches: list[FaceMatch] = Field(default_factory=list)
    best_match: FaceMatch | None = None


class FaceMatchResponse(ApiResponse[FaceMatchData]):
    pass


class MedicineDetection(BaseModel):
    class_name: str
    confidence: float = Field(ge=0, le=1)
    bbox: tuple[float, float, float, float]


class MedicineDetectionData(BaseModel):
    model_version: str
    detections: list[MedicineDetection] = Field(default_factory=list)
    top_detection: MedicineDetection | None = None


class MedicineDetectionResponse(ApiResponse[MedicineDetectionData]):
    pass


class ValidationPatient(BaseModel):
    id: str = Field(min_length=1)
    full_name: str = Field(min_length=1)


class ExpectedMedicine(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1)
    strength: str | None = None
    dosage_form: str | None = None


class DetectedMedicine(BaseModel):
    class_name: str | None = None
    # Existing validation logic consumes confidence on a 0-100 scale.
    confidence: float = Field(ge=0, le=100)


class MedicationValidationRequest(BaseModel):
    patient: ValidationPatient
    expected_medicine: ExpectedMedicine
    detected_medicine: DetectedMedicine
    face_confidence: float | None = Field(default=None, ge=0, le=100)
    scheduled_time: str | None = None


class MedicationValidationData(BaseModel):
    status: Literal["correct", "wrong", "unknown", "no_face"]
    reason: str
    recommendations: list[str] = Field(default_factory=list)


class MedicationValidationResponse(ApiResponse[MedicationValidationData]):
    pass
