'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, Loader2, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

type GarmentType = 'dress' | 'trouser' | 'skirt' | 'top';

function itemCategoryToGarmentType(category: string): GarmentType {
  if (category === 'dress') return 'dress';
  if (category === 'bottom') return 'trouser';
  if (category === 'top') return 'top';
  return 'dress';
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) return '254' + digits.slice(1);
  if (digits.startsWith('254')) return digits;
  return '254' + digits;
}

export default function TailorCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.itemId as Id<'items'>;

  const item = useQuery(api.items.queries.getTailoredDesign, { itemId });
  const garmentType: GarmentType = item ? itemCategoryToGarmentType(item.category) : 'dress';

  const measurements = useQuery(
    api.tailor.measurements.queries.getByGarmentType,
    item ? { garmentType } : 'skip'
  );

  const createOrder = useMutation(api.tailor.tailoredOrders.mutations.create);

  const [phone, setPhone] = useState('');
  const [placing, setPlacing] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  const loading = item === undefined || measurements === undefined;

  async function handlePay() {
    if (!item) return;

    if (!measurements) {
      toast.error('Please add your measurements first');
      router.push(`/tailor/measurements/${garmentType}?next=/tailor/checkout/${itemId}`);
      return;
    }

    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length < 12) {
      toast.error('Please enter a valid Kenyan phone number');
      return;
    }

    setPlacing(true);
    try {
      const { orderNumber } = await createOrder({
        itemId,
        mpesaPhoneNumber: formattedPhone,
        garmentType,
      });
      toast.success('Order placed! Check your phone for the M-Pesa prompt.');
      router.push(`/tailor/orders/${orderNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-3">
        <p className="text-text-secondary">Design not found.</p>
        <Button variant="ghost" onClick={() => router.push('/tailor/feed')}>Back to feed</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-xl font-serif font-semibold text-text-primary">Confirm &amp; pay</h1>
        <p className="text-sm text-text-secondary mt-1">Full payment via M-Pesa. No balance on delivery.</p>
      </div>

      {/* Order summary */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{item.name}</span>
          <span className="font-semibold text-text-primary">KES {item.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Lead time</span>
          <span className="text-text-primary">7–10 days</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-medium text-text-primary">Total</span>
          <span className="font-bold text-lg text-primary">KES {item.price.toLocaleString()}</span>
        </div>
      </div>

      {/* Measurements summary */}
      {measurements ? (
        <Collapsible open={measurementsOpen} onOpenChange={setMeasurementsOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:bg-surface-2 transition-colors">
            <span className="flex items-center gap-2 text-text-secondary">
              <Ruler className="w-4 h-4" />
              Your measurements (saved)
            </span>
            <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${measurementsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-b-lg border border-t-0 border-border bg-surface px-4 pb-4 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
                {Object.entries(measurements.values as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize">{k}</span>
                    <span className="font-medium text-text-primary">{v} cm</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 flex gap-3 items-center">
          <Ruler className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            Measurements needed
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => router.push(`/tailor/measurements/${garmentType}?next=/tailor/checkout/${itemId}`)}
          >
            Add
          </Button>
        </div>
      )}

      {/* M-Pesa phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">M-Pesa phone number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="07XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-text-secondary">You'll receive an M-Pesa STK push on this number.</p>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handlePay}
        disabled={placing || !measurements}
      >
        {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Pay KES {item.price.toLocaleString()} via M-Pesa
      </Button>
    </div>
  );
}
