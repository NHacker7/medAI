'use client';

import { motion } from 'framer-motion';
import {
  Info,
  ScanFace,
  Camera,
  BrainCircuit,
  Database,
  ShieldCheck,
  Cpu,
  Cloud,
  Volume2,
  Bell,
  Smartphone,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const techStack = [
  { label: 'Frontend', value: 'React, TypeScript, Tailwind CSS, ShadCN UI, Framer Motion' },
  { label: 'Backend', value: 'Python FastAPI (AI services) + Supabase Edge Functions (gateway)' },
  { label: 'Database', value: 'Supabase (PostgreSQL) — SQLite-compatible schema design' },
  { label: 'AI / CV', value: 'OpenCV, face_recognition, dlib, YOLOv8, PyTorch' },
];

const workflow = [
  { icon: ScanFace, label: 'Face Recognition', desc: 'Identify the patient via webcam' },
  { icon: Camera, label: 'Medicine Detection', desc: 'YOLOv8 detects the medicine' },
  { icon: BrainCircuit, label: 'AI Validation', desc: 'Verify correct medicine & time' },
  { icon: Database, label: 'Save History', desc: 'Full audit trail stored securely' },
];

const future = [
  { icon: Bell, label: 'Caregiver Alerts', desc: 'Real-time notifications on failures' },
  { icon: Volume2, label: 'Voice Assistant', desc: 'Spoken guidance for patients' },
  { icon: Cpu, label: 'IoT Pill Dispenser', desc: 'Automatic dosing hardware' },
  { icon: Smartphone, label: 'Mobile App', desc: 'Native iOS / Android companion' },
  { icon: Cloud, label: 'Cloud Sync', desc: 'Multi-device synchronization' },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About SmartMedicationAI"
        description="An AI-powered medication validation system built for elderly healthcare."
        icon={Info}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 p-8"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <Badge className="rounded-lg bg-primary/10 text-primary hover:bg-primary/10">Healthcare · AI · Elderly Care</Badge>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Safer medication, verified by AI.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            SmartMedicationAI uses face recognition to identify patients, computer vision to detect medicines,
            and an AI validation engine to confirm the right medicine is taken at the right scheduled time —
            with a complete, auditable history.
          </p>
        </div>
      </motion.div>

      {/* Workflow */}
      <h3 className="mt-8 text-base font-semibold text-foreground">Validation Workflow</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {workflow.map((w, i) => (
          <motion.div key={w.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full rounded-2xl">
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                  <w.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold">{w.label}</p>
                <p className="text-xs text-muted-foreground">{w.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tech stack */}
      <Card className="mt-8 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-5 w-5 text-primary" /> Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {techStack.map((t) => (
              <div key={t.label} className="rounded-xl border border-border p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</dt>
                <dd className="mt-1 text-sm text-foreground">{t.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Architecture */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-secondary" /> Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The frontend talks to Supabase directly for CRUD data (patients, medicines, schedules, history, settings)
            with row-level security isolating each account. AI operations (face recognition, medicine detection,
            validation) are proxied through a Supabase Edge Function gateway that forwards requests to the Python
            FastAPI backend running OpenCV, face_recognition, dlib, YOLOv8, and PyTorch.
          </p>
          <p>
            This separation keeps AI model secrets server-side while letting the web app stay fast and responsive.
            The schema and service interfaces are designed to scale to caregiver alerts, a voice assistant,
            an IoT pill dispenser, a mobile app, and cloud sync.
          </p>
        </CardContent>
      </Card>

      {/* Future integrations */}
      <h3 className="mt-8 text-base font-semibold text-foreground">Built for Future Integration</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {future.map((f, i) => (
          <motion.div key={f.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full rounded-2xl border-dashed">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        SmartMedicationAI · Built with care for elderly healthcare · {new Date().getFullYear()}
      </p>
    </div>
  );
}
