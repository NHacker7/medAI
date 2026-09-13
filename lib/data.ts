// Data-access layer for SmartMedicationAI.
// Thin async wrappers around Supabase queries.

import { supabase } from '@/lib/supabase';

import type {
  Patient,
  PatientInput,
  Medicine,
  MedicineInput,
  Schedule,
  ScheduleInput,
  ValidationHistory,
  ValidationHistoryInput,
  Settings,
  SettingsInput,
  ScheduleWithRelations,
  ValidationHistoryWithRelations,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export async function listPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      id,
      user_id,
      full_name,
      date_of_birth,
      gender,
      phone,
      address,
      medical_conditions,
      allergies,
      emergency_contact,
      face_registered,
      face_encoding,
      avatar_url,
      notes,
      created_at
    `)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('LIST PATIENTS ERROR:', error);
    throw error;
  }

  return (data ?? []) as Patient[];
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
export async function createPatient(input: PatientInput): Promise<Patient> {
  // Make sure a user is logged in
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('AUTH ERROR:', userError);
    throw userError;
  }

  if (!user) {
    throw new Error('You must be logged in to create a patient.');
  }

  // Generate the required patient_id
  const patientId = `PAT-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  console.log('CREATING PATIENT:', {
    patientId,
    userId: user.id,
    input,
  });

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...input,

      // Required by the patients table
      patient_id: patientId,

      // Owner of this patient
      user_id: user.id,

      // Face registration starts as false
      face_registered: false,
      face_encoding: null,
    })
    .select()
    .single();

  if (error) {
    console.error('SUPABASE CREATE PATIENT ERROR:', error);

    throw new Error(
      `Could not save patient: ${error.message}`
    );
  }

  console.log('PATIENT CREATED:', data);

  return data;
}
export async function updatePatient(
  id: string,
  input: Partial<PatientInput>
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deletePatient(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function updateFaceEncoding(
  id: string,
  encoding: number[],
  avatarUrl?: string
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update({
      face_encoding: encoding,
      face_registered: true,
      avatar_url: avatarUrl ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Medicines
// ---------------------------------------------------------------------------

export async function listMedicines(): Promise<Medicine[]> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMedicine(
  id: string
): Promise<Medicine | null> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createMedicine(
  input: MedicineInput
): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMedicine(
  id: string,
  input: Partial<MedicineInput>
): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteMedicine(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('medicines')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export async function listSchedules(): Promise<
  ScheduleWithRelations[]
> {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      patient:patients(
        id,
        full_name,
        avatar_url
      ),
      medicine:medicines(
        id,
        name,
        strength,
        color,
        shape,
        image_url
      )
    `)
    .order('scheduled_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ScheduleWithRelations[];
}

export async function listSchedulesForPatient(
  patientId: string
): Promise<ScheduleWithRelations[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      patient:patients(
        id,
        full_name,
        avatar_url
      ),
      medicine:medicines(
        id,
        name,
        strength,
        color,
        shape,
        image_url
      )
    `)
    .eq('patient_id', patientId)
    .order('scheduled_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ScheduleWithRelations[];
}

export async function createSchedule(
  input: ScheduleInput
): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateSchedule(
  id: string,
  input: Partial<ScheduleInput>
): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteSchedule(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Validation History
// ---------------------------------------------------------------------------

export async function listHistory(): Promise<
  ValidationHistoryWithRelations[]
> {
  const { data, error } = await supabase
    .from('validation_history')
    .select(`
      *,
      patient:patients(
        id,
        full_name,
        avatar_url
      ),
      medicine:medicines(
        id,
        name,
        strength
      )
    `)
    .order('taken_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ValidationHistoryWithRelations[];
}

export async function listHistoryForPatient(
  patientId: string
): Promise<ValidationHistoryWithRelations[]> {
  const { data, error } = await supabase
    .from('validation_history')
    .select(`
      *,
      patient:patients(
        id,
        full_name,
        avatar_url
      ),
      medicine:medicines(
        id,
        name,
        strength
      )
    `)
    .eq('patient_id', patientId)
    .order('taken_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ValidationHistoryWithRelations[];
}

export async function createHistoryEntry(
  input: ValidationHistoryInput
): Promise<ValidationHistory> {
  const { data, error } = await supabase
    .from('validation_history')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteHistoryEntry(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('validation_history')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertSettings(
  input: Partial<SettingsInput>
): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .upsert(input, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}