'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Pill,
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { listMedicines, deleteMedicine } from '@/lib/data';
import type { Medicine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MedicineForm } from '@/components/medicines/medicine-form';
import { toast } from 'sonner';
import Link from 'next/link';

const categoryColors: Record<string, string> = {
  tablet: 'bg-primary/10 text-primary',
  capsule: 'bg-secondary/10 text-secondary',
  syrup: 'bg-accent/10 text-accent',
  injection: 'bg-error/10 text-error',
  drops: 'bg-warning/10 text-warning',
  inhaler: 'bg-primary/10 text-primary',
  topical: 'bg-secondary/10 text-secondary',
};

export default function MedicinesPage() {
  const { data: medicines, loading, refetch } = useQuery(listMedicines, []);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = (medicines ?? []).filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      (m.generic_name ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(m: Medicine) {
    setEditing(m);
    setDialogOpen(true);
  }

  async function handleDelete(m: Medicine) {
    try {
      await deleteMedicine(m.id);
      toast.success(`${m.name} removed`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete medicine');
    }
  }

  return (
    <div>
      <PageHeader
        title="Medicine Database"
        description="Manage the catalog of medicines available for scheduling and detection."
        icon={Pill}
        actions={
          <Button onClick={openNew} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Medicine
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search medicines…"
          className="h-10 rounded-xl pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No medicines yet"
          description="Add medicines to the catalog so you can schedule and validate them."
          action={
            <Button onClick={openNew} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Add Medicine
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <Card className="group h-full rounded-2xl transition-all hover:shadow-soft">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">{m.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.generic_name ?? '—'} {m.strength ? `· ${m.strength}` : ''}
                      </p>
                    </div>
                    {m.category && (
                      <Badge className={`rounded-lg ${categoryColors[m.category.toLowerCase()] ?? 'bg-muted text-muted-foreground'}`}>
                        {m.category}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                    {m.manufacturer && <p>Manufacturer: {m.manufacturer}</p>}
                    {m.dosage_form && <p>Form: {m.dosage_form}</p>}
                    {m.color && <p>Color: {m.color}{m.shape ? ` · Shape: ${m.shape}` : ''}</p>}
                    {m.description && <p className="line-clamp-2">{m.description}</p>}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-lg" onClick={() => openEdit(m)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg text-error hover:text-error" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {m.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the medicine from the catalog. Schedules referencing it will also be removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(m)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Medicine' : 'Add Medicine'}</DialogTitle>
          </DialogHeader>
          <MedicineForm
            medicine={editing}
            onSaved={() => {
              setDialogOpen(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
