'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Pill,
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Loader2,
  Database,
} from 'lucide-react';

import {
  searchMasterMedicines,
  type MasterMedicine,
} from '@/lib/ai-services';

import {
  PageHeader,
  EmptyState,
} from '@/components/layout/page-components';

import { useQuery } from '@/hooks/use-query';

import {
  listMedicines,
  deleteMedicine,
  createMedicine,
} from '@/lib/data';

import type { Medicine, MedicineInput } from '@/lib/types';

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
} from '@/components/ui/dialog';

import { MedicineForm } from '@/components/medicines/medicine-form';

import { toast } from 'sonner';

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
  // ============================================================
  // SUPABASE MEDICINE CATALOG
  // ============================================================

  const {
    data: medicines,
    loading,
    refetch,
  } = useQuery(listMedicines, []);

  // ============================================================
  // SEARCH
  // ============================================================

  const [query, setQuery] = useState('');

  // ============================================================
  // MEDICINE FORM
  // ============================================================

  const [editing, setEditing] = useState<Medicine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ============================================================
  // FASTAPI MASTER DATABASE
  // ============================================================

  const [masterResults, setMasterResults] = useState<MasterMedicine[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);

  // ============================================================
  // FILTER EXISTING SUPABASE MEDICINES
  // ============================================================

  const filtered = (medicines ?? []).filter((medicine) => {
    const search = query.toLowerCase();

    return (
      medicine.name.toLowerCase().includes(search) ||
      (medicine.generic_name ?? '').toLowerCase().includes(search)
    );
  });

  // ============================================================
  // SEARCH FASTAPI MASTER DATABASE
  // ============================================================

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setMasterResults([]);
      setMasterError(null);
      setMasterLoading(false);
      return;
    }

    let cancelled = false;

    async function searchDatabase() {
      setMasterLoading(true);
      setMasterError(null);

      try {
        const result = await searchMasterMedicines(
          trimmedQuery,
          10
        );

        if (cancelled) return;

        setMasterResults(result.medicines ?? []);
      } catch (error) {
        if (cancelled) return;

        setMasterResults([]);

        setMasterError(
          error instanceof Error
            ? error.message
            : 'Could not search medicine database.'
        );
      } finally {
        if (!cancelled) {
          setMasterLoading(false);
        }
      }
    }

    // Wait 400ms before calling FastAPI.
    // Prevents a request for every single keystroke.
    const timer = setTimeout(searchDatabase, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // ============================================================
  // OPEN EMPTY MEDICINE FORM
  // ============================================================

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  // ============================================================
  // OPEN EDIT FORM
  // ============================================================

  function openEdit(medicine: Medicine) {
    setEditing(medicine);
    setDialogOpen(true);
  }

  // ============================================================
  // ADD MASTER MEDICINE TO SUPABASE
  // ============================================================

  async function handleAddMasterMedicine(
    master: MasterMedicine
  ) {
    try {
      const name =
        master.brand_name?.trim() ||
        master.generic_name?.trim() ||
        'Unknown Medicine';

      const genericName =
        master.generic_name?.trim() || null;

      // Convert master database dosage form
      // into your application's category.
      const dosageForm =
        master.dosage_form?.trim() || null;

      let category: string | null = null;

      const form = dosageForm?.toLowerCase() ?? '';

      if (form.includes('tablet')) {
        category = 'tablet';
      } else if (form.includes('capsule')) {
        category = 'capsule';
      } else if (form.includes('syrup')) {
        category = 'syrup';
      } else if (form.includes('injection')) {
        category = 'injection';
      } else if (
        form.includes('drop') ||
        form.includes('ophthalmic')
      ) {
        category = 'drops';
      } else if (form.includes('inhal')) {
        category = 'inhaler';
      } else if (
        form.includes('cream') ||
        form.includes('ointment') ||
        form.includes('gel') ||
        form.includes('topical')
      ) {
        category = 'topical';
      }

      const input: MedicineInput = {
        name,
        generic_name: genericName,
        category,
        dosage_form: dosageForm,
        strength: null,
        manufacturer:
          master.manufacturer?.trim() || null,
        description:
          master.active_ingredients?.trim()
            ? `Active ingredients: ${master.active_ingredients}`
            : null,
        side_effects: null,
        color: null,
        shape: null,
        barcode: master.upc?.trim() || null,
        image_url: null,
      };

      await createMedicine(input);

      toast.success(`${name} added to your medicine catalog`);

      // Refresh Supabase medicines.
      await refetch();

      // Clear search.
      setQuery('');

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not add medicine'
      );
    }
  }

  // ============================================================
  // DELETE MEDICINE
  // ============================================================

  async function handleDelete(medicine: Medicine) {
    try {
      await deleteMedicine(medicine.id);

      toast.success(`${medicine.name} removed`);

      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not delete medicine'
      );
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>

      {/* ========================================================
          PAGE HEADER
      ========================================================= */}

      <PageHeader
        title="Medicine Database"
        description="Manage the catalog of medicines available for scheduling and detection."
        icon={Pill}
        actions={
          <Button
            onClick={openNew}
            className="rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Medicine
          </Button>
        }
      />

      {/* ========================================================
          SEARCH BOX
      ========================================================= */}

      <div className="relative mb-6 max-w-md">
        <Search
          className="
            pointer-events-none
            absolute
            left-3
            top-1/2
            h-4
            w-4
            -translate-y-1/2
            text-muted-foreground
          "
        />

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search medicine name, brand or ingredient..."
          className="h-10 rounded-xl pl-9"
        />
      </div>

      {/* ========================================================
          FASTAPI MASTER DATABASE RESULTS
      ========================================================= */}

      {query.trim() && (
        <Card className="mb-6 rounded-2xl">
          <CardContent className="p-5">

            {/* HEADER */}

            <div className="mb-4 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Master Medicine Database
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    Search results from FastAPI
                  </p>
                </div>

              </div>

              {masterLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </div>
              )}

            </div>

            {/* ERROR */}

            {masterError && (
              <div className="rounded-xl border border-error/30 bg-error/5 p-4">

                <p className="text-sm font-medium text-error">
                  Medicine database unavailable
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {masterError}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  Make sure FastAPI is running:
                </p>

                <code className="mt-1 block rounded-lg bg-muted p-2 text-xs">
                  http://127.0.0.1:8000
                </code>

              </div>
            )}

            {/* LOADING */}

            {masterLoading && (
              <div className="space-y-2">

                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl bg-muted"
                  />
                ))}

              </div>
            )}

            {/* NO RESULTS */}

            {!masterLoading &&
              !masterError &&
              masterResults.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center">

                  <Package className="mx-auto h-6 w-6 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">
                    No medicines found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Try another medicine name, brand or active ingredient.
                  </p>

                </div>
              )}

            {/* RESULTS */}

            {!masterLoading &&
              !masterError &&
              masterResults.length > 0 && (

                <div className="space-y-2">

                  {masterResults.map((medicine) => (

                    <div
                      key={medicine.medicine_id}
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        border
                        p-3
                        transition-colors
                        hover:bg-muted/50
                      "
                    >

                      {/* ICON */}

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Pill className="h-5 w-5" />
                      </div>

                      {/* INFORMATION */}

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <p className="truncate text-sm font-semibold">
                            {medicine.brand_name ||
                              medicine.generic_name ||
                              'Unknown medicine'}
                          </p>

                          {medicine.dosage_form && (
                            <Badge
                              variant="secondary"
                              className="hidden rounded-lg sm:inline-flex"
                            >
                              {medicine.dosage_form}
                            </Badge>
                          )}

                        </div>

                        <p className="truncate text-xs text-muted-foreground">
                          Generic: {medicine.generic_name || '—'}
                        </p>

                        <p className="truncate text-xs text-muted-foreground">
                          Manufacturer: {medicine.manufacturer || '—'}
                        </p>

                        {medicine.active_ingredients && (
                          <p className="truncate text-xs text-muted-foreground">
                            Ingredient: {medicine.active_ingredients}
                          </p>
                        )}

                      </div>

                      {/* MASTER ID */}

                      <div className="hidden text-right text-[10px] text-muted-foreground md:block">
                        <p>Master ID</p>
                        <p className="font-medium">
                          {medicine.medicine_id}
                        </p>
                      </div>

                      {/* ADD BUTTON */}

                      <Button
                        size="sm"
                        className="rounded-lg"
                        onClick={() =>
                          handleAddMasterMedicine(medicine)
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add
                      </Button>

                    </div>

                  ))}

                </div>

              )}

            {/* RESULT COUNT */}

            {!masterLoading &&
              !masterError &&
              masterResults.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing {masterResults.length} results from the master database.
                </p>
              )}

          </CardContent>
        </Card>
      )}

      {/* ========================================================
          SUPABASE MEDICINE CATALOG
      ========================================================= */}

      {!query.trim() && (

        <>

          {loading ? (

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl bg-muted"
                />
              ))}

            </div>

          ) : filtered.length === 0 ? (

            <EmptyState
              icon={Package}
              title="No medicines yet"
              description="Search the master database above or add a medicine manually."
              action={
                <Button
                  onClick={openNew}
                  className="rounded-xl"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medicine
                </Button>
              }
            />

          ) : (

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {filtered.map((medicine, index) => (

                <motion.div
                  key={medicine.id}
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.03,
                  }}
                >

                  <Card className="group h-full rounded-2xl transition-all hover:shadow-soft">

                    <CardContent className="flex h-full flex-col p-5">

                      {/* MEDICINE HEADER */}

                      <div className="flex items-start gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                          <Pill className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">

                          <h3 className="truncate font-semibold text-foreground">
                            {medicine.name}
                          </h3>

                          <p className="truncate text-xs text-muted-foreground">
                            {medicine.generic_name ?? '—'}

                            {medicine.strength
                              ? ` · ${medicine.strength}`
                              : ''}
                          </p>

                        </div>

                        {medicine.category && (
                          <Badge
                            className={`rounded-lg ${
                              categoryColors[
                                medicine.category.toLowerCase()
                              ] ??
                              'bg-muted text-muted-foreground'
                            }`}
                          >
                            {medicine.category}
                          </Badge>
                        )}

                      </div>

                      {/* DETAILS */}

                      <div className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">

                        {medicine.manufacturer && (
                          <p>
                            Manufacturer:{' '}
                            {medicine.manufacturer}
                          </p>
                        )}

                        {medicine.dosage_form && (
                          <p>
                            Form:{' '}
                            {medicine.dosage_form}
                          </p>
                        )}

                        {medicine.color && (
                          <p>
                            Color:{' '}
                            {medicine.color}

                            {medicine.shape
                              ? ` · Shape: ${medicine.shape}`
                              : ''}
                          </p>
                        )}

                        {medicine.description && (
                          <p className="line-clamp-2">
                            {medicine.description}
                          </p>
                        )}

                      </div>

                      {/* ACTIONS */}

                      <div className="mt-4 flex items-center gap-2">

                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-lg"
                          onClick={() =>
                            openEdit(medicine)
                          }
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>

                        <AlertDialog>

                          <AlertDialogTrigger asChild>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-lg text-error hover:text-error"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                          </AlertDialogTrigger>

                          <AlertDialogContent className="rounded-2xl">

                            <AlertDialogHeader>

                              <AlertDialogTitle>
                                Delete {medicine.name}?
                              </AlertDialogTitle>

                              <AlertDialogDescription>
                                This removes the medicine from
                                the catalog. Schedules referencing
                                it will also be removed.
                              </AlertDialogDescription>

                            </AlertDialogHeader>

                            <AlertDialogFooter>

                              <AlertDialogCancel className="rounded-xl">
                                Cancel
                              </AlertDialogCancel>

                              <AlertDialogAction
                                onClick={() =>
                                  handleDelete(medicine)
                                }
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

        </>

      )}

      {/* ========================================================
          MANUAL ADD / EDIT MEDICINE DIALOG
      ========================================================= */}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >

        <DialogContent className="max-w-2xl rounded-2xl">

          <DialogHeader>

            <DialogTitle>
              {editing
                ? 'Edit Medicine'
                : 'Add Medicine'}
            </DialogTitle>

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