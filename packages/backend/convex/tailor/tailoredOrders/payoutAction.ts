'use node';

import { action, ActionCtx } from '../../_generated/server';
import { v } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';

export const releasePayout = action({
  args: { tailoredOrderId: v.id('tailoredOrders') },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (
    ctx: ActionCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'> }
  ): Promise<{ success: boolean; error?: string }> => {
    // Verify admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: 'Not authenticated' };

    const order = await ctx.runQuery(internal.tailor.tailoredOrders.queries.getByIdInternal, {
      tailoredOrderId: args.tailoredOrderId,
    });
    if (!order) return { success: false, error: 'Order not found' };
    if (order.status !== 'qc_passed') return { success: false, error: 'Order must be qc_passed' };
    if (order.payoutReleasedAt) return { success: false, error: 'Payout already released' };

    const apiKey = process.env.FINGO_LIVE_KEY;
    if (!apiKey) {
      return { success: false, error: 'FINGO_LIVE_KEY not configured' };
    }

    // Get tailor's M-Pesa phone
    const tailor = await ctx.runQuery(internal.tailor.notifications.queries.getSellerPhone, {
      sellerId: order.sellerId,
    });
    if (!tailor?.contactPhone) {
      return { success: false, error: 'Tailor has no M-Pesa phone on record' };
    }

    const merchantTransactionId = `nima_payout_${order.orderNumber}_${Date.now()}`;

    try {
      const response = await fetch('https://api.fingopay.io/v1/mpesa/b2c', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': merchantTransactionId,
        },
        body: JSON.stringify({
          merchantTransactionId,
          amount: order.tailorPayoutKES * 100, // cents
          phoneNumber: tailor.contactPhone.replace(/\D/g, ''),
          narration: `Nima payout for ${order.orderNumber}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.error?.message || `HTTP ${response.status}`;
        return { success: false, error: msg };
      }

      const fingoTransactionId = data?.id || merchantTransactionId;

      await ctx.runMutation(internal.tailor.tailoredOrders.mutations.adminReleasePayout, {
        tailoredOrderId: args.tailoredOrderId,
        payoutMpesaTransactionId: fingoTransactionId,
      });

      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return { success: false, error: msg };
    }
  },
});
