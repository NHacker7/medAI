# SmartMedicationAI

AI-powered medication validation system for elderly healthcare.

SmartMedicationAI uses **face recognition** to identify patients, **computer vision**
(YOLOv8) to detect medicines through a webcam, and an **AI validation engine** to verify
that the correct medicine is being taken at the correct scheduled time — keeping a full,
auditable history of every event.

## Workflow

```
Login → Dashboard → Face Recognition → Patient Profile
      → Medicine Schedule → Medicine Detection → AI Validation (Correct/Wrong) → Save History
```

## Tech Stack

| Layer     | Technology                                                        |
| --------- | ---------------------------------------------------------------- |
| Frontend  | React, TypeScript, Tailwind CSS, ShadCN UI, Framer Motion        |
| Backend   | Python FastAPI (AI services) + Supabase Edge Functions (gateway) |
| Database  | Supabase (PostgreSQL) — SQLite-compatible schema design          |
| AI / CV   | OpenCV, face_recognition, dlib, YOLOv8, PyTorch                  |

## Project Structure

```
app/
  (app)/                    # Authenticated route group (app shell)
    layout.tsx              # Wraps pages in AppShell (sidebar + topbar)
    dashboard/              # Overview stats, charts, quick actions
    patients/               # Patients list
      new/                  # Add patient
      [id]/                 # Patient detail (profile + schedule + history)
        edit/               # Edit patient
    face-registration/      # Enroll a patient's face
    face-recognition/       # Identify a patient by face
    medicines/              # Medicine database CRUD
    schedule/               # Medicine schedule CRUD
    detection/              # Webcam medicine detection (YOLOv8)
    validation/             # Full AI validation workflow
    history/                # Search, filter, CSV export
    reports/                # Charts + PDF export
    settings/               # AI features, accessibility, alerts
    about/                  # About the project
  login/                    # Sign in / sign up
  layout.tsx                # Root layout (Inter font, providers)
  page.tsx                  # Redirects to /dashboard
  globals.css               # Healthcare theme tokens

components/
  layout/                   # Sidebar, topbar, app shell, page helpers
  shared/                   # WebcamCapture (reused across AI pages)
  patients/                 # PatientForm
  medicines/                # MedicineForm
  ui/                       # ShadCN UI primitives

lib/
  supabase.ts               # Supabase client singleton
  types.ts                  # Database types
  auth-context.tsx          # Auth provider + useAuth hook
  data.ts                   # Data-access layer (CRUD)
  ai-services.ts            # AI service interfaces (face, detection, validation)
  navigation.ts             # Sidebar nav config
  format.ts                 # Formatting + CSV/PDF helpers

hooks/
  use-query.ts              # Minimal data-fetching hook
  use-toast.ts              # Toast hook

supabase/
  functions/
    ai-gateway/             # Edge function proxying to the FastAI backend

docs/
  AI_INTEGRATION.md         # FastAPI route specs + integration guide
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- A Supabase project (already provisioned in this environment)

### 1. Frontend

```bash
npm install
npm run dev      # development server
npm run build    # production build
npm run typecheck
```

Environment variables are pre-populated in `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Database

The schema is applied automatically via Supabase migrations. Tables:

- `patients` — patient records + face embeddings
- `medicines` — medicine catalog
- `schedules` — per-patient scheduled doses
- `validation_history` — immutable audit trail
- `settings` — per-user preferences

All tables have **Row Level Security** enabled, scoped to the authenticated owner
(`user_id DEFAULT auth.uid()`). Each user only sees their own data.

### 3. AI Backend (optional for development)

The app is fully functional without the Python backend — the `ai-gateway` edge
function falls back to deterministic local implementations so the UI is exercisable.

To connect the real AI service, see [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md)
and set these Supabase secrets:

- `AI_BACKEND_URL` — your FastAPI base URL (e.g. `https://host/ai`)
- `AI_BACKEND_TOKEN` — bearer token for the FastAPI service

## REST API Endpoints

### Supabase (auto-generated)

| Method | Table                | Purpose            |
| ------ | -------------------- | ------------------ |
| GET    | `patients`           | List patients      |
| POST   | `patients`           | Create patient     |
| PATCH  | `patients`           | Update patient     |
| DELETE | `patients`           | Delete patient     |
| GET    | `medicines`          | List medicines     |
| POST   | `medicines`          | Create medicine    |
| ...    | `schedules`          | Schedule CRUD      |
| ...    | `validation_history` | History CRUD       |
| ...    | `settings`           | Settings upsert    |

### AI Gateway (Edge Function)

Single endpoint, action-based routing:

```
POST /functions/v1/ai-gateway
Authorization: Bearer <session-token>
{ "action": "face_register" | "face_recognize" | "medicine_detect" | "validate", ... }
```

See `docs/AI_INTEGRATION.md` for the matching FastAPI route specs.

## Deployment

The Next.js app deploys to Netlify (config in `netlify.toml`). The Supabase
database and edge function are already provisioned. For the Python AI backend,
deploy FastAPI to any container host and point the `AI_BACKEND_URL` secret at it.

## Future Integrations

The architecture is designed to scale to:

- **Caregiver alerts** — settings model already supports email/SMS toggles
- **Voice assistant** — settings flag ready
- **IoT pill dispenser** — settings flag ready
- **Mobile app** — shared Supabase API + types
- **Cloud sync** — Supabase is the single source of truth
