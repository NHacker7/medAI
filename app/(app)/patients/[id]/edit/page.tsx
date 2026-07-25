'use client';

import { useParams } from 'next/navigation';
import PatientForm from '@/components/patients/patient-form';

export default function EditPatientPage() {
  const params = useParams<{ id: string }>();
  return <PatientForm patientId={params.id} />;
}
