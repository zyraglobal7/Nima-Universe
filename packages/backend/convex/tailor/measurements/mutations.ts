import { mutation, MutationCtx } from '../../_generated/server';
import { getUserFromIdentity } from '../../lib/auth';
import { v } from 'convex/values';
import type { Id } from '../../_generated/dataModel';

const MEASUREMENT_FIELDS = {
  dress: [
    'bust', 'upperBust', 'underbust', 'waist', 'hips',
    'bustPoint', 'underbustPoint', 'bodice', 'hipline',
    'fullLength', 'shortLength', 'midLength',
    'armhole', 'biceps', 'sleeveLength', 'wrist',
    'cleavage', 'neckRound',
  ],
  trouser: ['waist', 'hips', 'thighs', 'flyCrotch', 'kneeRound', 'trouserLength'],
  skirt: ['waist', 'hips', 'skirtLength'],
  top: ['topLength', 'bust', 'shoulder', 'sleeveLength'],
} as const;

type GarmentType = keyof typeof MEASUREMENT_FIELDS;

function validateMeasurements(garmentType: GarmentType, values: Record<string, unknown>): void {
  const fields = MEASUREMENT_FIELDS[garmentType];
  for (const field of fields) {
    const val = values[field];
    if (val === undefined || val === null) {
      throw new Error(`Missing measurement: ${field}`);
    }
    if (typeof val !== 'number' || isNaN(val) || val <= 0 || val > 250) {
      throw new Error(`Invalid measurement for ${field}: must be a number between 0 and 250 cm`);
    }
  }
}

export const write = mutation({
  args: {
    garmentType: v.union(
      v.literal('dress'),
      v.literal('trouser'),
      v.literal('skirt'),
      v.literal('top')
    ),
    values: v.any(),
    source: v.union(v.literal('form_upload'), v.literal('cv_landmarking')),
    confidenceScore: v.optional(v.number()),
  },
  returns: v.id('measurements'),
  handler: async (
    ctx: MutationCtx,
    args: {
      garmentType: GarmentType;
      values: Record<string, unknown>;
      source: 'form_upload' | 'cv_landmarking';
      confidenceScore?: number;
    }
  ): Promise<Id<'measurements'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');

    validateMeasurements(args.garmentType, args.values);

    // Upsert: delete existing measurement for this garment type, then insert
    const existing = await ctx.db
      .query('measurements')
      .withIndex('by_userId_and_garmentType', (q) =>
        q.eq('userId', user._id).eq('garmentType', args.garmentType)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert('measurements', {
      userId: user._id,
      garmentType: args.garmentType,
      values: args.values,
      source: args.source,
      confidenceScore: args.confidenceScore,
      createdAt: Date.now(),
    });
  },
});
