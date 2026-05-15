import { query, internalQuery, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Doc } from '../../_generated/dataModel';

const fabricObject = v.object({
  _id: v.id('fabrics'),
  _creationTime: v.number(),
  sellerId: v.id('sellers'),
  sku: v.string(),
  fabricType: v.string(),
  primaryColor: v.string(),
  pattern: v.string(),
  metersAvailable: v.number(),
  metersReserved: v.number(),
  pricePerMeterKES: v.number(),
  restockable: v.boolean(),
  photoStorageIds: v.array(v.id('_storage')),
  status: v.union(
    v.literal('active'),
    v.literal('low_stock'),
    v.literal('depleted'),
    v.literal('retired')
  ),
  qcVerifiedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const getMine = query({
  args: {},
  returns: v.array(fabricObject),
  handler: async (ctx: QueryCtx): Promise<Doc<'fabrics'>[]> => {
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
    if (!seller) return [];

    return ctx.db
      .query('fabrics')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', seller._id))
      .collect();
  },
});

export const getBySeller = internalQuery({
  args: { sellerId: v.id('sellers') },
  returns: v.array(fabricObject),
  handler: async (ctx: QueryCtx, args: { sellerId: Doc<'sellers'>['_id'] }): Promise<Doc<'fabrics'>[]> => {
    return ctx.db
      .query('fabrics')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', args.sellerId))
      .collect();
  },
});
