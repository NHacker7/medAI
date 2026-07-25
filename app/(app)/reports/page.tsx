'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Users,
  Pill,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { PageHeader, StatCard } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { listHistory, listPatients, listMedicines, listSchedules } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  correct: 'hsl(142 71% 45%)',
  wrong: 'hsl(0 84% 60%)',
  unknown: 'hsl(38 92% 50%)',
  no_face: 'hsl(189 95% 43%)',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { data: history } = useQuery(listHistory, []);
  const { data: patients } = useQuery(listPatients, []);
  const { data: medicines } = useQuery(listMedicines, []);
  const { data: schedules } = useQuery(listSchedules, []);
  const [exporting, setExporting] = useState(false);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { correct: 0, wrong: 0, unknown: 0, no_face: 0 };
    for (const h of history ?? []) counts[h.validation_status]++;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [history]);

  const last14 = useMemo(() => {
    const days: { date: string; correct: number; wrong: number; unknown: number; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), correct: 0, wrong: 0, unknown: 0, total: 0 });
    }
    for (const h of history ?? []) {
      const d = new Date(h.taken_at);
      d.setHours(0, 0, 0, 0);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const slot = days.find((x) => x.date === label);
      if (!slot) continue;
      if (h.validation_status === 'correct') slot.correct++;
      else if (h.validation_status === 'wrong') slot.wrong++;
      else slot.unknown++;
      slot.total++;
    }
    return days;
  }, [history]);

  const perPatient = useMemo(() => {
    const map = new Map<string, { name: string; total: number; correct: number }>();
    for (const h of history ?? []) {
      const key = h.patient?.full_name ?? 'Unknown';
      const entry = map.get(h.patient_id) ?? { name: key, total: 0, correct: 0 };
      entry.total++;
      if (h.validation_status === 'correct') entry.correct++;
      map.set(h.patient_id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [history]);

  const correctCount = statusData.find((s) => s.name === 'correct')?.value ?? 0;
  const wrongCount = statusData.find((s) => s.name === 'wrong')?.value ?? 0;
  const total = (history ?? []).length;
  const adherence = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  function handleExportPDF() {
    setExporting(true);
    try {
      // Lightweight client-side PDF via printable HTML window.
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Pop-up blocked. Allow pop-ups to export the PDF.');
        return;
      }
      const rows = (history ?? [])
        .slice(0, 100)
        .map(
          (h) => `<tr>
            <td>${formatDate(h.taken_at, { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${h.patient?.full_name ?? '—'}</td>
            <td>${h.detected_medicine_name ?? '—'}</td>
            <td>${h.expected_medicine_name ?? '—'}</td>
            <td style="text-transform:capitalize">${h.validation_status.replace('_', ' ')}</td>
          </tr>`,
        )
        .join('');
      win.document.write(`<!DOCTYPE html><html><head><title>SmartMedicationAI Report</title>
        <style>
          body{font-family:Inter,Arial,sans-serif;padding:40px;color:#1e293b}
          h1{color:#2563eb;margin-bottom:4px}
          .meta{color:#64748b;font-size:13px;margin-bottom:24px}
          .stats{display:flex;gap:16px;margin-bottom:24px}
          .stat{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
          .stat .label{font-size:12px;color:#64748b}
          .stat .value{font-size:28px;font-weight:700;margin-top:4px}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{text-align:left;background:#f8fafc;padding:10px;border-bottom:2px solid #e2e8f0}
          td{padding:10px;border-bottom:1px solid #e2e8f0}
          .correct{color:#16a34a;font-weight:600}
          .wrong{color:#dc2626;font-weight:600}
        </style></head><body>
        <h1>SmartMedicationAI — Validation Report</h1>
        <div class="meta">Generated ${new Date().toLocaleString()} · Account: ${user?.email ?? '—'}</div>
        <div class="stats">
          <div class="stat"><div class="label">Total Validations</div><div class="value">${total}</div></div>
          <div class="stat"><div class="label">Adherence</div><div class="value">${adherence}%</div></div>
          <div class="stat"><div class="label">Correct</div><div class="value correct">${correctCount}</div></div>
          <div class="stat"><div class="label">Wrong</div><div class="value wrong">${wrongCount}</div></div>
          <div class="stat"><div class="label">Patients</div><div class="value">${patients?.length ?? 0}</div></div>
          <div class="stat"><div class="label">Medicines</div><div class="value">${medicines?.length ?? 0}</div></div>
        </div>
        <h2>Recent Validations</h2>
        <table><thead><tr><th>Time</th><th>Patient</th><th>Detected</th><th>Expected</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`);
      win.document.close();
      toast.success('PDF opened — use your browser\'s print-to-PDF.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Visual analytics across patients, schedules, and validation outcomes."
        icon={BarChart3}
        actions={
          <Button onClick={handleExportPDF} disabled={exporting} className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" /> {exporting ? 'Preparing…' : 'Export PDF'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Validations" value={total} icon={TrendingUp} accent="primary" />
        <StatCard label="Adherence" value={`${adherence}%`} icon={CheckCircle2} accent={adherence >= 80 ? 'success' : 'warning'} />
        <StatCard label="Active Patients" value={patients?.length ?? 0} icon={Users} accent="secondary" />
        <StatCard label="Medicines Tracked" value={medicines?.length ?? 0} icon={Pill} accent="accent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Status distribution */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Validation Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 14-day trend */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">14-Day Validation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="correct" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="wrong" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="unknown" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-patient */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Validations per Patient</CardTitle>
        </CardHeader>
        <CardContent>
          {perPatient.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perPatient} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" fill="hsl(221 83% 53%)" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="correct" name="Correct" fill="hsl(142 71% 45%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
