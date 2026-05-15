import { mutation, internalMutation, MutationCtx } from '../../_generated/server';
import { v } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `NMT-${year}-${rand}`;
}

function generateMerchantTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `nima_tord_${result}`;
}

export const create = mutation({
  args: {
    itemId: v.id('items'),
    mpesaPhoneNumber: v.string(),
    garmentType: v.union(
      v.literal('dress'),
      v.literal('trouser'),
      v.literal('skirt'),
      v.literal('top')
    ),
  },
  returns: v.object({
    tailoredOrderId: v.id('tailoredOrders'),
    orderNumber: v.string(),
    merchantTransactionId: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      mpesaPhoneNumber: string;
      garmentType: 'dress' | 'trouser' | 'skirt' | 'top';
    }
  ): Promise<{
    tailoredOrderId: Id<'tailoredOrders'>;
    orderNumber: string;
    merchantTransactionId: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) throw new Error('User not found');

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error('Design not found');
    if (!item.isActive) throw new Error('Design is not available');
    if (item.kind !== 'tailored_design') throw new Error('Item is not a tailored design');
    if (!item.sellerId) throw new Error('Design has no tailor assigned');

    const measurement = await ctx.db
      .query('measurements')
      .withIndex('by_userId_and_garmentType', (q) =>
        q.eq('userId', user._id).eq('garmentType', args.garmentType)
      )
      .unique();
    if (!measurement) throw new Error('Measurements not found for this garment type');

    const seller = await ctx.db.get(item.sellerId);
    if (!seller) throw new Error('Tailor not found');

    // Lead time: use seller's turnaround days or default 7 days
    const leadDays = seller.turnaroundDays?.casual ?? 7;
    const deadlineDate = Date.now() + leadDays * 24 * 60 * 60 * 1000;

    // Tailor payout is 80% of retail price
    const retailPriceKES = item.price;
    const tailorPayoutKES = Math.round(retailPriceKES * 0.8);

    const orderNumber = generateOrderNumber();
    const merchantTransactionId = generateMerchantTransactionId();
    const now = Date.now();

    const tailoredOrderId = await ctx.db.insert('tailoredOrders', {
      orderNumber,
      userId: user._id,
      sellerId: item.sellerId,
      itemId: args.itemId,
      measurementSnapshot: measurement.values,
      status: 'payment_pending',
      statusHistory: [{ status: 'payment_pending', at: now }],
      retailPriceKES,
      tailorPayoutKES,
      deadlineDate,
      mpesaPhoneNumber: args.mpesaPhoneNumber,
      merchantTransactionId,
      createdAt: now,
    });

    // Schedule STK Push (amount in cents = KES * 100)
    await ctx.scheduler.runAfter(0, internal.tailor.tailoredOrders.actions.callFingoSTKPush, {
      tailoredOrderId,
      merchantTransactionId,
      amount: retailPriceKES * 100,
      phoneNumber: args.mpesaPhoneNumber,
      narration: `Nima Tailored Order ${orderNumber}`,
    });

    return { tailoredOrderId, orderNumber, merchantTransactionId };
  },
});

export const completeTailoredOrderPayment = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    fingoTransactionId: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; fingoTransactionId: string }
  ): Promise<null> => {
    const order = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_merchantTransactionId', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!order) {
      console.error(`[TAILOR] No order found for merchantTransactionId: ${args.merchantTransactionId}`);
      return null;
    }

    if (order.status !== 'payment_pending') {
      console.log(`[TAILOR] Order ${order.orderNumber} already processed: ${order.status}`);
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: 'paid',
      mpesaTransactionId: args.fingoTransactionId,
      statusHistory: [
        ...order.statusHistory,
        { status: 'paid', at: now },
      ],
    });

    // Notify tailor
    await ctx.scheduler.runAfter(0, internal.tailor.notifications.actions.notifyTailorNewOrder, {
      tailoredOrderId: order._id,
    });

    return null;
  },
});

