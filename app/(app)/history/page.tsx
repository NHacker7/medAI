'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { listHistory, listPatients, deleteHistoryEntry } from '@/lib/data';
import type { ValidationStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { formatDateTime, toCSV, downloadFile } from '@/lib/format';
import { cn } from '@/lib/utils';

const statusStyle: Record<ValidationStatus, { icon: typeof CheckCircle2; badge: string }> = {
  correct: { icon: CheckCircle2, badge: 'bg-success/10 text-success hover:bg-success/10' },
  wrong: { icon: XCircle, badge: 'bg-error/10 text-error hover:bg-error/10' },
  unknown: { icon: HelpCircle, badge: 'bg-warning/10 text-warning hover:bg-warning/10' },
  no_face: { icon: AlertTriangle, badge: 'bg-warning/10 text-warning hover:bg-warning/10' },
};

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const presetPatient = searchParams.get('patient');
  const { data: history, loading, refetch } = useQuery(listHistory, []);
  const { data: patients } = useQuery(listPatients, []);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [patientFilter, setPatientFilter] = useState<string>(presetPatient ?? 'all');

  const filtered = useMemo(() => {
    return (history ?? []).filter((h) => {
      if (statusFilter !== 'all' && h.validation_status !== statusFilter) return false;
      if (patientFilter !== 'all' && h.patient_id !== patientFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${h.patient?.full_name ?? ''} ${h.detected_medicine_name ?? ''} ${h.expected_medicine_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [history, query, statusFilter, patientFilter]);

  function handleExport() {
    const rows = filtered.map((h) => ({
      taken_at: formatDateTime(h.taken_at),
      patient: h.patient?.full_name ?? '',
      detected_medicine: h.detected_medicine_name ?? '',
      expected_medicine: h.expected_medicine_name ?? '',
      detected_confidence: h.detected_confidence ?? '',
      face_confidence: h.face_confidence ?? '',
      status: h.validation_status,
      notes: h.notes ?? '',
    }));
    if (rows.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const csv = toCSV(rows);
    downloadFile(`validation-history-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
    toast.success(`Exported ${rows.length} records`);
  }

  async function handleDelete(id: string) {
    try {
      await deleteHistoryEntry(id);
      toast.success('Record deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete record');
    }
  }

  return (
    <div>
      <PageHeader
        title="Validation History"
        description="Search, filter, and export the full audit trail of AI validations."
        icon={HistoryIcon}
        actions={
          <Button onClick={handleExport} variant="outline" className="rounded-xl">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient or medicine…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="correct">Correct</SelectItem>
            <SelectItem value="wrong">Wrong</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
            <SelectItem value="no_face">No face</SelectItem>
          </SelectContent>
        </Select>
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger className="w-[200px] rounded-xl"><SelectValue placeholder="Patient" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All patients</SelectItem>
            {patients?.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No validation records"
          description="Run an AI validation to start building the audit trail."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden rounded-2xl sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((h, i) => {
                    const S = statusStyle[h.validation_status];
                    return (
                      <motion.tr
                        key={h.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-border">
                              {h.patient?.avatar_url ? <AvatarImage src={h.patient.avatar_url} alt={h.patient.full_name} /> : null}
                              <AvatarFallback className="text-[10px]">{h.patient?.full_name?.slice(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{h.patient?.full_name ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{h.detected_medicine_name ?? '—'}</TableCell>
                        <TableCell className="text-sm">{h.expected_medicine_name ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {h.detected_confidence != null ? `${Math.round(h.detected_confidence)}%` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('rounded-lg capitalize', S.badge)}>
                            <S.icon className="mr-1 h-3 w-3" /> {h.validation_status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(h.taken_at)}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-lg text-error hover:text-error" aria-label="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                                <AlertDialogDescription>This permanently removes the validation record from history.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(h.id)} className="rounded-xl bg-error hover:bg-error">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((h) => {
              const S = statusStyle[h.validation_status];
              return (
                <Card key={h.id} className="rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-border">
                          {h.patient?.avatar_url ? <AvatarImage src={h.patient.avatar_url} alt={h.patient.full_name} /> : null}
                          <AvatarFallback className="text-[10px]">{h.patient?.full_name?.slice(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{h.patient?.full_name ?? '—'}</span>
                      </div>
                      <Badge className={cn('rounded-lg capitalize', S.badge)}>
                        <S.icon className="mr-1 h-3 w-3" /> {h.validation_status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Detected: <span className="capitalize">{h.detected_medicine_name ?? '—'}</span></p>
                      <p>Expected: {h.expected_medicine_name ?? '—'}</p>
                      <p>{formatDateTime(h.taken_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {history?.length ?? 0} records.
          </p>
        </>
      )}
    </div>
  );
}
