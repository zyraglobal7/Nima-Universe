import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Get the current user's referral code (or null if not yet generated)
 */
export const getMyReferralCode = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx: QueryCtx): Promise<string | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return null;

    return user.referralCode ?? null;
  },
});

/**
 * Get the current user's credited (unused, non-expired) referral credits
 */
export const getMyReferralCredits = query({
  args: {},
  returns: v.object({
    totalKes: v.number(),
    credits: v.array(v.object({
      _id: v.id('referrals'),
      creditAmountKes: v.number(),
      expiresAt: v.union(v.number(), v.null()),
      creditedAt: v.union(v.number(), v.null()),
    })),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    totalKes: number;
    credits: Array<{
      _id: Id<'referrals'>;
      creditAmountKes: number;
      expiresAt: number | null;
      creditedAt: number | null;
    }>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { totalKes: 0, credits: [] };

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return { totalKes: 0, credits: [] };

    const now = Date.now();

    const allReferrals = await ctx.db
      .query('referrals')
      .withIndex('by_referrer', (q) => q.eq('referrerId', user._id))
      .collect();

    // Filter: credited, not yet used, and either no expiry or not yet expired
    const availableCredits = allReferrals.filter(
      (r) =>
        r.status === 'credited' &&
        r.usedAt === undefined &&
        (r.expiresAt === undefined || r.expiresAt > now)
    );

    const totalKes = availableCredits.reduce((sum, r) => sum + r.creditAmountKes, 0);

    return {
      totalKes,
      credits: availableCredits.map((r) => ({
        _id: r._id,
        creditAmountKes: r.creditAmountKes,
        expiresAt: r.expiresAt ?? null,
        creditedAt: r.creditedAt ?? null,
      })),
    };
  },
});
