'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createMedicine, updateMedicine } from '@/lib/data';
import type { Medicine, MedicineInput } from '@/lib/types';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  generic_name: z.string().optional(),
  category: z.string().optional(),
  dosage_form: z.string().optional(),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  description: z.string().optional(),
  side_effects: z.string().optional(),
  color: z.string().optional(),
  shape: z.string().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const categories = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Inhaler', 'Topical', 'Other'];
const shapes = ['Round', 'Oval', 'Capsule', 'Square', 'Liquid', 'Other'];

interface MedicineFormProps {
  medicine?: Medicine | null;
  onSaved?: () => void;
}

export function MedicineForm({ medicine, onSaved }: MedicineFormProps) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: medicine?.name ?? '',
      generic_name: medicine?.generic_name ?? '',
      category: medicine?.category ?? '',
      dosage_form: medicine?.dosage_form ?? '',
      strength: medicine?.strength ?? '',
      manufacturer: medicine?.manufacturer ?? '',
      description: medicine?.description ?? '',
      side_effects: medicine?.side_effects ?? '',
      color: medicine?.color ?? '',
      shape: medicine?.shape ?? '',
      barcode: medicine?.barcode ?? '',
      image_url: medicine?.image_url ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const input: MedicineInput = {
        name: values.name,
        generic_name: values.generic_name || null,
        category: values.category || null,
        dosage_form: values.dosage_form || null,
        strength: values.strength || null,
        manufacturer: values.manufacturer || null,
        description: values.description || null,
        side_effects: values.side_effects || null,
        color: values.color || null,
        shape: values.shape || null,
        barcode: values.barcode || null,
        image_url: values.image_url || null,
      };
      if (medicine) {
        await updateMedicine(medicine.id, input);
        toast.success('Medicine updated');
      } else {
        await createMedicine(input);
        toast.success('Medicine added');
      }
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save medicine');
    } finally {
      setSaving(false);
    }
  }

  const category = watch('category');
  const shape = watch('shape');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} className="rounded-xl" />
          {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="generic_name">Generic Name</Label>
          <Input id="generic_name" {...register('generic_name')} className="rounded-xl" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category ?? ''} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="strength">Strength</Label>
          <Input id="strength" {...register('strength')} className="rounded-xl" placeholder="500mg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dosage_form">Dosage Form</Label>
          <Input id="dosage_form" {...register('dosage_form')} className="rounded-xl" placeholder="Oral" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" {...register('color')} className="rounded-xl" placeholder="White" />
        </div>
        <div className="space-y-2">
          <Label>Shape</Label>
          <Select value={shape ?? ''} onValueChange={(v) => setValue('shape', v)}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {shapes.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" {...register('barcode')} className="rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Input id="manufacturer" {...register('manufacturer')} className="rounded-xl" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} className="rounded-xl" rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="side_effects">Side Effects</Label>
        <Textarea id="side_effects" {...register('side_effects')} className="rounded-xl" rows={2} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="rounded-xl">
          {saving ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
          ) : (
            <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save</span>
          )}
        </Button>
      </div>
    </form>
  );
}
