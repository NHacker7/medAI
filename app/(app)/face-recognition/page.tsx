'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanFace,
  CheckCircle2,
  Loader2,
  Camera,
  UserCheck,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-components';
import { WebcamCapture } from '@/components/shared/webcam-capture';
import { useQuery } from '@/hooks/use-query';
import { listPatients } from '@/lib/data';
import { recognizeFace, type FaceMatch } from '@/lib/ai-services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function FaceRecognitionPage() {
  const router = useRouter();
  const { data: patients } = useQuery(listPatients, []);
  const [captured, setCaptured] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [match, setMatch] = useState<FaceMatch | null>(null);

  const registered = (patients ?? []).filter((p) => p.face_registered && p.face_encoding);

  async function handleRecognize() {
    if (!captured || registered.length === 0) return;
    setProcessing(true);
    setMatch(null);
    try {
      const candidates = registered.map((p) => ({
        patient_id: p.id,
        full_name: p.full_name,
        encoding: p.face_encoding as number[],
      }));
      const result = await recognizeFace(captured, candidates);
      if (!result.success || result.face_count === 0) {
        toast.error(result.message ?? 'No face detected in the image.');
        return;
      }
      if (result.best_match) {
        setMatch(result.best_match);
        toast.success(`Matched ${result.best_match.full_name} (${Math.round(result.best_match.confidence)}%)`);
      } else {
        toast.error('No matching patient found.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Face recognition failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Face Recognition"
        description="Identify a patient by their face to begin a validation session."
        icon={ScanFace}
      />

      {registered.length === 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          <Camera className="h-5 w-5" />
          <p>
            No patients have enrolled faces yet.{' '}
            <button onClick={() => router.push('/face-registration')} className="font-semibold underline">
              Register a face first
            </button>
            .
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Capture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <WebcamCapture
              overlay="face"
              captureLabel="Capture Face"
              onCapture={(img) => {
                setCaptured(img);
                setMatch(null);
              }}
            />
            {captured && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" /> Image captured.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Match Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {captured ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={captured} alt="Captured" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <p className="text-sm">Captured image appears here</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {match && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-success/30 bg-success/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{match.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Confidence: {Math.round(match.confidence)}% · Distance: {match.distance.toFixed(3)}
                      </p>
                    </div>
                    <Badge className="rounded-lg bg-success/10 text-success hover:bg-success/10">Matched</Badge>
                  </div>
                  <Button
                    onClick={() => router.push(`/patients/${match.patient_id}`)}
                    className="mt-3 w-full rounded-xl"
                  >
                    Open Patient Profile <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {processing && !match && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border p-4 text-sm text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" /> Comparing against {registered.length} enrolled face(s)…
                </motion.div>
              )}

              {!processing && !match && captured && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
                >
                  <XCircle className="h-4 w-4" /> No match yet — run recognition.
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleRecognize}
              disabled={!captured || processing || registered.length === 0}
              className={cn('w-full rounded-xl')}
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Recognizing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ScanFace className="h-4 w-4" /> Recognize Face
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
