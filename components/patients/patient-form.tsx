'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-components';
import { createPatient, updatePatient, getPatient } from '@/lib/data';
import type { PatientInput } from '@/lib/types';
import { toast } from 'sonner';
import { useEffect } from 'react';

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PatientFormProps {
  patientId?: string;
}

export default function PatientForm({ patientId }: PatientFormProps) {
  const router = useRouter();
  const isEdit = Boolean(patientId);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      gender: undefined,
      phone: '',
      address: '',
      medical_conditions: '',
      allergies: '',
      emergency_contact: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!patientId) return;
    getPatient(patientId).then((p) => {
      if (!p) return;
      reset({
        full_name: p.full_name,
        date_of_birth: p.date_of_birth ?? '',
        gender: (p.gender ?? undefined) as FormValues['gender'],
        phone: p.phone ?? '',
        address: p.address ?? '',
        medical_conditions: p.medical_conditions ?? '',
        allergies: p.allergies ?? '',
        emergency_contact: p.emergency_contact ?? '',
        notes: p.notes ?? '',
      });
    });
  }, [patientId, reset]);
async function onSubmit(values: FormValues) {
  setSaving(true);

  try {
    const input: PatientInput = {
      full_name: values.full_name,
      date_of_birth: values.date_of_birth || null,
      gender: values.gender ?? null,
      phone: values.phone || null,
      address: values.address || null,
      medical_conditions: values.medical_conditions || null,
      allergies: values.allergies || null,
      emergency_contact: values.emergency_contact || null,
      avatar_url: null,
      notes: values.notes || null,
    };

    if (isEdit && patientId) {
      await updatePatient(patientId, input);
      toast.success('Patient updated');
    } else {
      await createPatient(input);
      toast.success('Patient added');
    }

    router.push('/patients');

  } catch (err) {
    console.error('CREATE PATIENT ERROR:', err);

    toast.error(
      err instanceof Error
        ? err.message
        : JSON.stringify(err)
    );

  } finally {
    setSaving(false);
  }
}
  const gender = watch('gender');

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Patient' : 'Add Patient'}
        description={isEdit ? 'Update patient information.' : 'Create a new patient record.'}
        actions={
          <Link href="/patients">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" {...register('full_name')} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" {...register('date_of_birth')} className="rounded-xl" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender ?? ''} onValueChange={(v) => setValue('gender', v as FormValues['gender'])}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} className="rounded-xl" placeholder="+1 555 0100" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...register('address')} className="rounded-xl" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Medical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea id="medical_conditions" {...register('medical_conditions')} className="rounded-xl" rows={2} placeholder="e.g. Hypertension, Diabetes" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input id="allergies" {...register('allergies')} className="rounded-xl" placeholder="e.g. Penicillin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input id="emergency_contact" {...register('emergency_contact')} className="rounded-xl" placeholder="Name and phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register('notes')} className="rounded-xl" rows={2} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Link href="/patients">
            <Button type="button" variant="outline" className="rounded-xl">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving} className="rounded-xl">
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Patient'}
          </Button>
        </div>
      </form>
    </div>
  );
}
