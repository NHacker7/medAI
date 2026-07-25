# AI Integration Guide

This document describes the contract between the SmartMedicationAI web app and the
Python FastAPI backend that runs the AI models (OpenCV, face_recognition, dlib,
YOLOv8, PyTorch).

## Architecture

```
Browser ──▶ Supabase Edge Function (ai-gateway) ──▶ Python FastAPI ──▶ Models
              • auth (JWT)                            • face_recognition
              • CORS                                  • dlib
              • secret injection                       • YOLOv8
              • fallback if backend down               • PyTorch
```

The browser never calls the FastAPI service directly. All AI requests go through
the `ai-gateway` edge function, which:

1. Verifies the user's Supabase JWT.
2. Forwards the request to `AI_BACKEND_URL` with `AI_BACKEND_TOKEN`.
3. Returns the backend response, or a deterministic fallback if the backend is
   unreachable (so the app stays functional during development).

## Edge Function Actions

All actions are POST requests to `/functions/v1/ai-gateway` with a JSON body
containing an `action` field.

### `face_register`

Compute a 128-d face embedding from a webcam image.

**Request**
```json
{ "action": "face_register", "image": "<base64 JPEG>" }
```

**Response**
```json
{
  "success": true,
  "encoding": [0.12, -0.34, ...],   // 128 floats
  "face_count": 1,
  "message": null
}
```

The frontend stores `encoding` in `patients.face_encoding` (jsonb) and sets
`face_registered = true`.

### `face_recognize`

Match a webcam image against enrolled patient embeddings.

**Request**
```json
{
  "action": "face_recognize",
  "image": "<base64 JPEG>",
  "candidates": [
    { "patient_id": "uuid", "full_name": "Jane Doe", "encoding": [0.12, ...] }
  ]
}
```

**Response**
```json
{
  "success": true,
  "face_count": 1,
  "matches": [
    { "patient_id": "uuid", "full_name": "Jane Doe", "distance": 0.32, "confidence": 94.5 }
  ],
  "best_match": { "patient_id": "uuid", "full_name": "Jane Doe", "distance": 0.32, "confidence": 94.5 }
}
```

`distance` is the Euclidean distance (lower = better, face_recognition default
tolerance is 0.6). `confidence` is a 0–100 score derived from the distance.

### `medicine_detect`

Run YOLOv8 object detection on a webcam frame.

**Request**
```json
{ "action": "medicine_detect", "image": "<base64 JPEG>" }
```

**Response**
```json
{
  "success": true,
  "detections": [
    { "class_name": "paracetamol", "confidence": 0.91, "bbox": [120, 80, 380, 240] }
  ],
  "top_detection": { "class_name": "paracetamol", "confidence": 0.91, "bbox": [...] }
}
```

`bbox` is `[x, y, width, height]` in pixels. `confidence` is 0–1.

### `validate`

Run the AI validation ruleset.

**Request**
```json
{
  "action": "validate",
  "patient": { "id": "uuid", "full_name": "Jane Doe" },
  "expected_medicine_name": "Paracetamol",
  "detected_medicine_name": "paracetamol",
  "detected_confidence": 91.2,
  "face_confidence": 94.5,
  "scheduled_time": "08:00"
}
```

**Response**
```json
{
  "status": "correct",          // correct | wrong | unknown | no_face
  "reason": "The detected medicine matches the scheduled medicine.",
  "recommendations": ["Proceed with administration."]
}
```

## FastAPI Route Specs

The FastAPI backend should expose these routes (the edge function appends the
action path to `AI_BACKEND_URL`):

| Action           | FastAPI Route        | Method |
| ---------------- | -------------------- | ------ |
| `face_register`  | `/ai/face/register`  | POST   |
| `face_recognize` | `/ai/face/recognize` | POST   |
| `medicine_detect`| `/ai/medicine/detect`| POST   |
| `validate`       | `/ai/validate`       | POST   |

### Example FastAPI skeleton

```python
# main.py
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import base64, io
import cv2
import face_recognition
import numpy as np
# from ultralytics import YOLO  # YOLOv8

app = FastAPI()

def decode_image(b64: str) -> np.ndarray:
    raw = base64.b64decode(b64.split(",")[-1])
    arr = np.frombuffer(raw, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

class ImageRequest(BaseModel):
    image: str

@app.post("/ai/face/register")
def face_register(req: ImageRequest):
    img = decode_image(req.image)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    encs = face_recognition.face_encodings(rgb)
    if not encs:
        return {"success": False, "encoding": [], "face_count": 0, "message": "No face found"}
    return {"success": True, "encoding": encs[0].tolist(), "face_count": len(encs)}

# ... implement /ai/face/recognize, /ai/medicine/detect, /ai/validate similarly
```

### Running the FastAPI backend

```bash
pip install fastapi uvicorn opencv-python face_recognition numpy pydantic ultralytics torch
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Configuring the Edge Function

Set these Supabase secrets (via the Supabase dashboard or CLI):

```
AI_BACKEND_URL=https://your-host/ai
AI_BACKEND_TOKEN=<bearer-token>
```

Until these are set, the edge function uses deterministic fallbacks so the web app
remains fully functional for development and demos.

## Security

- The edge function verifies the Supabase JWT (`verify_jwt: true`).
- The FastAPI backend should validate the `AI_BACKEND_TOKEN` bearer header.
- Face embeddings are stored in the database; raw images are not persisted.
- All database tables use row-level security scoped to the authenticated owner.
