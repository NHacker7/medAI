'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Plus,
  Clock,
  Pill,
  Trash2,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { listSchedules, listPatients, listMedicines, createSchedule, updateSchedule, deleteSchedule } from '@/lib/data';
import type { ScheduleInput, ScheduleWithRelations } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDaysOfWeek, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const dayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const presetPatient = searchParams.get('patient');
  const { data: schedules, loading, refetch } = useQuery(listSchedules, []);
  const { data: patients } = useQuery(listPatients, []);
  const { data: medicines } = useQuery(listMedicines, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleWithRelations | null>(null);
  const [filterPatient, setFilterPatient] = useState<string>(presetPatient ?? 'all');

  useEffect(() => {
    if (presetPatient) setFilterPatient(presetPatient);
  }, [presetPatient]);

  const filtered = (schedules ?? []).filter(
    (s) => filterPatient === 'all' || s.patient_id === filterPatient,
  );

  async function handleDelete(s: ScheduleWithRelations) {
    try {
      await deleteSchedule(s.id);
      toast.success('Schedule removed');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete schedule');
    }
  }

  return (
    <div>
      <PageHeader
        title="Medicine Schedule"
        description="Plan scheduled doses for each patient across the week."
        icon={CalendarClock}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Schedule
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Select value={filterPatient} onValueChange={setFilterPatient}>
          <SelectTrigger className="w-[240px] rounded-xl">
            <SelectValue placeholder="All patients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All patients</SelectItem>
            {patients?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No schedules yet"
          description="Add a scheduled dose to plan a patient's medication."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Schedule
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <Card className="rounded-2xl">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {s.medicine?.name ?? 'Unknown'} {s.medicine?.strength ?? ''}
                      </p>
                      <Badge variant="secondary" className="rounded-lg">{formatTime(s.scheduled_time)}</Badge>
                      <Badge variant="outline" className="rounded-lg">{formatDaysOfWeek(s.days_of_week)}</Badge>
                      {!s.active && <Badge variant="secondary" className="rounded-lg bg-muted">Inactive</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {s.patient?.full_name ?? '—'}{s.dosage ? ` · ${s.dosage}` : ''}{s.instructions ? ` · ${s.instructions}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      onClick={async () => {
                        await updateSchedule(s.id, { active: !s.active });
                        refetch();
                      }}
                      aria-label="Toggle active"
                    >
                      <Switch checked={s.active} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      onClick={() => {
                        setEditing(s);
                        setDialogOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg text-error hover:text-error" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the scheduled dose for {s.patient?.full_name ?? 'this patient'}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(s)}
                            className="rounded-xl bg-error hover:bg-error"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
          </DialogHeader>
          <ScheduleForm
            schedule={editing}
            patients={patients ?? []}
            medicines={medicines ?? []}
            presetPatientId={filterPatient !== 'all' ? filterPatient : undefined}
            onSaved={() => {
              setDialogOpen(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ScheduleFormProps {
  schedule: ScheduleWithRelations | null;
  patients: { id: string; full_name: string }[];
  medicines: { id: string; name: string; strength: string | null }[];
  presetPatientId?: string;
  onSaved?: () => void;
}

function ScheduleForm({ schedule, patients, medicines, presetPatientId, onSaved }: ScheduleFormProps) {
  const [patientId, setPatientId] = useState(schedule?.patient_id ?? presetPatientId ?? '');
  const [medicineId, setMedicineId] = useState(schedule?.medicine_id ?? '');
  const [time, setTime] = useState(schedule ? formatTime(schedule.scheduled_time) : '08:00');
  const [dosage, setDosage] = useState(schedule?.dosage ?? '1 tablet');
  const [instructions, setInstructions] = useState(schedule?.instructions ?? '');
  const [days, setDays] = useState<number[]>(schedule?.days_of_week ?? []);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !medicineId) {
      toast.error('Select a patient and a medicine');
      return;
    }
    setSaving(true);
    try {
      const input: ScheduleInput = {
        patient_id: patientId,
        medicine_id: medicineId,
        dosage: dosage || null,
        scheduled_time: time,
        days_of_week: days,
        instructions: instructions || null,
        active: true,
      };
      if (schedule) {
        await updateSchedule(schedule.id, input);
        toast.success('Schedule updated');
      } else {
        await createSchedule(input);
        toast.success('Schedule added');
      }
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Patient *</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select patient" /></SelectTrigger>
            <SelectContent>
              {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Medicine *</Label>
          <Select value={medicineId} onValueChange={setMedicineId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select medicine" /></SelectTrigger>
            <SelectContent>
              {medicines.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}{m.strength ? ` ${m.strength}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="time">Scheduled Time *</Label>
          <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dosage">Dosage</Label>
          <Input id="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} className="rounded-xl" placeholder="1 tablet" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Days of Week</Label>
        <div className="flex flex-wrap gap-2">
          {dayOptions.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={cn(
                'h-9 w-12 rounded-lg border text-xs font-medium transition-all',
                days.includes(d.value)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDays([])}
            className={cn(
              'h-9 rounded-lg border px-3 text-xs font-medium transition-all',
              days.length === 0
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            Every day
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Empty selection means every day.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Input id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="rounded-xl" placeholder="After meals" />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="rounded-xl">
          {saving ? 'Saving…' : schedule ? 'Save Changes' : 'Add Schedule'}
        </Button>
      </div>
    </form>
  );
}
