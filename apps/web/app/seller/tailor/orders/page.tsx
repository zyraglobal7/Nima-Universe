'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2, Package, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_LABELS: Record<string, string> = {
  paid: 'New', acknowledged: 'Acknowledged', fabric_sourced: 'Fabric sourced',
  cut: 'Cut', stitched: 'Stitched', qc_pending: 'Ready for QC',
  qc_passed: 'QC passed', qc_failed: 'QC failed', dispatched: 'Dispatched',
  delivered: 'Delivered', cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default', qc_failed: 'destructive', cancelled: 'destructive',
  qc_pending: 'secondary', qc_passed: 'default',
};

type TailorOrderStatus = 'payment_pending' | 'paid' | 'acknowledged' | 'fabric_sourced' |
  'cut' | 'stitched' | 'qc_pending' | 'qc_passed' | 'qc_failed' | 'dispatched' | 'delivered' | 'cancelled';

export default function TailorOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TailorOrderStatus | 'all'>('all');

  const orders = useQuery(api.tailor.tailoredOrders.queries.getTailorOrders, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  if (orders === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TailorOrderStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as TailorOrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <Package className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No orders matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order._id}
              onClick={() => router.push(`/seller/tailor/orders/${order._id}`)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{order.orderNumber}</span>
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'} className="text-xs">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payout KES {order.tailorPayoutKES.toLocaleString()} ·{' '}
                  Due {new Date(order.deadlineDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
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
