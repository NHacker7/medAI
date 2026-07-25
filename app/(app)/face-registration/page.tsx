'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  ScanFace,
  CheckCircle2,
  Loader2,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-components';
import { WebcamCapture } from '@/components/shared/webcam-capture';
import { useQuery } from '@/hooks/use-query';
import { listPatients, getPatient, updateFaceEncoding } from '@/lib/data';
import { registerFace } from '@/lib/ai-services';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function FaceRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetPatientId = searchParams.get('patient');
  const { data: patients } = useQuery(listPatients, []);
  const [selectedId, setSelectedId] = useState<string>(presetPatientId ?? '');
  const [captured, setCaptured] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const selected = patients?.find((p) => p.id === selectedId);

  useEffect(() => {
    if (presetPatientId) setSelectedId(presetPatientId);
  }, [presetPatientId]);

  async function handleRegister() {
    if (!selected || !captured) return;
    setProcessing(true);
    try {
      const result = await registerFace(captured);
      if (!result.success || result.face_count === 0) {
        toast.error(result.message ?? 'No face detected. Try again with better lighting.');
        return;
      }
      await updateFaceEncoding(selected.id, result.encoding, captured);
      toast.success(`${selected.full_name}'s face is now registered.`);
      setDone(true);
      setTimeout(() => router.push(`/patients/${selected.id}`), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Face registration failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Face Registration"
        description="Enroll a patient's face for recognition-based identification."
        icon={UserPlus}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Capture Face</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Patient</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} {p.face_registered ? '(re-register)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <WebcamCapture
              overlay="face"
              captureLabel="Capture Face"
              onCapture={(img) => setCaptured(img)}
            />

            {captured && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" /> Image captured and ready to register.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Preview & Register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {captured ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={captured} alt="Captured face" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <p className="text-sm">Captured image appears here</p>
                </div>
              )}
            </div>

            {selected && (
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar className="h-10 w-10 border border-border">
                  {selected.avatar_url ? <AvatarImage src={selected.avatar_url} alt={selected.full_name} /> : null}
                  <AvatarFallback className="bg-muted text-xs">
                    {selected.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{selected.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.face_registered ? 'Already registered — will update' : 'Not yet registered'}
                  </p>
                </div>
                {selected.face_registered && (
                  <Badge className="rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/10">
                    <ScanFace className="mr-1 h-3 w-3" /> Enrolled
                  </Badge>
                )}
              </div>
            )}

            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success"
                >
                  <CheckCircle2 className="h-4 w-4" /> Face registered successfully!
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The AI service computes a 128-dimension face embedding using face_recognition + dlib.
                The embedding is stored securely and used only for matching during validation.
              </p>
            </div>

            <Button
              onClick={handleRegister}
              disabled={!selected || !captured || processing || done}
              className="w-full rounded-xl"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ScanFace className="h-4 w-4" /> Register Face
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
