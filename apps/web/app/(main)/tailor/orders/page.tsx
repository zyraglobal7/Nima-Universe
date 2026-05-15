'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2, Package, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<string, string> = {
  payment_pending: 'Awaiting payment',
  paid: 'Paid',
  acknowledged: 'Acknowledged',
  fabric_sourced: 'Fabric sourced',
  cut: 'Cut',
  stitched: 'Stitched',
  qc_pending: 'In QC',
  qc_passed: 'QC passed',
  qc_failed: 'QC failed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  payment_pending: 'outline',
  paid: 'default',
  acknowledged: 'secondary',
  fabric_sourced: 'secondary',
  cut: 'secondary',
  stitched: 'secondary',
  qc_pending: 'secondary',
  qc_passed: 'default',
  qc_failed: 'destructive',
  dispatched: 'default',
  delivered: 'default',
  cancelled: 'destructive',
};

export default function TailorOrdersPage() {
  const router = useRouter();
  const orders = useQuery(api.tailor.tailoredOrders.queries.getMyOrders, {});

  if (orders === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">Tailored orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your custom-made orders.</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <Package className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No orders yet.</p>
          <Button onClick={() => router.push('/tailor/feed')}>Browse designs</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order._id}
              onClick={() => router.push(`/tailor/orders/${order.orderNumber}`)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-surface hover:bg-surface-alt transition-colors text-left"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{order.orderNumber}</span>
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'} className="text-xs">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  KES {order.retailPriceKES.toLocaleString()} · Due {new Date(order.deadlineDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
