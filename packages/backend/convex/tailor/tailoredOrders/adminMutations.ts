import { mutation, MutationCtx } from '../../_generated/server';
import { getUserFromIdentity } from '../../lib/auth';
import { v } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';

// Verify admin role
async function requireAdmin(ctx: MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  const user = await getUserFromIdentity(ctx);
  if (!user || user.role !== 'admin') throw new Error('Admin access required');
}

export const adminQcPass = mutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note?: string }
  ): Promise<null> => {
    await requireAdmin(ctx);
    await ctx.runMutation(internal.tailor.tailoredOrders.mutations.adminQcPass, args);
    return null;
  },
});

export const adminQcFail = mutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note: string }
  ): Promise<null> => {
    await requireAdmin(ctx);
    await ctx.runMutation(internal.tailor.tailoredOrders.mutations.adminQcFail, args);
    return null;
  },
});

export const adminDispatch = mutation({
  args: {
    tailoredOrderId: v.id('tailoredOrders'),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'>; note?: string }
  ): Promise<null> => {
    await requireAdmin(ctx);
    await ctx.runMutation(internal.tailor.tailoredOrders.mutations.adminDispatch, args);
    return null;
  },
});

export const adminMarkDelivered = mutation({
  args: { tailoredOrderId: v.id('tailoredOrders') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'> }
  ): Promise<null> => {
    await requireAdmin(ctx);
    await ctx.runMutation(internal.tailor.tailoredOrders.mutations.adminMarkDelivered, args);
    return null;
  },
});
