'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowRight, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const fn = mode === 'login' ? signIn : signUp;
      const { error } = await fn(email, password);
      if (error) {
        toast.error(error);
        return;
      }
      if (mode === 'signup') {
        toast.success('Account created. You are signed in.');
      }
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern [background-size:32px_32px] opacity-40" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-foreground">
                SmartMedication<span className="text-gradient">AI</span>
              </p>
              <p className="text-xs text-muted-foreground">AI-Powered Medication Validation</p>
            </div>
          </div>

          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-bold leading-tight tracking-tight text-foreground"
            >
              Safer medication for the people you care for.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-base text-muted-foreground"
            >
              Face recognition identifies the patient. Computer vision detects the medicine.
              AI validates the right dose at the right time — and keeps a full audit trail.
            </motion.p>

            <div className="mt-8 space-y-3">
              {[
                { icon: ShieldCheck, text: 'Face-verified patient identity' },
                { icon: Sparkles, text: 'YOLOv8 medicine detection' },
                { icon: Activity, text: 'Real-time AI validation & history' },
              ].map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 text-primary shadow-soft backdrop-blur">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SmartMedicationAI. Built for elderly healthcare.
          </p>
        </div>

        {/* Right auth panel */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="glass-card rounded-2xl p-8">
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <p className="text-base font-bold tracking-tight">
                  SmartMedication<span className="text-gradient">AI</span>
                </p>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === 'login'
                  ? 'Sign in to manage your patients and validations.'
                  : 'Start validating medications in minutes.'}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@clinic.com"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl text-base"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Please wait…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Protected by Supabase Auth. Your data is encrypted and isolated to your account.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
