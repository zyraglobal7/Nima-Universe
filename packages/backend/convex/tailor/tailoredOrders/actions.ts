'use node';

import { internalAction, ActionCtx } from '../../_generated/server';
import { v } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';

export const callFingoSTKPush = internalAction({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    merchantTransactionId: v.string(),
    amount: v.number(), // cents (KES * 100)
    phoneNumber: v.string(),
    narration: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: {
      tailoredOrderId: Id<'tailoredOrders'>;
      merchantTransactionId: string;
      amount: number;
      phoneNumber: string;
      narration: string;
    }
  ): Promise<null> => {
    const apiKey = process.env.FINGO_LIVE_KEY;
    if (!apiKey) {
      console.error('[FINGO-TAILOR] FINGO_LIVE_KEY not configured');
      await ctx.runMutation(internal.tailor.tailoredOrders.mutations.failTailoredOrderPayment, {
        merchantTransactionId: args.merchantTransactionId,
        reason: 'Payment service not configured',
      });
      return null;
    }

    try {
      console.log(
        `[FINGO-TAILOR] STK Push for ${args.merchantTransactionId}, ` +
        `amount: ${args.amount} cents, phone: ${args.phoneNumber}`
      );

      const response = await fetch('https://api.fingopay.io/v1/mpesa/charge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': args.merchantTransactionId,
        },
        body: JSON.stringify({
          merchantTransactionId: args.merchantTransactionId,
          amount: args.amount,
          phoneNumber: args.phoneNumber,
          narration: args.narration,
        }),
      });

      const data = await response.json();

      if (response.status === 202 || response.ok) {
        console.log(`[FINGO-TAILOR] STK Push initiated: ${JSON.stringify(data)}`);
      } else {
        const errorMessage = data?.error?.message || `HTTP ${response.status}`;
        console.error(`[FINGO-TAILOR] STK Push failed: ${errorMessage}`);
        await ctx.runMutation(internal.tailor.tailoredOrders.mutations.failTailoredOrderPayment, {
          merchantTransactionId: args.merchantTransactionId,
          reason: errorMessage,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error(`[FINGO-TAILOR] STK Push error: ${errorMessage}`);
      await ctx.runMutation(internal.tailor.tailoredOrders.mutations.failTailoredOrderPayment, {
        merchantTransactionId: args.merchantTransactionId,
        reason: errorMessage,
      });
    }

    return null;
  },
});
