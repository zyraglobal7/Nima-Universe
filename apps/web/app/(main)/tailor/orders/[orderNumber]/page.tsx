'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Package, ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ORDER_STEPS = [
  { status: 'paid', label: 'Payment confirmed' },
  { status: 'acknowledged', label: 'Tailor acknowledged' },
  { status: 'fabric_sourced', label: 'Fabric sourced' },
  { status: 'cut', label: 'Cut' },
  { status: 'stitched', label: 'Stitched' },
  { status: 'qc_pending', label: 'Quality check' },
  { status: 'qc_passed', label: 'QC passed' },
  { status: 'dispatched', label: 'Dispatched' },
  { status: 'delivered', label: 'Delivered' },
] as const;

const STATUS_ORDER = [
  'payment_pending', 'paid', 'acknowledged', 'fabric_sourced',
  'cut', 'stitched', 'qc_pending', 'qc_passed', 'dispatched', 'delivered',
];

type StatusHistoryEntry = { status: string; at: number; note?: string };

function getTimestampForStep(
  status: string,
  history: StatusHistoryEntry[]
): number | undefined {
  return history.find((h) => h.status === status)?.at;
}

export default function TailorOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const order = useQuery(api.tailor.tailoredOrders.queries.getByOrderNumber, { orderNumber });

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
        <Package className="w-12 h-12 text-text-secondary opacity-30 mx-auto" />
        <p className="text-text-secondary">Order not found.</p>
        <Button variant="ghost" onClick={() => router.push('/tailor/orders')}>View all orders</Button>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.push('/tailor/orders')}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All orders
      </button>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-serif font-semibold text-text-primary">{order.orderNumber}</h1>
          {isCancelled && <Badge variant="destructive">Cancelled</Badge>}
        </div>
        <p className="text-sm text-text-secondary">
          KES {order.retailPriceKES.toLocaleString()} · Deadline {new Date(order.deadlineDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Payment pending notice */}
      {order.status === 'payment_pending' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 flex gap-3">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Awaiting M-Pesa confirmation. Check your phone and enter your PIN if you haven't already.
          </p>
        </div>
      )}

      {/* Status stepper */}
      {!isCancelled && (
        <div className="space-y-0">
          {ORDER_STEPS.map((step, i) => {
            const stepIndex = STATUS_ORDER.indexOf(step.status);
            const isDone = !isCancelled && stepIndex <= currentStepIndex && currentStepIndex > 0;
            const isCurrent = step.status === order.status;
            const ts = getTimestampForStep(step.status, order.statusHistory);

            return (
              <div key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`mt-1 flex-shrink-0 ${isDone ? 'text-primary' : isCurrent ? 'text-primary' : 'text-text-secondary opacity-30'}`}>
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${isDone ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
                <div className={`pb-4 flex-1 ${isCurrent ? '' : ''}`}>
                  <p className={`text-sm font-medium ${isDone || isCurrent ? 'text-text-primary' : 'text-text-secondary opacity-50'}`}>
                    {step.label}
                  </p>
                  {ts && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {new Date(ts).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delivered state */}
      {order.status === 'delivered' && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-4">
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">
            Your order was delivered. If the fit isn't right, contact Nima within 7 days.
          </p>
        </div>
      )}
    </div>
  );
}
