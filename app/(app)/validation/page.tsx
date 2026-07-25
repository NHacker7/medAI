'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  ScanFace,
  Pill,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Camera,
  Save,
  RefreshCw,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-components';
import { WebcamCapture } from '@/components/shared/webcam-capture';
import { useQuery } from '@/hooks/use-query';
import { listPatients, listSchedules, createHistoryEntry } from '@/lib/data';
import { recognizeFace, detectMedicine, validateMedication, validateMedicationLocal, type ValidationResult } from '@/lib/ai-services';
import type { Patient, ValidationStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';

type Step = 'face' | 'detect' | 'validate' | 'done';

const statusConfig: Record<
  ValidationStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  correct: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'Correct' },
  wrong: { icon: XCircle, color: 'text-error', bg: 'bg-error/10 border-error/30', label: 'Wrong Medicine' },
  unknown: { icon: HelpCircle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: 'Unknown' },
  no_face: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: 'No Face' },
};

export default function ValidationPage() {
  const searchParams = useSearchParams();
  const presetDetected = searchParams.get('detected');
  const { data: patients } = useQuery(listPatients, []);
  const { data: schedules } = useQuery(listSchedules, []);

  const [step, setStep] = useState<Step>('face');
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [matchedPatient, setMatchedPatient] = useState<Patient | null>(null);
  const [faceConfidence, setFaceConfidence] = useState<number | null>(null);
  const [processingFace, setProcessingFace] = useState(false);

  const [medicineImage, setMedicineImage] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(presetDetected);
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);
  const [processingDetect, setProcessingDetect] = useState(false);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  const registered = useMemo(
    () => (patients ?? []).filter((p) => p.face_registered && p.face_encoding),
    [patients],
  );

  const patientSchedules = useMemo(
    () => (schedules ?? []).filter((s) => s.patient_id === matchedPatient?.id && s.active),
    [schedules, matchedPatient],
  );

  useEffect(() => {
    if (presetDetected) {
      setDetectedName(presetDetected);
    }
  }, [presetDetected]);

  async function handleFaceRecognize() {
    if (!faceImage || registered.length === 0) return;
    setProcessingFace(true);
    try {
      const candidates = registered.map((p) => ({
        patient_id: p.id,
        full_name: p.full_name,
        encoding: p.face_encoding as number[],
      }));
      const r = await recognizeFace(faceImage, candidates);
      if (!r.success || r.face_count === 0) {
        toast.error(r.message ?? 'No face detected');
        return;
      }
      if (!r.best_match) {
        toast.error('No matching patient found');
        return;
      }
      const p = patients?.find((x) => x.id === r.best_match!.patient_id) ?? null;
      setMatchedPatient(p);
      setFaceConfidence(r.best_match.confidence);
      toast.success(`Matched ${p?.full_name ?? 'patient'}`);
      setStep('detect');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recognition failed');
    } finally {
      setProcessingFace(false);
    }
  }

  async function handleMedicineDetect() {
    if (!medicineImage) return;
    setProcessingDetect(true);
    setDetectedName(null);
    setDetectedConfidence(null);
    try {
      const r = await detectMedicine(medicineImage);
      if (!r.success) {
        toast.error(r.message ?? 'Detection failed');
        return;
      }
      if (r.top_detection) {
        setDetectedName(r.top_detection.class_name);
        setDetectedConfidence(r.top_detection.confidence * 100);
        toast.success(`Detected ${r.top_detection.class_name}`);
      } else {
        toast.error('No medicine detected');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setProcessingDetect(false);
    }
  }

  async function handleValidate() {
    if (!matchedPatient) return;
    setValidating(true);
    try {
      const schedule = patientSchedules.find((s) => s.id === selectedScheduleId);
      const expectedName = schedule?.medicine?.name ?? '';
      const input = {
        patient: { id: matchedPatient.id, full_name: matchedPatient.full_name },
        expected_medicine_name: expectedName,
        detected_medicine_name: detectedName,
        detected_confidence: detectedConfidence,
        face_confidence: faceConfidence,
        scheduled_time: schedule ? formatTime(schedule.scheduled_time) : null,
      };
      let r: ValidationResult;
      try {
        r = await validateMedication(input);
      } catch {
        r = validateMedicationLocal(input);
      }
      setResult(r);
      setStep('validate');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (!matchedPatient || !result) return;
    setSaving(true);
    try {
      const schedule = patientSchedules.find((s) => s.id === selectedScheduleId);
      await createHistoryEntry({
        patient_id: matchedPatient.id,
        medicine_id: schedule?.medicine_id ?? null,
        schedule_id: schedule?.id ?? null,
        scheduled_time: schedule ? formatTime(schedule.scheduled_time) + ':00' : null,
        detected_medicine_name: detectedName,
        expected_medicine_name: schedule?.medicine?.name ?? null,
        detected_confidence: detectedConfidence,
        face_confidence: faceConfidence,
        validation_status: result.status,
        taken_at: new Date().toISOString(),
        notes: result.reason,
      });
      toast.success('Validation saved to history');
      setStep('done');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save history');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep('face');
    setFaceImage(null);
    setMatchedPatient(null);
    setFaceConfidence(null);
    setMedicineImage(null);
    setDetectedName(null);
    setDetectedConfidence(null);
    setSelectedScheduleId('');
    setResult(null);
  }

  const steps: { id: Step; label: string }[] = [
    { id: 'face', label: 'Face' },
    { id: 'detect', label: 'Detect' },
    { id: 'validate', label: 'Validate' },
    { id: 'done', label: 'Save' },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <div>
      <PageHeader
        title="AI Validation"
        description="Verify the right patient is taking the right medicine at the right time."
        icon={BrainCircuit}
        actions={
          step !== 'face' && (
            <Button variant="outline" className="rounded-xl" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" /> Start Over
            </Button>
          )
        }
      />

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => {
          const active = i <= currentIdx;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </div>
              <span className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 rounded', active ? 'bg-primary' : 'bg-border')} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: FACE */}
        {step === 'face' && (
          <motion.div key="face" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScanFace className="h-5 w-5 text-primary" /> Step 1 — Identify Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {registered.length === 0 ? (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
                    No patients have enrolled faces. Register a face first to use AI validation.
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <WebcamCapture
                      overlay="face"
                      captureLabel="Capture Face"
                      onCapture={setFaceImage}
                    />
                    <div className="space-y-4">
                      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                        {faceImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={faceImage} alt="Face" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Camera className="h-8 w-8" />
                            <p className="text-sm">Capture a face to begin</p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleFaceRecognize}
                        disabled={!faceImage || processingFace}
                        className="w-full rounded-xl"
                      >
                        {processingFace ? (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Recognizing…</span>
                        ) : (
                          <span className="flex items-center gap-2"><ScanFace className="h-4 w-4" /> Recognize & Continue</span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 2: DETECT */}
        {step === 'detect' && (
          <motion.div key="detect" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="h-5 w-5 text-secondary" /> Step 2 — Detect Medicine
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchedPatient && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3">
                    <Avatar className="h-10 w-10 border border-border">
                      {matchedPatient.avatar_url ? <AvatarImage src={matchedPatient.avatar_url} alt={matchedPatient.full_name} /> : null}
                      <AvatarFallback className="bg-muted text-xs">{matchedPatient.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{matchedPatient.full_name}</p>
                      <p className="text-xs text-muted-foreground">Face match confidence: {Math.round(faceConfidence ?? 0)}%</p>
                    </div>
                    <Badge className="rounded-lg bg-success/10 text-success hover:bg-success/10">Identified</Badge>
                  </div>
                )}
                <div className="grid gap-6 lg:grid-cols-2">
                  <WebcamCapture
                    overlay="medicine"
                    facingMode="environment"
                    captureLabel="Capture Medicine"
                    onCapture={(img) => {
                      setMedicineImage(img);
                      setDetectedName(null);
                      setDetectedConfidence(null);
                    }}
                  />
                  <div className="space-y-4">
                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                      {medicineImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={medicineImage} alt="Medicine" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Camera className="h-8 w-8" />
                          <p className="text-sm">Capture the medicine</p>
                        </div>
                      )}
                    </div>
                    {detectedName && (
                      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-3">
                        <p className="text-sm font-semibold capitalize">{detectedName}</p>
                        <p className="text-xs text-muted-foreground">Confidence: {Math.round(detectedConfidence ?? 0)}%</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleMedicineDetect} disabled={!medicineImage || processingDetect} className="flex-1 rounded-xl">
                        {processingDetect ? (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Detecting…</span>
                        ) : (
                          <span className="flex items-center gap-2"><Pill className="h-4 w-4" /> Detect</span>
                        )}
                      </Button>
                      <Button onClick={() => setStep('validate')} variant="outline" className="rounded-xl">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: VALIDATE */}
        {step === 'validate' && (
          <motion.div key="validate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BrainCircuit className="h-5 w-5 text-accent" /> Step 3 — AI Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Patient</p>
                    <p className="mt-1 text-sm font-semibold">{matchedPatient?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Face: {Math.round(faceConfidence ?? 0)}%</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Detected Medicine</p>
                    <p className="mt-1 text-sm font-semibold capitalize">{detectedName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Confidence: {Math.round(detectedConfidence ?? 0)}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scheduled Dose (expected)</label>
                  {patientSchedules.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                      No active schedules for this patient. Validation will compare against no expectation.
                    </p>
                  ) : (
                    <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a scheduled dose" /></SelectTrigger>
                      <SelectContent>
                        {patientSchedules.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {formatTime(s.scheduled_time)} · {s.medicine?.name ?? 'Unknown'} {s.medicine?.strength ?? ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button onClick={handleValidate} disabled={validating} className="w-full rounded-xl">
                  {validating ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Validating…</span>
                  ) : (
                    <span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Run AI Validation</span>
                  )}
                </Button>

                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn('rounded-2xl border p-5', statusConfig[result.status].bg)}
                  >
                    <div className="flex items-start gap-3">
                      {(() => {
                        const Icon = statusConfig[result.status].icon;
                        return (
                          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-white/60', statusConfig[result.status].color)}>
                            <Icon className="h-6 w-6" />
                          </div>
                        );
                      })()}
                      <div className="flex-1">
                        <p className={cn('text-lg font-bold', statusConfig[result.status].color)}>
                          {statusConfig[result.status].label}
                        </p>
                        <p className="mt-1 text-sm text-foreground">{result.reason}</p>
                        {result.recommendations.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {result.recommendations.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current" /> {r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="mt-4 w-full rounded-xl">
                      {saving ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
                      ) : (
                        <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save to History</span>
                      )}
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 4: DONE */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-center p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="mt-4 text-xl font-bold">Validation Saved</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  The validation result has been recorded to the patient&apos;s history with a full audit trail.
                </p>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={reset}>
                    <RefreshCw className="mr-2 h-4 w-4" /> New Validation
                  </Button>
                  <a href="/history">
                    <Button className="rounded-xl">
                      View History <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
