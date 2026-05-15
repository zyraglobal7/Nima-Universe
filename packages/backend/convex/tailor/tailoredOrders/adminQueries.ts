import { query, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Doc } from '../../_generated/dataModel';

const statusValidator = v.union(
  v.literal('payment_pending'), v.literal('paid'), v.literal('acknowledged'),
  v.literal('fabric_sourced'), v.literal('cut'), v.literal('stitched'),
  v.literal('qc_pending'), v.literal('qc_passed'), v.literal('qc_failed'),
  v.literal('dispatched'), v.literal('delivered'), v.literal('cancelled')
);

const orderObject = v.object({
  _id: v.id('tailoredOrders'),
  _creationTime: v.number(),
  orderNumber: v.string(),
  userId: v.id('users'),
  sellerId: v.id('sellers'),
  itemId: v.id('items'),
  measurementSnapshot: v.any(),
  status: statusValidator,
  statusHistory: v.array(v.object({
    status: v.string(), at: v.number(), note: v.optional(v.string()),
  })),
  retailPriceKES: v.number(),
  tailorPayoutKES: v.number(),
  deadlineDate: v.number(),
  mpesaPhoneNumber: v.string(),
  merchantTransactionId: v.string(),
  mpesaTransactionId: v.optional(v.string()),
  payoutMpesaTransactionId: v.optional(v.string()),
  payoutReleasedAt: v.optional(v.number()),
  createdAt: v.number(),
});

async function requireAdmin(ctx: QueryCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const user = await ctx.db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
    .unique();
  return user?.role === 'admin';
}

export const getPendingPayouts = query({
  args: {},
  returns: v.array(v.object({
    order: orderObject,
    tailor: v.object({
      shopName: v.string(),
      contactPhone: v.optional(v.string()),
    }),
  })),
  handler: async (ctx: QueryCtx): Promise<Array<{
    order: Doc<'tailoredOrders'>;
    tailor: { shopName: string; contactPhone?: string };
  }>> => {
    if (!(await requireAdmin(ctx))) return [];

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const qcPassed = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_status', (q) => q.eq('status', 'qc_passed'))
      .collect();

    const eligible = qcPassed.filter((o) => {
      const entry = o.statusHistory.find((h) => h.status === 'qc_passed');
      return !o.payoutReleasedAt && entry && entry.at < cutoff;
    });

    return Promise.all(
      eligible.map(async (order) => {
        const seller = await ctx.db.get(order.sellerId);
        return {
          order,
          tailor: { shopName: seller?.shopName ?? 'Unknown', contactPhone: seller?.contactPhone },
        };
      })
    );
  },
});

export const getQcPendingOrders = query({
  args: {},
  returns: v.array(v.object({
    order: orderObject,
    tailor: v.object({ shopName: v.string() }),
  })),
  handler: async (ctx: QueryCtx): Promise<Array<{
    order: Doc<'tailoredOrders'>;
    tailor: { shopName: string };
  }>> => {
    if (!(await requireAdmin(ctx))) return [];

    const orders = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_status', (q) => q.eq('status', 'qc_pending'))
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const seller = await ctx.db.get(order.sellerId);
        return { order, tailor: { shopName: seller?.shopName ?? 'Unknown' } };
      })
    );
  },
});
