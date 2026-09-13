# medAI Project Status

## Project overview

SmartMedicationAI (`medAI`) is an elderly-care medication workflow application. It provides caregiver authentication, patient and medicine records, dose scheduling, face enrollment/recognition, camera-based medicine detection, validation, audit history, reporting, and settings. The intended safety workflow is:

`login -> identify patient -> scan medicine -> compare against schedule -> record validation result`.

The user-facing application is substantially built (roughly 60–70% complete), but the production AI integration is not yet coherent enough for a dependable end-to-end deployment.

## Architecture

```text
Next.js 13 browser app
  |- Supabase Auth + Postgres (direct client CRUD, RLS)
  |- Supabase Edge Function: ai-gateway (intended AI proxy/fallback)
  `- Direct FastAPI calls on NEXT_PUBLIC_MEDICINE_API_URL (current medicine/validation and one face path)

FastAPI service (python-backend/app)
  |- face_recognition + dlib + OpenCV
  |- Ultralytics YOLO detector
  |- medicine catalog/search and validation services
  `- Supabase Python client

Data/model assets
  |- Roboflow YOLO medicine-packaging dataset and trained YOLO weights
  |- Indian and DailyMed/openFDA/RxNorm medicine CSV pipeline
  |- ePillID benchmark, data, and checkpoints (not wired into FastAPI)
  `- VAIPE competition repository (not wired into FastAPI)
