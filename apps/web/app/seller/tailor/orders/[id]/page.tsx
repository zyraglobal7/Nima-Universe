'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Calendar, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

const STATUS_LABELS: Record<string, string> = {
  payment_pending: 'Awaiting payment', paid: 'New order', acknowledged: 'Acknowledged',
  fabric_sourced: 'Fabric sourced', cut: 'Cut', stitched: 'Stitched',
  qc_pending: 'Ready for QC', qc_passed: 'QC passed', qc_failed: 'QC failed',
  dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled',
};

const TAILOR_TRANSITIONS: Record<string, { label: string; confirm?: string }> = {
  paid: { label: 'Acknowledge order', confirm: 'Confirm you have received this order?' },
  acknowledged: { label: 'Mark fabric sourced' },
  fabric_sourced: { label: 'Mark cut' },
  cut: { label: 'Mark stitched' },
  stitched: { label: 'Ready for pickup (QC)' },
};

export default function TailorOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as Id<'tailoredOrders'>;

  const order = useQuery(api.tailor.tailoredOrders.queries.getById, { tailoredOrderId: orderId });
  const advanceStatus = useMutation(api.tailor.tailoredOrders.mutations.advanceStatus);

  const [advancing, setAdvancing] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(true);

  if (order === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-3">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="ghost" onClick={() => router.push('/seller/tailor/orders')}>Back to orders</Button>
      </div>
    );
  }

  const nextStep = TAILOR_TRANSITIONS[order.status];

  async function handleAdvance() {
    if (!nextStep) return;
    if (nextStep.confirm && !confirm(nextStep.confirm)) return;
    setAdvancing(true);
    try {
      await advanceStatus({ tailoredOrderId: orderId });
      toast.success('Status updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setAdvancing(false);
    }
  }

  const measurements = order.measurementSnapshot as Record<string, number> | null;

  return (
    <div className="max-w-lg space-y-6 pb-16">
      <button
        onClick={() => router.push('/seller/tailor/orders')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All orders
      </button>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-serif font-semibold">{order.orderNumber}</h1>
          <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          KES {order.retailPriceKES.toLocaleString()} retail · Your payout: KES {order.tailorPayoutKES.toLocaleString()}
        </p>
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">Deadline:</span>
        <span className="font-medium">
          {new Date(order.deadlineDate).toLocaleDateString('en-KE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
      </div>

      {/* Measurements */}
      {measurements && (
        <Collapsible open={measurementsOpen} onOpenChange={setMeasurementsOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Ruler className="w-4 h-4" />
              Customer measurements
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${measurementsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-b-lg border border-t-0 border-border bg-card px-4 pb-4 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(measurements).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-0.5 border-b border-border/50">
                    <span className="text-muted-foreground capitalize">{k}</span>
                    <span className="font-medium">{v} cm</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Status history */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Status history</h2>
        <div className="space-y-1">
          {order.statusHistory.map((entry, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-border/50">
              <span className="capitalize text-foreground">{STATUS_LABELS[entry.status] ?? entry.status}</span>
              <span className="text-muted-foreground">
                {new Date(entry.at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action button */}
      {nextStep && order.status !== 'qc_pending' && order.status !== 'cancelled' && (
        <Button className="w-full" onClick={handleAdvance} disabled={advancing}>
          {advancing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {nextStep.label}
        </Button>
      )}

      {order.status === 'qc_pending' && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground text-center">
          Garment is ready for pickup. Nima QC team will collect and inspect it.
        </div>
      )}
    </div>
  );
}
