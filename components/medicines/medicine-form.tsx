'use client';

import { useEffect, useState } from 'react';
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

import {
  createMedicine,
  updateMedicine,
} from '@/lib/data';

import type {
  Medicine,
  MedicineInput,
} from '@/lib/types';

import type { MasterMedicine } from '@/lib/ai-services';

import { toast } from 'sonner';

// ------------------------------------------------------------
// Validation schema
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Dropdown values
// ------------------------------------------------------------

const categories = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Drops',
  'Inhaler',
  'Topical',
  'Other',
];

const shapes = [
  'Round',
  'Oval',
  'Capsule',
  'Square',
  'Liquid',
  'Other',
];

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface MedicineFormProps {
  medicine?: Medicine | null;

  // Selected medicine from FastAPI master database
  masterMedicine?: MasterMedicine | null;

  onSaved?: () => void;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export function MedicineForm({
  medicine,
  masterMedicine,
  onSaved,
}: MedicineFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
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

  // ----------------------------------------------------------
  // Auto-fill form when a master medicine is selected
  // ----------------------------------------------------------

  useEffect(() => {
    if (!masterMedicine) {
      return;
    }

    reset({
      name:
        masterMedicine.brand_name ||
        masterMedicine.generic_name ||
        '',

      generic_name:
        masterMedicine.generic_name || '',

      category:
        detectCategory(masterMedicine.dosage_form),

      dosage_form:
        masterMedicine.dosage_form || '',

      strength:
        extractStrength(masterMedicine.generic_name) || '',

      manufacturer:
        masterMedicine.manufacturer || '',

      description:
        [
          masterMedicine.route
            ? `Route: ${masterMedicine.route}`
            : '',

          masterMedicine.product_type
            ? `Product type: ${masterMedicine.product_type}`
            : '',

          masterMedicine.active_ingredients
            ? `Active ingredients: ${masterMedicine.active_ingredients}`
            : '',
        ]
          .filter(Boolean)
          .join(' | '),

      side_effects: '',

      color: '',

      shape: '',

      barcode:
        masterMedicine.upc || '',

      image_url: '',
    });
  }, [masterMedicine, reset]);

  // ----------------------------------------------------------
  // Save medicine
  // ----------------------------------------------------------

  async function onSubmit(values: FormValues) {
    setSaving(true);

    try {
      const input: MedicineInput = {
        name: values.name,

        generic_name:
          values.generic_name || null,

        category:
          values.category || null,

        dosage_form:
          values.dosage_form || null,

        strength:
          values.strength || null,

        manufacturer:
          values.manufacturer || null,

        description:
          values.description || null,

        side_effects:
          values.side_effects || null,

        color:
          values.color || null,

        shape:
          values.shape || null,

        barcode:
          values.barcode || null,

        image_url:
          values.image_url || null,
      };

      if (medicine) {
        await updateMedicine(
          medicine.id,
          input,
        );

        toast.success('Medicine updated');
      } else {
        await createMedicine(input);

        toast.success('Medicine added');
      }

      onSaved?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not save medicine',
      );
    } finally {
      setSaving(false);
    }
  }

  const category = watch('category');
  const shape = watch('shape');

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      {/* ------------------------------------------------------
          Name
      ------------------------------------------------------- */}

      <div className="space-y-2">
        <Label htmlFor="name">
          Name *
        </Label>

        <Input
          id="name"
          {...register('name')}
          className="rounded-xl"
          placeholder="Medicine name"
        />

        {errors.name && (
          <p className="text-xs text-error">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------
          Generic name
      ------------------------------------------------------- */}

      <div className="space-y-2">
        <Label htmlFor="generic_name">
          Generic Name
        </Label>

        <Input
          id="generic_name"
          {...register('generic_name')}
          className="rounded-xl"
          placeholder="Generic medicine name"
        />
      </div>

      {/* ------------------------------------------------------
          Category / Strength / Dosage Form
      ------------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-3">

        <div className="space-y-2">
          <Label>
            Category
          </Label>

          <Select
            value={category ?? ''}
            onValueChange={(value) =>
              setValue('category', value)
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>

            <SelectContent>
              {categories.map((item) => (
                <SelectItem
                  key={item}
                  value={item.toLowerCase()}
                >
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="strength">
            Strength
          </Label>

          <Input
            id="strength"
            {...register('strength')}
            className="rounded-xl"
            placeholder="500mg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dosage_form">
            Dosage Form
          </Label>

          <Input
            id="dosage_form"
            {...register('dosage_form')}
            className="rounded-xl"
            placeholder="Tablet"
          />
        </div>
      </div>

      {/* ------------------------------------------------------
          Color / Shape / Barcode
      ------------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-3">

        <div className="space-y-2">
          <Label htmlFor="color">
            Color
          </Label>

          <Input
            id="color"
            {...register('color')}
            className="rounded-xl"
            placeholder="White"
          />
        </div>

        <div className="space-y-2">
          <Label>
            Shape
          </Label>

          <Select
            value={shape ?? ''}
            onValueChange={(value) =>
              setValue('shape', value)
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>

            <SelectContent>
              {shapes.map((item) => (
                <SelectItem
                  key={item}
                  value={item.toLowerCase()}
                >
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">
            Barcode
          </Label>

          <Input
            id="barcode"
            {...register('barcode')}
            className="rounded-xl"
            placeholder="UPC / barcode"
          />
        </div>
      </div>

      {/* ------------------------------------------------------
          Manufacturer
      ------------------------------------------------------- */}

      <div className="space-y-2">
        <Label htmlFor="manufacturer">
          Manufacturer
        </Label>

        <Input
          id="manufacturer"
          {...register('manufacturer')}
          className="rounded-xl"
          placeholder="Manufacturer"
        />
      </div>

      {/* ------------------------------------------------------
          Description
      ------------------------------------------------------- */}

      <div className="space-y-2">
        <Label htmlFor="description">
          Description
        </Label>

        <Textarea
          id="description"
          {...register('description')}
          className="rounded-xl"
          rows={3}
          placeholder="Medicine information"
        />
      </div>

      {/* ------------------------------------------------------
          Side effects
      ------------------------------------------------------- */}

      <div className="space-y-2">
        <Label htmlFor="side_effects">
          Side Effects
        </Label>

        <Textarea
          id="side_effects"
          {...register('side_effects')}
          className="rounded-xl"
          rows={3}
          placeholder="Known side effects"
        />
      </div>

      {/* ------------------------------------------------------
          Save
      ------------------------------------------------------- */}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-xl"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Helpers
// ============================================================

function detectCategory(
  dosageForm?: string | null,
): string {
  if (!dosageForm) {
    return '';
  }

  const value = dosageForm.toLowerCase();

  if (value.includes('tablet')) {
    return 'tablet';
  }

  if (value.includes('capsule')) {
    return 'capsule';
  }

  if (
    value.includes('syrup') ||
    value.includes('solution') ||
    value.includes('suspension')
  ) {
    return 'syrup';
  }

  if (
    value.includes('injection') ||
    value.includes('injectable')
  ) {
    return 'injection';
  }

  if (
    value.includes('drop') ||
    value.includes('ophthalmic')
  ) {
    return 'drops';
  }

  if (value.includes('inhal')) {
    return 'inhaler';
  }

  if (
    value.includes('cream') ||
    value.includes('ointment') ||
    value.includes('topical')
  ) {
    return 'topical';
  }

  return 'other';
}

function extractStrength(
  name?: string | null,
): string {
  if (!name) {
    return '';
  }

  const match = name.match(
    /\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|%)\b/i,
  );

  return match?.[0] ?? '';
}