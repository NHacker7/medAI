'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  ScanFace,
  CalendarClock,
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { listPatients, deletePatient } from '@/lib/data';
import type { Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { calculateAge } from '@/lib/format';

export default function PatientsPage() {
  const { data: patients, loading, refetch } = useQuery(listPatients, []);
  const [query, setQuery] = useState('');

  const filtered = (patients ?? []).filter((p) =>
    p.full_name.toLowerCase().includes(query.toLowerCase()),
  );

  async function handleDelete(p: Patient) {
    try {
      await deletePatient(p.id);
      toast.success(`${p.full_name} removed`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete patient');
    }
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Manage patient records and profiles."
        icon={Users}
        actions={
          <Link href="/patients/new">
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Add Patient
            </Button>
          </Link>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="h-10 rounded-xl pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Add your first patient to start scheduling and validating medications."
          action={
            <Link href="/patients/new">
              <Button className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Add Patient
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Card className="group relative overflow-hidden rounded-2xl transition-all hover:shadow-soft">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border border-border">
                      {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.full_name} /> : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-semibold text-primary">
                        {p.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Link href={`/patients/${p.id}`}>
                        <h3 className="truncate font-semibold text-foreground hover:text-primary">
                          {p.full_name}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.gender ?? '—'} · {p.date_of_birth ? `${calculateAge(p.date_of_birth)} yrs` : 'Age N/A'}
                      </p>
                    </div>
                    {p.face_registered && (
                      <Badge className="rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/10">
                        <ScanFace className="mr-1 h-3 w-3" /> Face
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {p.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" /> {p.phone}
                      </p>
                    )}
                    {p.address && (
                      <p className="flex items-center gap-2 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {p.address}
                      </p>
                    )}
                    {p.medical_conditions && (
                      <p className="truncate">Conditions: {p.medical_conditions}</p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/patients/${p.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-lg">
                        <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Schedule
                      </Button>
                    </Link>
                    <Link href={`/patients/${p.id}/edit`}>
                      <Button variant="ghost" size="icon" className="rounded-lg" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg text-error hover:text-error" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {p.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the patient and all their schedules and history. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(p)}
                            className="rounded-xl bg-error hover:bg-error"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
