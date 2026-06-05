import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Resolve the authenticated user's _id, or null.
 */
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
    .unique();
  return user?._id ?? null;
}

/**
 * Set of user ids the current user has blocked OR been blocked by — either
 * direction should hide the relationship. Used to filter DMs / friends / social.
 */
export async function getBlockedUserIdSet(
  ctx: QueryCtx,
  userId: Id<'users'>
): Promise<Set<string>> {
  const [iBlocked, blockedMe] = await Promise.all([
    ctx.db
      .query('user_blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', userId))
      .collect(),
    ctx.db
      .query('user_blocks')
      .withIndex('by_blocked', (q) => q.eq('blockedId', userId))
      .collect(),
  ]);
  const set = new Set<string>();
  iBlocked.forEach((b) => set.add(b.blockedId));
  blockedMe.forEach((b) => set.add(b.blockerId));
  return set;
}

/**
 * Whether the current user has blocked the given target user.
 */
export const isBlocked = query({
  args: { targetUserId: v.id('users') },
  returns: v.boolean(),
  handler: async (
    ctx: QueryCtx,
    args: { targetUserId: Id<'users'> }
  ): Promise<boolean> => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return false;
    const existing = await ctx.db
      .query('user_blocks')
      .withIndex('by_blocker_and_blocked', (q) =>
        q.eq('blockerId', userId).eq('blockedId', args.targetUserId)
      )
      .unique();
    return existing !== null;
  },
});

/**
 * Ids of users the current user has blocked (for client-side filtering).
 */
export const getBlockedUserIds = query({
  args: {},
  returns: v.array(v.id('users')),
  handler: async (ctx: QueryCtx): Promise<Id<'users'>[]> => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    const blocks = await ctx.db
      .query('user_blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', userId))
      .collect();
    return blocks.map((b) => b.blockedId);
  },
});
