'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WebcamCaptureProps {
  onCapture: (imageBase64: string) => void;
  captureLabel?: string;
  facingMode?: 'user' | 'environment';
  className?: string;
  showControls?: boolean;
  overlay?: 'none' | 'face' | 'medicine';
}

export function WebcamCapture({
  onCapture,
  captureLabel = 'Capture',
  facingMode = 'user',
  className,
  showControls = true,
  overlay = 'none',
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access camera');
    } finally {
      setStarting(false);
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(dataUrl);
  }, [active, onCapture]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border bg-slate-950', className)}>
      <video
        ref={videoRef}
        playsInline
        muted
        className={cn('h-full w-full object-cover', !active && 'hidden')}
      />

      {/* Overlay guides */}
      {active && overlay === 'face' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-3/4 w-3/4 max-w-[260px] rounded-full border-2 border-white/60 shadow-[0_0_0_2000px_rgba(15,23,42,0.35)]" />
        </div>
      )}
      {active && overlay === 'medicine' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-1/2 w-3/4 rounded-2xl border-2 border-dashed border-white/60" />
        </div>
      )}

      {!active && (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-slate-400">
          <CameraOff className="h-10 w-10" />
          <p className="text-sm">{error ?? 'Camera is off'}</p>
          {error && <p className="max-w-xs text-center text-xs text-slate-500">{error}</p>}
        </div>
      )}

      {showControls && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-slate-950/80 to-transparent p-4">
          {!active ? (
            <Button onClick={start} disabled={starting} size="sm" className="rounded-xl">
              <Camera className="mr-2 h-4 w-4" />
              {starting ? 'Starting…' : 'Start Camera'}
            </Button>
          ) : (
            <>
              <Button onClick={capture} size="sm" className="rounded-xl">
                <Camera className="mr-2 h-4 w-4" /> {captureLabel}
              </Button>
              <Button onClick={start} size="sm" variant="secondary" className="rounded-xl">
                <RefreshCw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button onClick={stop} size="sm" variant="ghost" className="rounded-xl text-white hover:bg-white/10">
                Stop
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
