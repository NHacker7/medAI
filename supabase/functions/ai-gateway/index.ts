// AI Gateway Edge Function
//
// Proxies AI requests from the web app to the Python FastAPI backend
// (OpenCV / face_recognition / dlib / YOLOv8 / PyTorch). The browser never
// talks to the AI server directly — secrets stay server-side.
//
// Set these secrets in the Supabase project:
//   AI_BACKEND_URL   e.g. https://your-fastapi-host
//   AI_BACKEND_TOKEN  bearer token for the FastAPI service
//   AI_GATEWAY_ALLOW_DEVELOPMENT_FALLBACK=true only for local/demo development
//
// When the backend is not yet deployed, the function falls back to a
// deterministic local implementation so the app remains fully functional
// during development. See docs/AI_INTEGRATION.md for the FastAPI route specs.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BACKEND_URL = Deno.env.get("AI_BACKEND_URL") ?? "";
const BACKEND_TOKEN = Deno.env.get("AI_BACKEND_TOKEN") ?? "";
const ALLOW_DEVELOPMENT_FALLBACK =
  Deno.env.get("AI_GATEWAY_ALLOW_DEVELOPMENT_FALLBACK") === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

interface DetectedMedicine {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST requests are supported.", 405);
  }

  const authenticated = await authenticateCaller(req);
  if (!authenticated) {
    return errorResponse("unauthorized", "Authentication is required.", 401);
  }

  try {
    const body = await req.json();
    const action: string | undefined = body.action;
    const image: string | undefined = body.image;

    switch (action) {
      case "face_register":
        return await handleAction("/api/v1/ai/face-encodings", { image }, () =>
          fallbackFaceRegister(image), mapFaceRegistration);
      case "face_recognize":
        return await handleAction("/api/v1/ai/face-matches", {
          image,
          candidates: normalizeFaceCandidates(body.candidates),
        }, () => fallbackFaceRecognize(body.candidates), mapFaceRecognition);
      case "medicine_detect":
        return await handleAction("/api/v1/ai/medicine-detections", { image }, () =>
          fallbackMedicineDetect(image), mapMedicineDetection);
      case "validate":
        return await handleAction("/api/v1/ai/medication-validations", normalizeValidationRequest(body), () =>
          fallbackValidate(body), mapValidation);
      default:
        return errorResponse("unknown_action", "The requested AI action is not supported.", 400);
    }
  } catch (err) {
    // Do not reflect request contents, tokens, or upstream error bodies.
    return errorResponse("invalid_request", "The AI request could not be processed.", 400);
  }
});

async function authenticateCaller(req: Request): Promise<boolean> {
  const authorization = req.headers.get("Authorization");
  if (!authorization || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
}

async function handleAction(
  path: string,
  body: Record<string, unknown>,
  fallback: () => Promise<Response>,
  mapResponse: (data: Record<string, unknown>) => unknown,
): Promise<Response> {
  if (!BACKEND_URL || !BACKEND_TOKEN) {
    return fallbackOrUnavailable(fallback);
  }

  try {
    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BACKEND_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return errorResponse("ai_backend_request_failed", "The AI service could not complete the request.", 502);
    }
    const upstream = await res.json() as Record<string, unknown>;
    return json(mapResponse(upstream));
  } catch {
    return fallbackOrUnavailable(fallback);
  }
}

async function fallbackOrUnavailable(fallback: () => Promise<Response>): Promise<Response> {
  if (ALLOW_DEVELOPMENT_FALLBACK) return await fallback();
  return errorResponse("ai_backend_unavailable", "The AI service is currently unavailable.", 503);
}

function normalizeFaceCandidates(candidates: unknown): unknown[] {
  if (!Array.isArray(candidates)) return [];
  return candidates.map((candidate) => {
    const item = candidate as Record<string, unknown>;
    return {
      patient_id: item.patient_id,
      full_name: item.full_name,
      embedding: item.encoding,
    };
  });
}

function normalizeValidationRequest(body: Record<string, unknown>): Record<string, unknown> {
  const patient = body.patient as Record<string, unknown> | undefined;
  return {
    patient: {
      id: patient?.id,
      full_name: patient?.full_name,
    },
    expected_medicine: {
      name: body.expected_medicine_name,
    },
    detected_medicine: {
      class_name: body.detected_medicine_name,
      confidence: body.detected_confidence,
    },
    face_confidence: body.face_confidence,
    scheduled_time: body.scheduled_time,
  };
}

function upstreamData(upstream: Record<string, unknown>): Record<string, unknown> {
  const data = upstream.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid upstream response");
  }
  return data as Record<string, unknown>;
}

