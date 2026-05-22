'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Loader2, Scissors, MessageCircle, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const GARMENT_TYPES = ['dress', 'top', 'trouser', 'skirt'] as const;
type GarmentType = typeof GARMENT_TYPES[number];

const GARMENT_LABELS: Record<GarmentType, string> = {
  dress: 'Dress',
  top: 'Top',
  trouser: 'Trousers',
  skirt: 'Skirt',
};

const MEASUREMENT_KEY_LABELS: Record<string, string> = {
  bust: 'Bust',
  waist: 'Waist',
  hips: 'Hips',
  shoulder: 'Shoulder',
  length: 'Length',
  sleeve: 'Sleeve',
  inseam: 'Inseam',
  thigh: 'Thigh',
  neck: 'Neck',
};

function MeasurementRow({ label, value, unit = 'cm' }: { label: string; value: unknown; unit?: string }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{String(value)} {unit}</span>
    </div>
  );
}

export default function InspirationBookPage() {
  const { id, sellerId } = useParams<{ id: string; sellerId: string }>();
  const router = useRouter();

  const feed = useQuery(api.tailor.inspirations.queries.getCustomerFeed, {});
  const tailors = useQuery(api.tailor.inspirations.queries.getTailorsForInspiration, {
    inspirationId: id as Id<'tailorInspirations'>,
  });
  const allMeasurements = useQuery(api.tailor.measurements.queries.getAll, {});

  const inspo = feed?.find((i) => i._id === id);
  const tailor = tailors?.find((t) => t.sellerId === sellerId);
  const loading = feed === undefined || tailors === undefined || allMeasurements === undefined;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const measurementsByType = Object.fromEntries(
    (allMeasurements ?? []).map((m) => [m.garmentType, m])
  ) as Record<GarmentType, (typeof allMeasurements)[number] | undefined>;

  const hasMeasurements = allMeasurements.length > 0;
  const missingTypes = GARMENT_TYPES.filter((t) => !measurementsByType[t]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-20 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-xl font-serif font-semibold">Book this style</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send your measurements to the tailor. They&apos;ll confirm price and availability.
        </p>
      </div>

      {/* Style + tailor */}
      <div className="flex gap-3 items-center p-4 rounded-xl border border-border bg-surface">
        {inspo?.imageUrl && (
          <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={inspo.imageUrl} alt={inspo.title ?? 'Style'} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight">{inspo?.title ?? 'Custom style'}</p>
          {inspo?.tags && inspo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {inspo.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {tailor && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <Avatar className="h-10 w-10">
            {tailor.logoUrl && <AvatarImage src={tailor.logoUrl} />}
            <AvatarFallback className="bg-primary/10 text-primary">{tailor.shopName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{tailor.shopName}</p>
            {tailor.turnaroundDays && (
              <p className="text-xs text-muted-foreground">Ready in {tailor.turnaroundDays}+ days</p>
            )}
          </div>
        </div>
      )}

      {/* Measurements section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Your measurements</h2>
          {hasMeasurements && (
            <button
              onClick={() => router.push(`/tailor/measurements/dress?next=/tailor/inspiration/${id}/book/${sellerId}`)}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {hasMeasurements ? (
          <>
            {/* Existing measurements */}
            <div className="grid grid-cols-2 gap-2">
              {GARMENT_TYPES.filter((t) => measurementsByType[t]).map((type) => {
                const m = measurementsByType[type]!;
                const entries = Object.entries(m.values ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
                return (
                  <div key={type} className="rounded-xl border border-border bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{GARMENT_LABELS[type]}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    {entries.slice(0, 4).map(([key, val]) => (
                      <MeasurementRow
                        key={key}
                        label={MEASUREMENT_KEY_LABELS[key] ?? key}
                        value={val}
                      />
                    ))}
                    {entries.length > 4 && (
                      <p className="text-[10px] text-muted-foreground pt-0.5">+{entries.length - 4} more</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Missing garment types */}
            {missingTypes.length > 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium">Missing: {missingTypes.map((t) => GARMENT_LABELS[t]).join(', ')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Adding more measurements helps tailors give you a more accurate quote.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {missingTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => router.push(`/tailor/measurements/${type}?next=/tailor/inspiration/${id}/book/${sellerId}`)}
                      className="inline-flex items-center gap-1 text-[11px] bg-muted hover:bg-muted/80 rounded-full px-2.5 py-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> {GARMENT_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* No measurements at all */
          <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-3">
            <Scissors className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
            <div>
              <p className="font-medium text-sm">No measurements yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The tailor needs your measurements to give you an accurate quote and timeline.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/tailor/measurements/dress?next=/tailor/inspiration/${id}/book/${sellerId}`)}
            >
              Add measurements
            </Button>
          </div>
        )}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={() => router.push('/messages')}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Message tailor
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Full M-Pesa checkout coming soon. For now, message the tailor to arrange your order.
      </p>
    </div>
  );
}
