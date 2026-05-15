'use client';

import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2, Wallet, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

export default function AdminPayoutsPage() {
  const pendingPayouts = useQuery(api.tailor.tailoredOrders.adminQueries.getPendingPayouts, {});
  const releasePayout = useAction(api.tailor.tailoredOrders.payoutAction.releasePayout);

  const [releasing, setReleasing] = useState<Id<'tailoredOrders'> | null>(null);

  async function handleRelease(orderId: Id<'tailoredOrders'>, orderNumber: string) {
    if (!confirm(`Release payout for ${orderNumber}?`)) return;
    setReleasing(orderId);
    try {
      const result = await releasePayout({ tailoredOrderId: orderId });
      if (result.success) {
        toast.success(`Payout released for ${orderNumber}`);
      } else {
        toast.error(result.error ?? 'Payout failed');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payout failed');
    } finally {
      setReleasing(null);
    }
  }

  if (pendingPayouts === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold">Tailor payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Orders that passed QC 24+ hours ago and have not been paid out.
        </p>
      </div>

      {pendingPayouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 opacity-60" />
          <p className="text-muted-foreground text-sm">No payouts pending.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tailor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">M-Pesa</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Payout</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendingPayouts.map(({ order, tailor }) => (
                <tr key={order._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tailor.shopName}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {tailor.contactPhone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    KES {order.tailorPayoutKES.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleRelease(order._id, order.orderNumber)}
                      disabled={releasing === order._id}
                    >
                      {releasing === order._id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Wallet className="w-3 h-3 mr-1" />
                      )}
                      Release
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