```

The repository is a frontend/backend split, not a monolith. The Next.js client owns most application CRUD through Supabase. FastAPI owns local CV/model inference and medicine data processing. Supabase Edge Functions were designed to conceal backend credentials and provide development fallbacks.

## Frontend

- Next.js 13.5 App Router with TypeScript, React 18, Tailwind CSS, shadcn/Radix primitives, Framer Motion, Recharts, React Hook Form, and Zod.
- Primary UI route group: `app/(app)/`, wrapped by `components/layout/app-shell.tsx`.
- Present pages: dashboard, patients (create/detail/edit), medicines, schedule, face registration, face recognition, medicine detection, validation, history, reports, settings, about, and login.
- Shared browser-camera implementation: `components/shared/webcam-capture.tsx`.
- Client data access: `lib/data.ts`; Supabase client: `lib/supabase.ts`; auth context: `lib/auth-context.tsx`; database-domain types: `lib/types.ts`.
- AI client boundary: `lib/ai-services.ts`.
- Frontend compiles under `npm run typecheck` (run during this inspection; it exited successfully). The command also emits a PowerShell access warning from the global `npm.ps1` wrapper, despite executing `tsc --noEmit` successfully.

## Backend

- FastAPI application entry point: `python-backend/app/main.py`.
- Routes registered:
  - `POST /ai/face/register` and `POST /ai/face/recognize` (`routes/face.py`)
  - `POST /patients/register` (`routes/patient.py`)
  - `POST /medicine/add`, `GET /medicine/search`, `GET /medicine/validate`, and `POST /medicine/detect` (`routes/medicine.py`)
  - `POST /validation/medicine` (`routes/validation.py`)
  - `GET /` and `GET /health`
- Services:
  - face encoding/matching (`services/face_service.py`)
  - YOLO inference (`services/medicine_detection_service.py`)
  - global/Indian medicine search and Supabase insertion (`services/medicine_service.py`)
  - name/ingredient-based validation (`services/validation_service.py`)
- Supabase is initialized at Python import time in `app/database/supabase.py`; missing `SUPABASE_URL` or `SUPABASE_KEY` prevents server startup.

## AI/ML

### Face recognition

- Implemented with OpenCV preprocessing (CLAHE), `face_recognition`, and dlib.
- Enforces exactly one detected face and produces a 128-value embedding.
- Matching uses Euclidean face distance with a strict `< 0.50` threshold.
- Embeddings are intended to be stored in `patients.face_encoding` JSONB; raw images are not intended to be retained, though the frontend currently stores the captured image data URL as `avatar_url`.

### Medicine recognition/detection

- Runtime detector: `runs/detect/train-2/weights/best.pt` loaded by Ultralytics YOLO.
- Dataset config: `python-backend/datasets/medicine_training/data.yaml` with five classes: Anarex, Atenelol, Calcium, Lozarsin, and Paracetamol.
- Dataset images observed: 1,815 training, 173 validation, and 87 test images.
- The detector returns class, 0–1 confidence, and `[x, y, width, height]` bounding boxes.
- `epillid/` and `pill-recognition-vaipe/` are separate research/competition codebases. Their training/inference tooling and ePillID checkpoints exist locally but are not called by the FastAPI service.
- `epillid_training/best_pill_embedding.pt` and `latest.pt` are approximately 336 MB each; they appear to be ePillID embeddings/checkpoints rather than current application runtime artifacts.

### Validation and medicine services

- Validation compares normalized names, allows partial matching, and can match detected names to active ingredients from the Indian medicine CSV.
- Medicine search loads DailyMed/openFDA/RxNorm-derived global data and a separate Indian medicine source at module import time.
- The ETL source is under `python-backend/datasets/scripts/`, including DailyMed retrieval/enrichment/checkpoint code and a relocated `scripts/merge/` implementation. The old `datasets/scripts/dailymed/merge.py` and package file are deleted in the working tree.

## Database and Supabase

- One core migration: `supabase/migrations/20260725042839_smartmedicationai_core_schema.sql`.
- Tables: `patients`, `medicines`, `schedules`, `validation_history`, and `settings`.
- All five tables have RLS and authenticated-owner policies, indexes, and update timestamp triggers where applicable.
- Authentication is handled by Supabase from the browser. Frontend CRUD relies on RLS and authenticated user context.
- Edge function source: `supabase/functions/ai-gateway/index.ts`. It attempts to proxy to `AI_BACKEND_URL` using `AI_BACKEND_TOKEN`, otherwise returns deterministic simulated face/detection/validation results.

## Current implemented features

- Supabase sign-in, sign-up, sign-out, and session context.
- Patient, medicine, schedule, validation-history, and settings CRUD UI/data wrappers.
- Dashboard, history/export, report, and navigation UI.
- Webcam capture for face and medicine scans.
- Face registration page wired to the Edge Function interface.
- Face-recognition page wired directly to multipart FastAPI recognition.
- Medicine-detection page wired directly to the FastAPI JSON endpoint.
- Validation wizard: identifies a patient, detects a medicine, validates against an active schedule, and saves an audit row; it falls back to local string comparison when the validation request fails.
- Local YOLO trained weights and medicine datasets are present.
- Medicine catalog search/validation backend routes and data files are present.

## Incomplete features

- A single production-ready, authenticated frontend-to-AI contract has not been implemented.
- Edge Function deployment/configuration metadata is absent (there is no function `config.toml`), and secret deployment status cannot be established from the repository.
- FastAPI authentication for `AI_BACKEND_TOKEN` is documented but not implemented.
- ePillID and VAIPE assets are not integrated into inference, evaluation, or the web app.
- There is no application test suite or backend API/contract test suite; the found Python tests are mostly utility/integration scripts.
- Python backend README is empty. No Docker Compose, backend Dockerfile, lockfile, CI workflow, or reproducible deployment recipe is present for the actual FastAPI service.
- Model evaluation metrics, data lineage/versioning, and a documented model-release process are absent.
- Safety features mentioned in the README (caregiver alerts, voice assistant, IoT dispenser) are configuration/UI scaffolding only.

## Known bugs and technical risks

### Critical integration problems

1. **AI API contracts disagree.** The Edge Function expects JSON body routes `face/register`, `face/recognize`, `medicine/detect`, and `validate`; FastAPI exposes multipart face routes, `/medicine/detect`, and `/validation/medicine`. In particular, Edge `validate` would request `/validate`, which FastAPI does not expose.
2. **Face registration cannot work through the real FastAPI path.** The frontend expects `{ encoding, face_count }` from the gateway, while FastAPI `/ai/face/register` accepts a multipart file and only returns `encoding_length`, not the embedding. The Edge Function sends JSON, so it would receive FastAPI 422 if pointed at this backend.
3. **Face recognition is split.** `face-recognition/page.tsx` calls FastAPI directly with multipart, while the validation page calls the gateway with JSON candidates. Neither is consistently aligned with the documented gateway contract.
4. **Direct browser calls bypass the planned security boundary.** Medicine detection, validation, master search, and face recognition use `NEXT_PUBLIC_MEDICINE_API_URL` (default `http://127.0.0.1:8000`), exposing backend topology and omitting backend authentication. The Edge Function comments claim JWT verification, but the source does not actually validate a Supabase JWT.

### Schema and backend problems

5. **Patient schema mismatch.** The frontend `createPatient` and FastAPI patient routes use `patient_id`; FastAPI also uses `age` and `medication_schedule`. None exists in the current Supabase migration, whose patient identity is `id` and demographic field is `date_of_birth`. Those inserts/selects will fail against the migrated schema.
6. **Python requirements are incomplete.** `requirements.txt` omits direct imports/packages required by the code: `supabase`, `pandas`, and `python-multipart` (needed by FastAPI `File`/`Form`). It also leaves `torch` and `torchvision` unpinned.
7. **The backend is fragile at startup.** Supabase is mandatory on import even for model-only endpoints; global CSV/model loads happen at import, producing slow/failing startup and preventing isolated health checks when data/configuration is missing.
8. **YOLO inference forces `device=0`.** This will fail on systems without CUDA GPU 0 instead of falling back to CPU or configured hardware.
9. **Clinical validation is heuristic.** It treats substring and loose ingredient word overlap as “correct,” has no dose/strength, dosage form, patient contraindication, timing window, drug interaction, prescription, or clinician confirmation checks. It is not sufficient for clinical decision-making.
10. **Detection classes do not align reliably with catalog/schedule naming.** The current runtime model has only five packaging classes, whereas scheduling accepts arbitrary medicine records; class names such as `Atenelol` may not match catalog spellings/names.

