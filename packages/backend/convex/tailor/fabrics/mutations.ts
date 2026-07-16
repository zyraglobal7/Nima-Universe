import { mutation, internalMutation, MutationCtx } from '../../_generated/server';
import { getUserFromIdentity } from '../../lib/auth';
import { v } from 'convex/values';
import type { Id } from '../../_generated/dataModel';

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx): Promise<string> => {
    return await ctx.storage.generateUploadUrl();
  },
});

function generateFabricSku(fabricType: string, primaryColor: string, metersAvailable: number): string {
  const typeCode = fabricType.slice(0, 3).toUpperCase();
  const colorCode = primaryColor.replace('#', '').slice(0, 6).toUpperCase();
  const numCode = Math.floor(metersAvailable).toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `TL-${typeCode}-${colorCode}-${numCode}-${rand}`;
}

async function getSellerForAuth(ctx: MutationCtx): Promise<Id<'sellers'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const user = await getUserFromIdentity(ctx);
  if (!user) throw new Error('User not found');

  const seller = await ctx.db
    .query('sellers')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique();
  if (!seller) throw new Error('Not a seller');
  if (seller.sellerType !== 'tailor') throw new Error('Not a tailor account');

  return seller._id;
}

export const addFabric = mutation({
  args: {
    fabricType: v.string(),
    primaryColor: v.string(),
    pattern: v.string(),
    metersAvailable: v.number(),
    pricePerMeterKES: v.number(),
    restockable: v.boolean(),
    photoStorageIds: v.array(v.id('_storage')),
  },
  returns: v.id('fabrics'),
  handler: async (
    ctx: MutationCtx,
    args: {
      fabricType: string;
      primaryColor: string;
      pattern: string;
      metersAvailable: number;
      pricePerMeterKES: number;
      restockable: boolean;
      photoStorageIds: Id<'_storage'>[];
    }
  ): Promise<Id<'fabrics'>> => {
    const sellerId = await getSellerForAuth(ctx);

    const sku = generateFabricSku(args.fabricType, args.primaryColor, args.metersAvailable);
    const now = Date.now();

    return ctx.db.insert('fabrics', {
      sellerId,
      sku,
      fabricType: args.fabricType,
      primaryColor: args.primaryColor,
      pattern: args.pattern,
      metersAvailable: args.metersAvailable,
      metersReserved: 0,
      pricePerMeterKES: args.pricePerMeterKES,
      restockable: args.restockable,
      photoStorageIds: args.photoStorageIds,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFabric = mutation({
  args: {
    fabricId: v.id('fabrics'),
    metersAvailable: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal('active'),
      v.literal('low_stock'),
      v.literal('depleted'),
      v.literal('retired')
    )),
    pricePerMeterKES: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      fabricId: Id<'fabrics'>;
      metersAvailable?: number;
      status?: 'active' | 'low_stock' | 'depleted' | 'retired';
      pricePerMeterKES?: number;
    }
  ): Promise<null> => {
    const sellerId = await getSellerForAuth(ctx);

    const fabric = await ctx.db.get(args.fabricId);
    if (!fabric) throw new Error('Fabric not found');
    if (fabric.sellerId !== sellerId) throw new Error('Not your fabric');

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.metersAvailable !== undefined) updates.metersAvailable = args.metersAvailable;
    if (args.status !== undefined) updates.status = args.status;
    if (args.pricePerMeterKES !== undefined) updates.pricePerMeterKES = args.pricePerMeterKES;

    await ctx.db.patch(args.fabricId, updates);
    return null;
  },
});

export const adminVerifyFabric = internalMutation({
  args: { fabricId: v.id('fabrics') },
  returns: v.null(),
  handler: async (ctx: MutationCtx, args: { fabricId: Id<'fabrics'> }): Promise<null> => {
    await ctx.db.patch(args.fabricId, { qcVerifiedAt: Date.now(), updatedAt: Date.now() });
    return null;
  },
});
