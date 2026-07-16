import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { getUserFromIdentity } from '../lib/auth';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Generate (or return existing) referral code for the current user
 */
export const generateReferralCode = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');

    // Return existing code if already generated
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate: first 6 chars of userId + 2 random base36 chars, uppercase
    const idPart = user._id.slice(0, 6);
    const randomPart = Math.random().toString(36).slice(2, 4);
    const code = (idPart + randomPart).toUpperCase();

    await ctx.db.patch(user._id, {
      referralCode: code,
      updatedAt: Date.now(),
    });

    return code;
  },
});

/**
 * Apply a referral code (current user is the referee)
 */
export const applyReferralCode = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { code: string }
  ): Promise<{ success: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const currentUser = await getUserFromIdentity(ctx);
    if (!currentUser) throw new Error('User not found');

    // Check if user has already used a referral code
    const existingReferral = await ctx.db
      .query('referrals')
      .withIndex('by_referee', (q) => q.eq('refereeId', currentUser._id))
      .first();
    if (existingReferral) {
      return { success: false, message: 'Already used a referral code' };
    }

    // Find the referrer by their referral code (using index on users table)
    const referrer = await ctx.db
      .query('users')
      .withIndex('by_referral_code', (q) => q.eq('referralCode', args.code))
      .unique();

    if (!referrer) {
      return { success: false, message: 'Invalid referral code' };
    }

    // Prevent self-referral
    if (referrer._id === currentUser._id) {
      return { success: false, message: 'Cannot use your own referral code' };
    }

    await ctx.db.insert('referrals', {
      referrerId: referrer._id,
      refereeId: currentUser._id,
      referralCode: args.code,
      status: 'pending',
      creditAmountKes: 500,
      createdAt: Date.now(),
    });

    return { success: true, message: 'Referral code applied!' };
  },
});

/**
 * Internal: complete a pending referral for a user (triggered on first completed try-on)
 */
export const completeReferralForUser = internalMutation({
  args: {
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'> }
  ): Promise<null> => {
    const pendingReferral = await ctx.db
      .query('referrals')
      .withIndex('by_referee', (q) => q.eq('refereeId', args.userId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first();

    if (!pendingReferral) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(pendingReferral._id, {
      status: 'credited',
      creditedAt: now,
      expiresAt: now + 14 * 24 * 60 * 60 * 1000,
    });

    return null;
  },
});

/**
 * Use referral credits toward a purchase (soonest-expiring first)
 */
export const useReferralCredits = mutation({
  args: {
    amountKes: v.number(),
  },
  returns: v.object({
    usedKes: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { amountKes: number }
  ): Promise<{ usedKes: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');

    const now = Date.now();

    // Fetch all credited, unused, non-expired referrals for this user (as referrer)
    const allReferrals = await ctx.db
      .query('referrals')
      .withIndex('by_referrer', (q) => q.eq('referrerId', user._id))
      .collect();

    const availableCredits = allReferrals
      .filter(
        (r) =>
          r.status === 'credited' &&
          r.usedAt === undefined &&
          (r.expiresAt === undefined || r.expiresAt > now)
      )
      // Sort by soonest expiring first (undefined expiresAt = no expiry, put last)
      .sort((a, b) => {
        const aExp = a.expiresAt ?? Number.MAX_SAFE_INTEGER;
        const bExp = b.expiresAt ?? Number.MAX_SAFE_INTEGER;
        return aExp - bExp;
      });

    let remaining = args.amountKes;
    let totalUsed = 0;

    for (const credit of availableCredits) {
      if (remaining <= 0) break;

      await ctx.db.patch(credit._id, { usedAt: now });
      totalUsed += credit.creditAmountKes;
      remaining -= credit.creditAmountKes;
    }

    return { usedKes: totalUsed };
  },
});