export const failTailoredOrderPayment = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; reason: string }
  ): Promise<null> => {
    const order = await ctx.db
      .query('tailoredOrders')
      .withIndex('by_merchantTransactionId', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!order || order.status !== 'payment_pending') return null;

    await ctx.db.patch(order._id, {
      status: 'cancelled',
      statusHistory: [
        ...order.statusHistory,
        { status: 'cancelled', at: Date.now(), note: `Payment failed: ${args.reason}` },
      ],
    });

    return null;
  },
});

// Tailor-facing status update (paid → acknowledged → fabric_sourced → cut → stitched → qc_pending)
const TAILOR_TRANSITIONS: Record<string, string> = {
  paid: 'acknowledged',
  acknowledged: 'fabric_sourced',
  fabric_sourced: 'cut',
  cut: 'stitched',
  stitched: 'qc_pending',
};

export const advanceStatus = mutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note?: string }
  ): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) throw new Error('User not found');

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();
    if (!seller || seller.sellerType !== 'tailor') throw new Error('Not a tailor account');

    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order) throw new Error('Order not found');
    if (order.sellerId !== seller._id) throw new Error('Not your order');

    const nextStatus = TAILOR_TRANSITIONS[order.status];
    if (!nextStatus) throw new Error(`Cannot advance from status: ${order.status}`);

    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: nextStatus as typeof order.status,
      statusHistory: [
        ...order.statusHistory,
        { status: nextStatus, at: now, note: args.note },
      ],
    });

    return nextStatus;
  },
});

// Admin-facing QC pass/fail
export const adminQcPass = internalMutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note?: string }
  ): Promise<null> => {
    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order) throw new Error('Order not found');
    if (order.status !== 'qc_pending') throw new Error('Order is not in qc_pending');

    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: 'qc_passed',
      statusHistory: [
        ...order.statusHistory,
        { status: 'qc_passed', at: now, note: args.note },
      ],
    });

    return null;
  },
});

export const adminQcFail = internalMutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note: string }
  ): Promise<null> => {
    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order) throw new Error('Order not found');
    if (order.status !== 'qc_pending') throw new Error('Order is not in qc_pending');

    // Check rework count — max 1 rework allowed
    const reworkCount = order.statusHistory.filter((h) => h.status === 'qc_failed').length;
    if (reworkCount >= 1) {
      // Second failure → cancel and refund
      await ctx.db.patch(order._id, {
        status: 'cancelled',
        statusHistory: [
          ...order.statusHistory,
          { status: 'qc_failed', at: Date.now(), note: args.note },
          { status: 'cancelled', at: Date.now(), note: 'Second QC failure — refund customer' },
        ],
      });
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: 'cut',
      statusHistory: [
        ...order.statusHistory,
        { status: 'qc_failed', at: now, note: args.note },
        { status: 'cut', at: now, note: 'Rework: back to cut stage' },
      ],
    });

    return null;
  },
});

export const adminDispatch = internalMutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note?: string }
  ): Promise<null> => {
    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order || order.status !== 'qc_passed') throw new Error('Order not in qc_passed');

    await ctx.db.patch(order._id, {
      status: 'dispatched',
      statusHistory: [
        ...order.statusHistory,
        { status: 'dispatched', at: Date.now(), note: args.note },
      ],
    });
    return null;
  },
});

export const adminMarkDelivered = internalMutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'> }
  ): Promise<null> => {
    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order || order.status !== 'dispatched') throw new Error('Order not in dispatched');

    await ctx.db.patch(order._id, {
      status: 'delivered',
      statusHistory: [
        ...order.statusHistory,
        { status: 'delivered', at: Date.now() },
      ],
    });
    return null;
  },
});

export const adminReleasePayout = internalMutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    payoutMpesaTransactionId: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; payoutMpesaTransactionId: string }
  ): Promise<null> => {
    const order = await ctx.db.get(args.tailoredOrderId);
    if (!order) throw new Error('Order not found');
    if (order.payoutReleasedAt) throw new Error('Payout already released');

    await ctx.db.patch(order._id, {
      payoutMpesaTransactionId: args.payoutMpesaTransactionId,
      payoutReleasedAt: Date.now(),
    });
    return null;
  },
});
