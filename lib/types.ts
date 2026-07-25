// Database types — mirrors the Supabase schema for SmartMedicationAI.

export type Gender = 'male' | 'female' | 'other';

export type ValidationStatus = 'correct' | 'wrong' | 'unknown' | 'no_face';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  phone: string | null;
  address: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  face_registered: boolean;
  face_encoding: number[] | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PatientInput = Omit<
  Patient,
  'id' | 'user_id' | 'face_registered' | 'face_encoding' | 'created_at' | 'updated_at'
>;

export interface Medicine {
  id: string;
  user_id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  dosage_form: string | null;
  strength: string | null;
  manufacturer: string | null;
  description: string | null;
  side_effects: string | null;
  color: string | null;
  shape: string | null;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type MedicineInput = Omit<Medicine, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface Schedule {
  id: string;
  user_id: string;
  patient_id: string;
  medicine_id: string;
  dosage: string | null;
  scheduled_time: string; // "HH:MM:ss"
  days_of_week: number[];
  instructions: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ScheduleInput = Omit<Schedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface ValidationHistory {
  id: string;
  user_id: string;
  patient_id: string;
  medicine_id: string | null;
  schedule_id: string | null;
  scheduled_time: string | null;
  detected_medicine_name: string | null;
  expected_medicine_name: string | null;
  detected_confidence: number | null;
  face_confidence: number | null;
  validation_status: ValidationStatus;
  taken_at: string;
  notes: string | null;
  created_at: string;
}

export type ValidationHistoryInput = Omit<
  ValidationHistory,
  'id' | 'user_id' | 'created_at'
>;

export interface Settings {
  id: string;
  user_id: string;
  face_recognition_enabled: boolean;
  medicine_detection_enabled: boolean;
  caregiver_alerts_enabled: boolean;
  caregiver_email: string | null;
  caregiver_phone: string | null;
  voice_assistant_enabled: boolean;
  iot_pill_dispenser_enabled: boolean;
  theme: string;
  font_size: FontSize;
  high_contrast: boolean;
  notification_email: boolean;
  notification_sms: boolean;
  updated_at: string;
}

export type SettingsInput = Omit<Settings, 'id' | 'user_id' | 'updated_at'>;

// Joined views for convenience
export interface ScheduleWithRelations extends Schedule {
  patient?: Pick<Patient, 'id' | 'full_name' | 'avatar_url'>;
  medicine?: Pick<Medicine, 'id' | 'name' | 'strength' | 'color' | 'shape' | 'image_url'>;
}

export interface ValidationHistoryWithRelations extends ValidationHistory {
  patient?: Pick<Patient, 'id' | 'full_name' | 'avatar_url'>;
  medicine?: Pick<Medicine, 'id' | 'name' | 'strength'>;
}
