'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type GarmentType = 'dress' | 'trouser' | 'skirt' | 'top';

const MEASUREMENT_FIELDS: Record<GarmentType, readonly string[]> = {
  dress: [
    'bust', 'upperBust', 'underbust', 'waist', 'hips',
    'bustPoint', 'underbustPoint', 'bodice', 'hipline',
    'fullLength', 'shortLength', 'midLength',
    'armhole', 'biceps', 'sleeveLength', 'wrist',
    'cleavage', 'neckRound',
  ],
  trouser: ['waist', 'hips', 'thighs', 'flyCrotch', 'kneeRound', 'trouserLength'],
  skirt: ['waist', 'hips', 'skirtLength'],
  top: ['topLength', 'bust', 'shoulder', 'sleeveLength'],
};

const FIELD_LABELS: Record<string, string> = {
  bust: 'Bust', upperBust: 'Upper bust', underbust: 'Underbust', waist: 'Waist',
  hips: 'Hips', bustPoint: 'Bust point', underbustPoint: 'Underbust point',
  bodice: 'Bodice length', hipline: 'Hip line', fullLength: 'Full length',
  shortLength: 'Short length', midLength: 'Mid length', armhole: 'Armhole',
  biceps: 'Biceps', sleeveLength: 'Sleeve length', wrist: 'Wrist',
  cleavage: 'Cleavage depth', neckRound: 'Neck round', thighs: 'Thighs',
  flyCrotch: 'Fly/crotch', kneeRound: 'Knee round', trouserLength: 'Trouser length',
  skirtLength: 'Skirt length', topLength: 'Top length', shoulder: 'Shoulder width',
};

const GARMENT_LABELS: Record<GarmentType, string> = {
  dress: 'Dress', trouser: 'Trouser', skirt: 'Skirt', top: 'Top',
};

const VALID_GARMENT_TYPES = new Set<string>(['dress', 'trouser', 'skirt', 'top']);

function isValidGarmentType(s: string): s is GarmentType {
  return VALID_GARMENT_TYPES.has(s);
}

export default function MeasurementsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rawType = params.garmentType as string;
  const nextUrl = searchParams.get('next');

  const garmentType = isValidGarmentType(rawType) ? rawType : null;

  const existing = useQuery(
    api.tailor.measurements.queries.getByGarmentType,
    garmentType ? { garmentType } : 'skip'
  );

  const writeMutation = useMutation(api.tailor.measurements.mutations.write);

  const fields = garmentType ? MEASUREMENT_FIELDS[garmentType] : [];

  const initialValues = Object.fromEntries(fields.map((f) => [f, '']));
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);

  // Populate from existing if available
  const populated = existing?.values as Record<string, number> | undefined;

  function getValue(field: string): string {
    if (values[field] !== '') return values[field];
    if (populated?.[field] !== undefined) return String(populated[field]);
    return '';
  }

  async function handleSubmit(source: 'form_upload' | 'cv_landmarking') {
    if (!garmentType) return;
    const numericValues: Record<string, number> = {};
    for (const field of fields) {
      const raw = getValue(field);
      const num = parseFloat(raw);
      if (isNaN(num) || num <= 0) {
        toast.error(`Please enter a valid value for ${FIELD_LABELS[field] ?? field}`);
        return;
      }
      numericValues[field] = num;
    }

    setSaving(true);
    try {
      await writeMutation({ garmentType, values: numericValues, source });
      toast.success('Measurements saved');
      if (nextUrl) {
        router.push(nextUrl);
      } else {
        router.back();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save measurements');
    } finally {
      setSaving(false);
    }
  }

  if (!garmentType) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-muted-foreground">Invalid garment type.</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {(['dress', 'trouser', 'skirt', 'top'] as GarmentType[]).map((t) => (
            <Button key={t} variant="outline" onClick={() => router.push(`/tailor/measurements/${t}`)}>
              {GARMENT_LABELS[t]}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-xl font-serif font-semibold text-foreground">
          {GARMENT_LABELS[garmentType]} measurements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">All values in centimetres (cm).</p>
      </div>

      <Tabs defaultValue="form">
        <TabsList className="w-full">
          <TabsTrigger value="form" className="flex-1">Form upload</TabsTrigger>
          <TabsTrigger value="cv" className="flex-1">Camera scan</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field} className="text-xs text-muted-foreground">
                  {FIELD_LABELS[field] ?? field} (cm)
                </Label>
                <Input
                  id={field}
                  type="number"
                  min={1}
                  max={250}
                  step={0.5}
                  placeholder="0"
                  value={getValue(field)}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => handleSubmit('form_upload')}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save measurements
          </Button>
        </TabsContent>

        <TabsContent value="cv" className="space-y-4 pt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Camera scanning is less accurate than manual entry. We strongly recommend confirming all values before ordering.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-alt p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Camera-based measurement scanning is coming soon. Use the Form tab in the meantime.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
