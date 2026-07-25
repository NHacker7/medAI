'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock,
  Pill,
  ScanFace,
  Users,
  XCircle,
} from 'lucide-react';
import { PageHeader, StatCard } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { listPatients, listMedicines, listSchedules, listHistory } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DashboardPage() {
  const { data: patients } = useQuery(listPatients, []);
  const { data: medicines } = useQuery(listMedicines, []);
  const { data: schedules } = useQuery(listSchedules, []);
  const { data: history } = useQuery(listHistory, []);

  const today = new Date().getDay();

  const todaysSchedules = useMemo(
    () =>
      (schedules ?? []).filter(
        (s) => s.active && (s.days_of_week.length === 0 || s.days_of_week.includes(today)),
      ),
    [schedules, today],
  );

  const last7 = useMemo(() => {
    const days: { date: Date; correct: number; wrong: number; unknown: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ date: d, correct: 0, wrong: 0, unknown: 0 });
    }
    for (const h of history ?? []) {
      const d = new Date(h.taken_at);
      d.setHours(0, 0, 0, 0);
      const slot = days.find((x) => x.date.getTime() === d.getTime());
      if (!slot) continue;
      if (h.validation_status === 'correct') slot.correct++;
      else if (h.validation_status === 'wrong') slot.wrong++;
      else slot.unknown++;
    }
    return days;
  }, [history]);

  const maxDay = Math.max(1, ...last7.map((d) => d.correct + d.wrong + d.unknown));
  const recentHistory = (history ?? []).slice(0, 6);

  const correctCount = (history ?? []).filter((h) => h.validation_status === 'correct').length;
  const wrongCount = (history ?? []).filter((h) => h.validation_status === 'wrong').length;
  const adherence = history && history.length > 0
    ? Math.round((correctCount / history.length) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of patients, schedules, and AI validation activity."
        icon={Activity}
        actions={
          <Link href="/validation">
            <Button className="rounded-xl">
              <BrainCircuit className="mr-2 h-4 w-4" /> New Validation
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Patients" value={patients?.length ?? 0} icon={Users} accent="primary" />
        <StatCard label="Medicines" value={medicines?.length ?? 0} icon={Pill} accent="secondary" />
        <StatCard label="Today's Doses" value={todaysSchedules.length} icon={CalendarClock} accent="accent" />
        <StatCard
          label="Adherence"
          value={`${adherence}%`}
          icon={CheckCircle2}
          accent={adherence >= 80 ? 'success' : adherence >= 60 ? 'warning' : 'error'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Weekly activity chart */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Validation Activity — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-end justify-between gap-2 pt-4">
              {last7.map((d, i) => {
                const total = d.correct + d.wrong + d.unknown;
                const heightPct = (total / maxDay) * 100;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full max-w-[44px] flex-1 flex-col justify-end overflow-hidden rounded-lg bg-muted">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.unknown / maxDay) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full bg-warning/70"
                      />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.wrong / maxDay) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 + 0.05 }}
                        className="w-full bg-error/70"
                      />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.correct / maxDay) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                        className="w-full bg-success/70"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {dayNames[d.date.getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success/70" /> Correct</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-error/70" /> Wrong</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning/70" /> Unknown</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/face-recognition', icon: ScanFace, label: 'Identify Patient', desc: 'Face recognition', accent: 'text-primary' },
              { href: '/detection', icon: Pill, label: 'Detect Medicine', desc: 'Webcam scan', accent: 'text-secondary' },
              { href: '/validation', icon: BrainCircuit, label: 'AI Validation', desc: 'Verify dose', accent: 'text-accent' },
              { href: '/schedule', icon: CalendarClock, label: 'View Schedule', desc: "Today's plan", accent: 'text-warning' },
            ].map((a) => (
              <Link key={a.href} href={a.href}>
                <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-soft">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-muted', a.accent)}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Today's schedule */}
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
            <Link href="/schedule">
              <Button variant="ghost" size="sm" className="rounded-lg text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todaysSchedules.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No doses scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todaysSchedules.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.medicine?.name ?? 'Unknown medicine'}
                        {s.medicine?.strength ? ` ${s.medicine.strength}` : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.patient?.full_name ?? 'Unknown patient'}
                        {s.dosage ? ` · ${s.dosage}` : ''}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-lg">
                      {s.scheduled_time.slice(0, 5)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent validation */}
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Validations</CardTitle>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="rounded-lg text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentHistory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No validations yet.</p>
            ) : (
              <div className="space-y-2">
                {recentHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-muted text-xs">
                        {h.patient?.full_name?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {h.patient?.full_name ?? 'Unknown'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {h.detected_medicine_name ?? '—'} · {new Date(h.taken_at).toLocaleString()}
                      </p>
                    </div>
                    {h.validation_status === 'correct' && (
                      <Badge className="rounded-lg bg-success/10 text-success hover:bg-success/10">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                      </Badge>
                    )}
                    {h.validation_status === 'wrong' && (
                      <Badge className="rounded-lg bg-error/10 text-error hover:bg-error/10">
                        <XCircle className="mr-1 h-3 w-3" /> Wrong
                      </Badge>
                    )}
                    {(h.validation_status === 'unknown' || h.validation_status === 'no_face') && (
                      <Badge variant="secondary" className="rounded-lg">
                        {h.validation_status === 'unknown' ? 'Unknown' : 'No face'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