### Frontend, data, and operational problems

11. **Bounding-box rendering is not scaled.** The frontend overlays original pixel coordinates on a responsive `object-cover` image, so boxes will be misplaced whenever display dimensions/cropping differ from captured-image dimensions.
12. **`avatar_url` stores a data URL.** Persisting webcam Base64 in a text URL field can create large database rows and bypasses appropriate object storage/access controls.
13. **Build quality gates are weakened.** `next.config.js` sets `eslint.ignoreDuringBuilds: true`; no unit/E2E/API test command is defined in `package.json`.
14. **The worktree is already dirty.** Before this report was added, it contained modified UI/backend/ETL files, deletions in the old DailyMed merge path, and untracked model/data/research directories. These may represent valuable in-progress work; they have not been reset, deleted, pulled, or overwritten.
15. **Repository composition is heavy and difficult to reproduce.** Local virtual environments, datasets, checkpoints, run output, two nested Git repositories, and multi-hundred-MB weights are present. Ownership, licensing, and source-of-truth boundaries should be clarified before packaging/deploying.

## Dependencies

### Frontend

- Next.js 13.5.1, React 18.2, TypeScript 5.2.
- Supabase JS 2.110.8.
- Tailwind 3.3, shadcn/Radix UI, Framer Motion, React Hook Form, Zod, Recharts.
- Netlify Next.js plugin; `netlify.toml` builds with `npx next build`.

### Python backend

- Declared: FastAPI 0.116.1, Uvicorn 0.35.0, OpenCV 4.12, NumPy 2.2.6, Pydantic 2.11.7, python-dotenv, face-recognition 1.3, dlib 20, Ultralytics 8.3.173, Torch, Torchvision.
- Missing from the declared list but directly imported: Supabase Python client, pandas, and python-multipart.
- The ePillID and VAIPE directories each carry their own separate, older/research-oriented dependency requirements.

## How to run the project

### Frontend

```powershell
npm install
npm run dev
```

Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Do not commit secrets.

### Database and Edge Function

- Apply the SQL migration to the intended Supabase project.
- Deploy `supabase/functions/ai-gateway/index.ts` and set `AI_BACKEND_URL` / `AI_BACKEND_TOKEN` only after the API contract is reconciled.

### FastAPI (current state)

```powershell
cd python-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

This is not yet sufficient for a clean machine: add the missing Python dependencies, configure `SUPABASE_URL`/`SUPABASE_KEY`, ensure the YOLO weights/datasets exist at their hard-coded relative paths, and use a compatible CUDA GPU or change the detector configuration.

## How to test

```powershell
# Frontend static types
npm run typecheck

# Frontend lint command advertised by package.json
npm run lint
```

`npm run typecheck` passed during the inspection. No dedicated frontend unit/E2E test command, Python test runner configuration, contract test suite, or reliable backend test command is currently defined. Existing Python files named `test_*.py` include Supabase connectivity checks, DailyMed helper tests, an ePillID test, and a local YOLO smoke script; they need documented environments/fixtures before they can be treated as a project test suite.

## Priority-ordered remaining work

1. Reconcile and version the frontend/Edge Function/FastAPI API contract; pick one gateway path and implement matching request types, response types, authentication, errors, and contract tests.
2. Reconcile Supabase schema with all frontend and FastAPI patient fields; add a forward migration rather than changing or resetting existing data.
3. Make FastAPI reproducible: complete/pin dependencies, defer optional startup dependencies, add environment templates, health/readiness checks, CPU/GPU configuration, and a container/deployment recipe.
4. Add automated tests: frontend unit tests, FastAPI route/service tests, API contract tests, database/RLS tests, and model smoke/evaluation tests.
5. Harden clinical logic: require explicit medicine identity/strength/form and schedule timing, maintain auditable decision inputs, avoid unsafe fuzzy-positive matches, and establish clinician review/safety policy.
6. Integrate model output with the catalog deliberately: map trained class IDs to catalog IDs/aliases, record model version/thresholds, and expose confidence/unknown outcomes consistently.
7. Move images to protected object storage, keep only references, and define biometric consent, retention, access-control, and incident handling practices.
8. Decide whether ePillID and VAIPE are active product dependencies or research assets; isolate/remove from deployment packaging only after confirming ownership and reproducibility needs.
9. Restore build/lint quality gates, add CI, document deployment, and define which model/data outputs belong in version control or artifact storage.

## Recommended next steps

First approve a narrow integration plan: make the Edge Function the sole browser-facing AI entry point, then adapt FastAPI to its documented JSON contract (or explicitly revise the contract and client together). In the same change set, introduce a non-destructive schema migration for the patient mismatch and add a minimal end-to-end contract test using a stubbed model response. Do not broaden model training or refactor the existing UI until that vertical slice is demonstrably reliable.
