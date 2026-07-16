import { query, QueryCtx } from '../../_generated/server';
import { getUserFromIdentity } from '../../lib/auth';
import { v } from 'convex/values';
import type { Doc } from '../../_generated/dataModel';

export const getByGarmentType = query({
  args: {
    garmentType: v.union(
      v.literal('dress'),
      v.literal('trouser'),
      v.literal('skirt'),
      v.literal('top')
    ),
  },
  returns: v.union(
    v.object({
      _id: v.id('measurements'),
      _creationTime: v.number(),
      userId: v.id('users'),
      garmentType: v.union(
        v.literal('dress'),
        v.literal('trouser'),
        v.literal('skirt'),
        v.literal('top')
      ),
      values: v.any(),
      source: v.union(v.literal('form_upload'), v.literal('cv_landmarking')),
      confidenceScore: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { garmentType: 'dress' | 'trouser' | 'skirt' | 'top' }
  ): Promise<Doc<'measurements'> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getUserFromIdentity(ctx);
    if (!user) return null;

    return ctx.db
      .query('measurements')
      .withIndex('by_userId_and_garmentType', (q) =>
        q.eq('userId', user._id).eq('garmentType', args.garmentType)
      )
      .unique();
  },
});

export const getAll = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id('measurements'),
    _creationTime: v.number(),
    userId: v.id('users'),
    garmentType: v.union(
      v.literal('dress'),
      v.literal('trouser'),
      v.literal('skirt'),
      v.literal('top')
    ),
    values: v.any(),
    source: v.union(v.literal('form_upload'), v.literal('cv_landmarking')),
    confidenceScore: v.optional(v.number()),
    createdAt: v.number(),
  })),
  handler: async (ctx: QueryCtx): Promise<Doc<'measurements'>[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await getUserFromIdentity(ctx);
    if (!user) return [];

    return ctx.db
      .query('measurements')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect();
  },
});
