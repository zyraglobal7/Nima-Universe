'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

export default function AdminQcPage() {
  const qcOrders = useQuery(api.tailor.tailoredOrders.adminQueries.getQcPendingOrders, {});
  const qcPass = useMutation(api.tailor.tailoredOrders.adminMutations.adminQcPass);
  const qcFail = useMutation(api.tailor.tailoredOrders.adminMutations.adminQcFail);

  const [processing, setProcessing] = useState<Id<'tailoredOrders'> | null>(null);
  const [failNotes, setFailNotes] = useState<Record<string, string>>({});

  async function handlePass(orderId: Id<'tailoredOrders'>, orderNumber: string) {
    if (!confirm(`Mark QC passed for ${orderNumber}?`)) return;
    setProcessing(orderId);
    try {
      await qcPass({ tailoredOrderId: orderId });
      toast.success(`${orderNumber} passed QC`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setProcessing(null);
    }
  }

  async function handleFail(orderId: Id<'tailoredOrders'>, orderNumber: string) {
    const note = failNotes[orderId] || '';
    if (!note.trim()) {
      toast.error('Please enter a failure note before failing QC');
      return;
    }
    if (!confirm(`Mark QC failed for ${orderNumber}? The tailor will rework from the cut stage.`)) return;
    setProcessing(orderId);
    try {
      await qcFail({ tailoredOrderId: orderId, note: note.trim() });
      toast.success(`${orderNumber} sent back for rework`);
      setFailNotes((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setProcessing(null);
    }
  }

  if (qcOrders === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold">QC queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Garments ready for quality inspection. Pass = payout scheduled. Fail = rework (max 1 rework per order).
        </p>
      </div>

      {qcOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 opacity-60" />
          <p className="text-muted-foreground text-sm">No garments awaiting QC.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {qcOrders.map(({ order, tailor }) => (
            <div key={order._id} className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{tailor.shopName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Retail KES {order.retailPriceKES.toLocaleString()} · Tailor payout KES {order.tailorPayoutKES.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deadline {new Date(order.deadlineDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="Failure note (required to fail)"
                    value={failNotes[order._id] ?? ''}
                    onChange={(e) => setFailNotes((prev) => ({ ...prev, [order._id]: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleFail(order._id, order.orderNumber)}
                  disabled={processing === order._id}
                >
                  {processing === order._id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  Fail
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePass(order._id, order.orderNumber)}
                  disabled={processing === order._id}
                >
                  {processing === order._id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
                  Pass
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
