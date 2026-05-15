'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2, Package, Scissors, Wallet, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<string, string> = {
  payment_pending: 'Awaiting payment', paid: 'New order', acknowledged: 'Acknowledged',
  fabric_sourced: 'Fabric sourced', cut: 'Cut', stitched: 'Stitched',
  qc_pending: 'Ready for QC', qc_passed: 'QC passed', qc_failed: 'QC failed',
  dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default', qc_failed: 'destructive', cancelled: 'destructive',
  qc_pending: 'secondary', qc_passed: 'default',
};

export default function TailorDashboardPage() {
  const router = useRouter();
  const orders = useQuery(api.tailor.tailoredOrders.queries.getTailorOrders, {});
  const fabrics = useQuery(api.tailor.fabrics.queries.getMine, {});

  if (orders === undefined || fabrics === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingOrders = orders.filter((o) =>
    ['paid', 'acknowledged', 'fabric_sourced', 'cut', 'stitched'].includes(o.status)
  );
  const payoutsDue = orders.filter((o) => o.status === 'qc_passed' && !o.payoutReleasedAt);
  const activeFabrics = fabrics.filter((f) => f.status === 'active' || f.status === 'low_stock');

  const recentOrders = [...orders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold">Tailor portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your orders and fabric stock.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders pending</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingOrders.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active fabrics</CardTitle>
            <Scissors className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeFabrics.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payouts due</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{payoutsDue.length}</p>
            {payoutsDue.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                KES {payoutsDue.reduce((s, o) => s + o.tailorPayoutKES, 0).toLocaleString()} total
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent orders</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/seller/tailor/orders')}>
            View all
          </Button>
        </div>

        {recentOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No orders yet. Orders appear here once customers pay.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <button
                key={order._id}
                onClick={() => router.push(`/seller/tailor/orders/${order._id}`)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{order.orderNumber}</span>
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'} className="text-xs">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payout KES {order.tailorPayoutKES.toLocaleString()} · Due {new Date(order.deadlineDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
