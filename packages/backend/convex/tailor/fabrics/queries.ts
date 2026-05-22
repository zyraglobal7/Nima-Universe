import { query, internalQuery, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';

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
  photoUrls: v.array(v.string()),
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

type FabricWithUrls = Doc<'fabrics'> & { photoUrls: string[] };

async function resolveFabricUrls(ctx: QueryCtx, fabrics: Doc<'fabrics'>[]): Promise<FabricWithUrls[]> {
  return Promise.all(
    fabrics.map(async (f) => {
      const urls = await Promise.all(
        f.photoStorageIds.map(async (id: Id<'_storage'>) => (await ctx.storage.getUrl(id)) ?? '')
      );
      return { ...f, photoUrls: urls.filter(Boolean) };
    })
  );
}

export const getMine = query({
  args: {},
  returns: v.array(fabricObject),
  handler: async (ctx: QueryCtx): Promise<FabricWithUrls[]> => {
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

    const fabrics = await ctx.db
      .query('fabrics')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', seller._id))
      .collect();

    return resolveFabricUrls(ctx, fabrics);
  },
});

export const getBySeller = internalQuery({
  args: { sellerId: v.id('sellers') },
  returns: v.array(fabricObject),
  handler: async (ctx: QueryCtx, args: { sellerId: Doc<'sellers'>['_id'] }): Promise<FabricWithUrls[]> => {
    const fabrics = await ctx.db
      .query('fabrics')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', args.sellerId))
      .collect();
    return resolveFabricUrls(ctx, fabrics);
  },
});
