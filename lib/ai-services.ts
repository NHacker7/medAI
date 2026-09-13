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
async function callAI<T>(
  action: string,
  payload: Record<string, unknown>
): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke(AI_GATEWAY, {
      body: {
        action,
        ...payload,
      },
    });

    if (error) {
      throw new Error(error.message || 'AI gateway request failed');
    }

    if (!data) {
      throw new Error('AI gateway returned no data');
    }

    if (data.error) {
      const gatewayError = data.error as { message?: string } | string;
      throw new Error(
        typeof gatewayError === 'string'
          ? gatewayError
          : gatewayError.message || 'AI gateway request failed',
      );
    }

    return data as T;
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error('AI request failed');
  }
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

/** Detect medicines in a webcam frame using YOLOv8 through the AI gateway. */
export async function detectMedicine(
  imageBase64: string
): Promise<MedicineDetectionResult> {
  const result = await callAI<MedicineDetectionResult>('medicine_detect', {
    image: imageBase64,
  });

  // Keep the public frontend contract on a 0–1 scale regardless of the
  // upstream implementation or model serialization.
  const normalize = (confidence: number) =>
    confidence > 1 ? confidence / 100 : confidence;
  const detections = result.detections.map((detection) => ({
    ...detection,
    confidence: Math.max(0, Math.min(1, normalize(detection.confidence))),
  }));
  const top = result.top_detection
    ? {
        ...result.top_detection,
        confidence: Math.max(0, Math.min(1, normalize(result.top_detection.confidence))),
      }
    : null;

  return { ...result, detections, top_detection: top };
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
 */export async function validateMedication(
  input: ValidationInput
): Promise<ValidationResult> {

  // --------------------------------------------------
  // Check face confidence first
  // --------------------------------------------------

  if (
    input.face_confidence === null ||
    input.face_confidence < 50
  ) {
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

  // --------------------------------------------------
  // Check medicine detection
  // --------------------------------------------------

  if (
    !input.detected_medicine_name ||
    input.detected_confidence === null
  ) {
    return {
      status: 'unknown',
      reason: 'Medicine could not be detected.',
      recommendations: [
        'Place the medicine clearly in view of the camera',
        'Remove other objects from the frame',
        'Improve lighting conditions',
      ],
    };
  }

  // --------------------------------------------------
  // Call FastAPI validation endpoint
  // --------------------------------------------------

  const gatewayResult = await callAI<ValidationResult>('validate', {
    patient: input.patient,
    expected_medicine_name: input.expected_medicine_name,
    detected_medicine_name: input.detected_medicine_name,
    detected_confidence: input.detected_confidence,
    face_confidence: input.face_confidence,
    scheduled_time: input.scheduled_time,
  });
  return gatewayResult;
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
// ---------------------------------------------------------------------------
// Medicine Master Database Search (FastAPI)
// ---------------------------------------------------------------------------

export interface MasterMedicine {
  medicine_id: number;
  ndc_code: string | null;
  generic_name: string | null;
  brand_name: string | null;
  manufacturer: string | null;
  dosage_form: string | null;
  route: string | null;
  active_ingredients: string | null;
  marketing_category: string | null;
  product_type: string | null;
  rxcui: string | null;
  spl_set_id: string | null;
  upc: string | null;
  dailymed_title: string | null;
  published_date: string | null;
  spl_version: string | null;
  ndc_count: number | null;
  package_count: number | null;
  image_count: number | null;
  history_versions: number | null;
}

export interface MedicineSearchResult {
  success: boolean;
  count: number;
  medicines: MasterMedicine[];
}

const MEDICINE_API =
  process.env.NEXT_PUBLIC_MEDICINE_API_URL ?? 'http://127.0.0.1:8000';

/**
 * Search the 114,523 medicine master database through FastAPI.
 */
export async function searchMasterMedicines(
  query: string,
  limit = 10,
): Promise<MedicineSearchResult> {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      success: true,
      count: 0,
      medicines: [],
    };
  }

  const url = new URL(`${MEDICINE_API}/medicine/search`);
  url.searchParams.set('query', trimmed);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Medicine search failed (${res.status}): ${text || 'Unknown error'}`,
    );
  }

  return (await res.json()) as MedicineSearchResult;
}
