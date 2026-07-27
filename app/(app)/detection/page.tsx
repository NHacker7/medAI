'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Pill,
  Loader2,
  CheckCircle2,
  ScanLine,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-components';
import { WebcamCapture } from '@/components/shared/webcam-capture';
import { detectMedicine, type DetectedMedicine } from '@/lib/ai-services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DetectionPage() {
  const router = useRouter();
  const [captured, setCaptured] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detections, setDetections] = useState<DetectedMedicine[]>([]);
  const [top, setTop] = useState<DetectedMedicine | null>(null);

  async function handleDetect() {
    if (!captured) return;
    setProcessing(true);
    setDetections([]);
    setTop(null);
    try {
      const result = await detectMedicine(captured);
      if (!result.success) {
        toast.error(result.message ?? 'Detection failed');
        return;
      }
      setDetections(result.detections);
      setTop(result.top_detection);
      if (result.top_detection) {
        toast.success(`Detected ${result.top_detection.class_name} (${Math.round(result.top_detection.confidence * 100)}%)`);
      } else {
        toast.error('No medicine detected in frame');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Medicine Detection"
        description="Scan a medicine using the webcam. YOLOv8 detects and classifies it."
        icon={Camera}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Webcam Scan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <WebcamCapture
              overlay="medicine"
              facingMode="environment"
              captureLabel="Capture Medicine"
              onCapture={(img) => {
                setCaptured(img);
                setDetections([]);
                setTop(null);
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
            <CardTitle className="text-base">Detection Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {captured ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={captured} alt="Captured" className="h-full w-full object-cover" />
                  {detections.map((d, i) => {
                    const [x, y, w, h] = d.bbox;
                    return (
                      <div
                        key={i}
                        className="absolute border-2 border-success rounded-lg"
                        style={{
                          left: x,
                          top: y,
                          width: w,
                          height: h,
                        }}
                      >
                        <span className="absolute -top-6 left-0 rounded bg-success px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {d.class_name} {Math.round(d.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ScanLine className="h-8 w-8" />
                  <p className="text-sm">Capture an image to detect medicine</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {top && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-success/30 bg-success/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize text-foreground">{top.class_name}</p>
                      <p className="text-xs text-muted-foreground">Confidence: {Math.round(top.confidence * 100)}%</p>
                    </div>
                    <Badge className="rounded-lg bg-success/10 text-success hover:bg-success/10">Top match</Badge>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {detections.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">All detections</p>
                {detections.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="capitalize">{d.class_name}</span>
                    <Badge variant="secondary" className="rounded-lg">{Math.round(d.confidence * 100)}%</Badge>
                  </div>
                ))}
              </div>
            )}

            {!processing && !top && captured && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" /> No detection yet — run detection.
              </div>
            )}

            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                YOLOv8 (PyTorch) runs on the FastAPI backend. The edge function proxies the frame to the model and returns bounding boxes + class confidences.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDetect} disabled={!captured || processing} className="flex-1 rounded-xl">
                {processing ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Detecting…</span>
                ) : (
                  <span className="flex items-center gap-2"><ScanLine className="h-4 w-4" /> Detect Medicine</span>
                )}
              </Button>
              {top && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() =>
                    router.push(`/validation?detected=${encodeURIComponent(top.class_name)}`)
                  }
                >
                  Validate <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