function mapFaceRegistration(upstream: Record<string, unknown>) {
  const data = upstreamData(upstream);
  return { success: true, encoding: data.embedding, face_count: data.face_count };
}

function mapFaceRecognition(upstream: Record<string, unknown>) {
  const data = upstreamData(upstream);
  return { success: true, ...data };
}

function mapMedicineDetection(upstream: Record<string, unknown>) {
  const data = upstreamData(upstream);
  return { success: true, detections: data.detections, top_detection: data.top_detection };
}

function mapValidation(upstream: Record<string, unknown>) {
  return upstreamData(upstream);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

// ---------------------------------------------------------------------------
// Fallbacks (deterministic, no real model) — used until the FastAPI backend
// is wired up. They return plausible shapes so the UI is fully exercisable.
// ---------------------------------------------------------------------------

function decodeImageSize(b64: string): { width: number; height: number } | null {
  try {
    const clean = b64.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    if (bytes.length < 24) return null;
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let i = 2;
      while (i < bytes.length) {
        if (bytes[i] !== 0xff) { i++; continue; }
        const marker = bytes[i + 1];
        const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
          const h = (bytes[i + 5] << 8) | bytes[i + 6];
          const w = (bytes[i + 7] << 8) | bytes[i + 8];
          return { width: w, height: h };
        }
        i += 2 + segLen;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fallbackFaceRegister(image: string | undefined): Promise<Response> {
  if (!image) return json({ success: false, encoding: [], face_count: 0, message: "No image provided" }, 400);
  // Deterministic pseudo-embedding from the image bytes.
  const seed = hashString(image.slice(0, 1024));
  const encoding = Array.from({ length: 128 }, (_, i) =>
    Math.sin(seed * (i + 1) * 0.0001) * 0.5,
  );
  return json({ success: true, encoding, face_count: 1 });
}

async function fallbackFaceRecognize(
  candidates: { patient_id: string; full_name: string; encoding: number[] }[] | undefined,
): Promise<Response> {
  if (!candidates || candidates.length === 0) {
    return json({ success: true, face_count: 0, matches: [], best_match: null });
  }
  // Pick the first candidate as the best match with a high confidence.
  const best = candidates[0];
  const confidence = 92 + (hashString(best.patient_id) % 7);
  return json({
    success: true,
    face_count: 1,
    matches: candidates.map((c) => ({
      patient_id: c.patient_id,
      full_name: c.full_name,
      distance: 0.35,
      confidence,
    })),
    best_match: {
      patient_id: best.patient_id,
      full_name: best.full_name,
      distance: 0.32,
      confidence,
    },
  });
}

async function fallbackMedicineDetect(image: string | undefined): Promise<Response> {
  if (!image) return json({ success: false, detections: [], top_detection: null, message: "No image" }, 400);
  const size = decodeImageSize(image);
  const w = size?.width ?? 640;
  const h = size?.height ?? 480;
  // Deterministic pseudo-class from the image.
  const classes = ["paracetamol", "amoxicillin", "metformin", "lisinopril", "atorvastatin"];
  const idx = hashString(image.slice(0, 512)) % classes.length;
  const confidence = 0.78 + (hashString(image.slice(512, 1024)) % 20) / 100;
  const det: DetectedMedicine = {
    class_name: classes[idx],
    confidence,
    bbox: [w * 0.2, h * 0.25, w * 0.6, h * 0.5],
  };
  return json({ success: true, detections: [det], top_detection: det });
}

async function fallbackValidate(body: Record<string, unknown>): Promise<Response> {
  const detected = body.detected_medicine_name as string | null;
  const expected = body.expected_medicine_name as string | null;
  const faceConf = body.face_confidence as number | null;
  const detConf = body.detected_confidence as number | null;

  if (faceConf === null || faceConf < 50) {
    return json({
      status: "no_face",
      reason: "Face could not be verified with sufficient confidence.",
      recommendations: ["Reposition the patient", "Improve lighting", "Register the face if needed"],
    });
  }
  if (!detected || detConf === null || detConf < 50) {
    return json({
      status: "unknown",
      reason: "Medicine could not be detected with sufficient confidence.",
      recommendations: ["Place medicine clearly in view", "Remove other objects", "Improve lighting"],
    });
  }
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (expected && (norm(detected) === norm(expected) || norm(detected).includes(norm(expected)) || norm(expected).includes(norm(detected)))) {
    return json({
      status: "correct",
      reason: "The detected medicine matches the scheduled medicine.",
      recommendations: ["Proceed with administration."],
    });
  }
  return json({
    status: "wrong",
    reason: `Detected "${detected}" but the schedule expects "${expected ?? "—"}".`,
    recommendations: ["Do NOT administer — confirm with the physician", "Re-scan the medicine", "Check the schedule"],
  });
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
