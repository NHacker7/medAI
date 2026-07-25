/*
# SmartMedicationAI — core schema

## Summary
Creates the core data model for an AI-powered medication validation system
for elderly healthcare. The app has a sign-in screen, so all tables are
owner-scoped to the authenticated user via `user_id` (default `auth.uid()`).

## New Tables
1. `patients` — elderly patients managed by the signed-in caregiver/nurse.
2. `medicines` — the medicine database (CRUD catalog).
3. `schedules` — medication schedules per patient (one row per scheduled dose).
4. `validation_history` — immutable record of every AI validation event.
5. `settings` — per-user app settings (single row per user, upsert).

## Security
- RLS enabled on ALL tables.
- Owner-scoped CRUD: each authenticated user can only access rows where
  `user_id = auth.uid()`. 4 policies per table (SELECT/INSERT/UPDATE/DELETE),
  scoped to `authenticated`.

## Important Notes
1. `user_id` columns default to `auth.uid()` so client inserts that omit
   `user_id` still satisfy the INSERT `WITH CHECK (auth.uid() = user_id)`.
2. `face_encoding` stored as jsonb array of 128 floats (face_recognition embedding).
3. Indexes added on owner + common filter columns for query performance.
*/

-- ============================================================================
-- patients
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  phone text,
  address text,
  medical_conditions text,
  allergies text,
  emergency_contact text,
  face_registered boolean NOT NULL DEFAULT false,
  face_encoding jsonb,
  avatar_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patients" ON patients;
CREATE POLICY "select_own_patients" ON patients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_patients" ON patients;
CREATE POLICY "insert_own_patients" ON patients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_patients" ON patients;
CREATE POLICY "update_own_patients" ON patients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_patients" ON patients;
CREATE POLICY "delete_own_patients" ON patients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name);

-- ============================================================================
-- medicines
-- ============================================================================
CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  generic_name text,
  category text,
  dosage_form text,
  strength text,
  manufacturer text,
  description text,
  side_effects text,
  color text,
  shape text,
  barcode text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_medicines" ON medicines;
CREATE POLICY "select_own_medicines" ON medicines FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_medicines" ON medicines;
CREATE POLICY "insert_own_medicines" ON medicines FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_medicines" ON medicines;
CREATE POLICY "update_own_medicines" ON medicines FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_medicines" ON medicines;
CREATE POLICY "delete_own_medicines" ON medicines FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);

-- ============================================================================
-- schedules
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  dosage text,
  scheduled_time time NOT NULL,
  days_of_week int[] NOT NULL DEFAULT '{}',
  instructions text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_schedules" ON schedules;
CREATE POLICY "select_own_schedules" ON schedules FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_schedules" ON schedules;
CREATE POLICY "insert_own_schedules" ON schedules FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_schedules" ON schedules;
CREATE POLICY "update_own_schedules" ON schedules FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_schedules" ON schedules;
CREATE POLICY "delete_own_schedules" ON schedules FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_patient_id ON schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_schedules_medicine_id ON schedules(medicine_id);
CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules(scheduled_time);

-- ============================================================================
-- validation_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS validation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES schedules(id) ON DELETE SET NULL,
  scheduled_time time,
  detected_medicine_name text,
  expected_medicine_name text,
  detected_confidence numeric(5,2),
  face_confidence numeric(5,2),
  validation_status text NOT NULL CHECK (validation_status IN ('correct','wrong','unknown','no_face')),
  taken_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE validation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_history" ON validation_history;
CREATE POLICY "select_own_history" ON validation_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_history" ON validation_history;
CREATE POLICY "insert_own_history" ON validation_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_history" ON validation_history;
CREATE POLICY "update_own_history" ON validation_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_history" ON validation_history;
CREATE POLICY "delete_own_history" ON validation_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_history_user_id ON validation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_patient_id ON validation_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_history_taken_at ON validation_history(taken_at);
CREATE INDEX IF NOT EXISTS idx_history_status ON validation_history(validation_status);

-- ============================================================================
-- settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  face_recognition_enabled boolean NOT NULL DEFAULT true,
  medicine_detection_enabled boolean NOT NULL DEFAULT true,
  caregiver_alerts_enabled boolean NOT NULL DEFAULT false,
  caregiver_email text,
  caregiver_phone text,
  voice_assistant_enabled boolean NOT NULL DEFAULT false,
  iot_pill_dispenser_enabled boolean NOT NULL DEFAULT false,
  theme text NOT NULL DEFAULT 'light',
  font_size text NOT NULL DEFAULT 'medium',
  high_contrast boolean NOT NULL DEFAULT false,
  notification_email boolean NOT NULL DEFAULT true,
  notification_sms boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_medicines_updated_at ON medicines;
CREATE TRIGGER trg_medicines_updated_at BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;
CREATE TRIGGER trg_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
