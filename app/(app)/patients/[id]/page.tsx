'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  History as HistoryIcon,
  Pencil,
  Pill,
  ScanFace,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { getPatient, listSchedulesForPatient, listHistoryForPatient } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { calculateAge, formatDateTime, formatDaysOfWeek, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: patient, loading } = useQuery(() => getPatient(params.id), [params.id]);
  const { data: schedules } = useQuery(() => listSchedulesForPatient(params.id), [params.id]);
  const { data: history } = useQuery(() => listHistoryForPatient(params.id), [params.id]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }
  if (!patient) {
    return (
      <EmptyState
        icon={Users}
        title="Patient not found"
        action={
          <Link href="/patients">
            <Button className="rounded-xl">Back to patients</Button>
          </Link>
        }
      />
    );
  }

  const adherence =
    history && history.length > 0
      ? Math.round((history.filter((h) => h.validation_status === 'correct').length / history.length) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        description="Patient profile, schedule, and validation history."
        icon={Users}
        actions={
          <div className="flex gap-2">
            {!patient.face_registered && (
              <Link href={`/face-registration?patient=${patient.id}`}>
                <Button variant="outline" className="rounded-xl">
                  <UserPlus className="mr-2 h-4 w-4" /> Register Face
                </Button>
              </Link>
            )}
            <Link href={`/patients/${patient.id}/edit`}>
              <Button variant="outline" className="rounded-xl">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button variant="ghost" className="rounded-xl" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-24 w-24 border-2 border-border">
              {patient.avatar_url ? <AvatarImage src={patient.avatar_url} alt={patient.full_name} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-2xl font-bold text-primary">
                {patient.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-bold text-foreground">{patient.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {patient.gender ?? '—'} · {patient.date_of_birth ? `${calculateAge(patient.date_of_birth)} years` : 'Age N/A'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {patient.face_registered ? (
                <Badge className="rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/10">
                  <ScanFace className="mr-1 h-3 w-3" /> Face registered
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-lg">No face enrolled</Badge>
              )}
              <Badge variant="secondary" className="rounded-lg">{adherence}% adherence</Badge>
            </div>

            <div className="mt-6 w-full space-y-2 text-left text-sm">
              {patient.phone && <p className="text-muted-foreground">Phone: {patient.phone}</p>}
              {patient.address && <p className="text-muted-foreground">Address: {patient.address}</p>}
              {patient.medical_conditions && (
                <p className="text-muted-foreground">Conditions: {patient.medical_conditions}</p>
              )}
              {patient.allergies && <p className="text-muted-foreground">Allergies: {patient.allergies}</p>}
              {patient.emergency_contact && (
                <p className="text-muted-foreground">Emergency: {patient.emergency_contact}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              <CalendarClock className="mr-2 inline h-4 w-4 text-primary" /> Medication Schedule
            </CardTitle>
            <Link href={`/schedule?patient=${patient.id}`}>
              <Button variant="ghost" size="sm" className="rounded-lg text-xs">Manage</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {schedules && schedules.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No scheduled doses.{' '}
                <Link href={`/schedule?patient=${patient.id}`} className="text-primary hover:underline">
                  Add one
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {schedules?.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Pill className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.medicine?.name ?? 'Unknown'} {s.medicine?.strength ?? ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDaysOfWeek(s.days_of_week)} · {s.dosage ?? '—'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-lg">{formatTime(s.scheduled_time)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            <HistoryIcon className="mr-2 inline h-4 w-4 text-primary" /> Validation History
          </CardTitle>
          <Link href={`/history?patient=${patient.id}`}>
            <Button variant="ghost" size="sm" className="rounded-lg text-xs">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {history && history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No validations recorded.</p>
          ) : (
            <div className="space-y-2">
              {history?.slice(0, 8).map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      h.validation_status === 'correct' && 'bg-success/10 text-success',
                      h.validation_status === 'wrong' && 'bg-error/10 text-error',
                      (h.validation_status === 'unknown' || h.validation_status === 'no_face') && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {h.validation_status === 'correct' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {h.detected_medicine_name ?? '—'}
                      {h.expected_medicine_name ? ` (expected ${h.expected_medicine_name})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.taken_at)}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-lg capitalize',
                      h.validation_status === 'correct' && 'bg-success/10 text-success',
                      h.validation_status === 'wrong' && 'bg-error/10 text-error',
                    )}
                  >
                    {h.validation_status.replace('_', ' ')}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
