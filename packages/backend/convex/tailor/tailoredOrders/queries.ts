import { query, internalQuery, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';

const statusValidator = v.union(
  v.literal('payment_pending'),
  v.literal('paid'),
  v.literal('acknowledged'),
  v.literal('fabric_sourced'),
  v.literal('cut'),
  v.literal('stitched'),
  v.literal('qc_pending'),
  v.literal('qc_passed'),
  v.literal('qc_failed'),
  v.literal('dispatched'),
  v.literal('delivered'),
  v.literal('cancelled')
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
    status: v.string(),
    at: v.number(),
    note: v.optional(v.string()),
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

export const getMyOrders = query({
  args: {},
  returns: v.array(orderObject),
  handler: async (ctx: QueryCtx): Promise<Doc<'tailoredOrders'>[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return [];

    return ctx.db
      .query('tailoredOrders')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
  },
});

export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  returns: v.union(orderObject, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { orderNumber: string }
  ): Promise<Doc<'tailoredOrders'> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return null;

    const order = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_orderNumber', (q) => q.eq('orderNumber', args.orderNumber))
      .unique();

    if (!order) return null;
    // Only the customer or the tailor can see the order
    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (order.userId !== user._id && order.sellerId !== seller?._id) return null;

    return order;
  },
});

export const getTailorOrders = query({
  args: {
    status: v.optional(statusValidator),
  },
  returns: v.array(orderObject),
  handler: async (
    ctx: QueryCtx,
    args: { status?: string }
  ): Promise<Doc<'tailoredOrders'>[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return [];

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();
    if (!seller || seller.sellerType !== 'tailor') return [];

    const orders = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', seller._id))
      .order('desc')
      .collect();

    if (args.status) {
      return orders.filter((o) => o.status === args.status);
    }
    return orders;
  },
});

export const getById = query({
  args: { tailoredOrderId: v.id('tailoredOrders') },
  returns: v.union(orderObject, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'> }
  ): Promise<Doc<'tailoredOrders'> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return null;

    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order) return null;

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (order.userId !== user._id && order.sellerId !== seller?._id) return null;
    return order;
  },
});

// Admin: orders awaiting payout release (qc_passed, 24h+ elapsed, not yet paid out)
export const getPendingPayouts = internalQuery({
  args: {},
  returns: v.array(orderObject),
  handler: async (ctx: QueryCtx): Promise<Doc<'tailoredOrders'>[]> => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const qcPassed = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_status', (q) => q.eq('status', 'qc_passed'))
      .collect();

    return qcPassed.filter((o) => {
      const qcPassedEntry = o.statusHistory.find((h) => h.status === 'qc_passed');
      return !o.payoutReleasedAt && qcPassedEntry && qcPassedEntry.at < cutoff;
    });
  },
});

export const getQcPending = internalQuery({
  args: {},
  returns: v.array(orderObject),
  handler: async (ctx: QueryCtx): Promise<Doc<'tailoredOrders'>[]> => {
    return ctx.db
      .query('tailoredOrders')
      .withIndex('by_status', (q) => q.eq('status', 'qc_pending'))
      .collect();
  },
});
