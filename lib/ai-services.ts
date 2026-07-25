// AI service interfaces — clearly defined integration points for the Python
// FastAPI backend (OpenCV / face_recognition / dlib / YOLOv8 / PyTorch).
//
// In production these call the FastAPI service via the AI gateway edge
// function. The edge function proxies the request to the Python backend so
// the browser never talks to the AI server directly (secrets stay server-side).
//
// Each interface is typed so the frontend and backend share a contract.
// See `docs/AI_INTEGRATION.md` for the matching FastAPI route specs.

import { supabase } from '@/lib/supabase';
import type { Patient, ValidationStatus } from '@/lib/types';

const AI_GATEWAY = 'ai-gateway'; // edge function slug

async function callAI<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? '';
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${AI_GATEWAY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}

// ---------------------------------------------------------------------------
// Face Recognition (face_recognition + dlib)
// ---------------------------------------------------------------------------

export interface FaceEncodingResult {
  success: boolean;
  encoding: number[]; // 128-d embedding
  face_count: number;
  message?: string;
}

export interface FaceMatch {
  patient_id: string;
  full_name: string;
  distance: number; // lower = better
  confidence: number; // 0-100
}

export interface FaceRecognitionResult {
  success: boolean;
  face_count: number;
  matches: FaceMatch[];
  best_match: FaceMatch | null;
  message?: string;
}

/** Register a face: capture from webcam, send image, receive 128-d embedding. */
export async function registerFace(imageBase64: string): Promise<FaceEncodingResult> {
  return callAI<FaceEncodingResult>('face_register', { image: imageBase64 });
}

/** Recognize a face against registered patients. */
export async function recognizeFace(
  imageBase64: string,
  candidates: { patient_id: string; full_name: string; encoding: number[] }[],
): Promise<FaceRecognitionResult> {
  return callAI<FaceRecognitionResult>('face_recognize', {
    image: imageBase64,
    candidates,
  });
}

// ---------------------------------------------------------------------------
// Medicine Detection (YOLOv8 + PyTorch)
// ---------------------------------------------------------------------------

export interface DetectedMedicine {
  class_name: string;
  confidence: number; // 0-1
  bbox: [number, number, number, number]; // x, y, w, h
}

export interface MedicineDetectionResult {
  success: boolean;
  detections: DetectedMedicine[];
  top_detection: DetectedMedicine | null;
  message?: string;
}

/** Detect medicines in a webcam frame using YOLOv8. */
export async function detectMedicine(imageBase64: string): Promise<MedicineDetectionResult> {
  return callAI<MedicineDetectionResult>('medicine_detect', { image: imageBase64 });
}

// ---------------------------------------------------------------------------
// AI Validation Logic
// ---------------------------------------------------------------------------

export interface ValidationInput {
  patient: Pick<Patient, 'id' | 'full_name'>;
  expected_medicine_name: string;
  detected_medicine_name: string | null;
  detected_confidence: number | null;
  face_confidence: number | null;
  scheduled_time: string | null;
}

export interface ValidationResult {
  status: ValidationStatus;
  reason: string;
  recommendations: string[];
}

/**
 * Validate that the detected medicine matches the expected medicine for the
 * current schedule slot. Runs a deterministic ruleset locally AND is mirrored
 * on the backend for audit. The edge function can be extended to call a richer
 * inference model later.
 */
export async function validateMedication(input: ValidationInput): Promise<ValidationResult> {
  return callAI<ValidationResult>('validate', input as unknown as Record<string, unknown>);
}

/** Local fallback validation (used when the AI gateway is unavailable). */
export function validateMedicationLocal(input: ValidationInput): ValidationResult {
  const { detected_medicine_name, expected_medicine_name, face_confidence, detected_confidence } =
    input;

  if (face_confidence === null || face_confidence < 50) {
    return {
      status: 'no_face',
      reason: 'Face could not be verified with sufficient confidence.',
      recommendations: [
        'Reposition the patient in front of the camera',
        'Ensure good lighting on the face',
        'Register the patient face if not yet enrolled',
      ],
    };
  }

  if (!detected_medicine_name || detected_confidence === null || detected_confidence < 50) {
    return {
      status: 'unknown',
      reason: 'Medicine could not be detected with sufficient confidence.',
      recommendations: [
        'Place the medicine clearly in view of the camera',
        'Remove other objects from the frame',
        'Improve lighting conditions',
      ],
    };
  }

  const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = normalize(detected_medicine_name);
  const b = normalize(expected_medicine_name);
  if (!a || !b) {
    return {
      status: 'unknown',
      reason: 'Missing expected or detected medicine name.',
      recommendations: ['Verify the schedule entry has a valid medicine assigned.'],
    };
  }
  if (a === b || a.includes(b) || b.includes(a)) {
    return {
      status: 'correct',
      reason: 'The detected medicine matches the scheduled medicine.',
      recommendations: ['Proceed with administration.'],
    };
  }
  return {
    status: 'wrong',
    reason: `Detected "${detected_medicine_name}" but the schedule expects "${expected_medicine_name}".`,
    recommendations: [
      'Do NOT administer — confirm with the prescribing physician',
      'Re-scan the medicine to rule out a detection error',
      'Check whether the schedule was recently updated',
    ],
  };
}
