import { mutation, MutationCtx } from '../_generated/server';
import { getUserFromIdentity } from '../lib/auth';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Resolve the authenticated user's _id, or throw.
 */
async function requireUserId(ctx: MutationCtx): Promise<Id<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  const user = await getUserFromIdentity(ctx);
  if (!user) throw new Error('User not found');
  return user._id;
}

/**
 * Block another user. Idempotent. Also removes any existing friendship so the
 * blocked user disappears from the blocker's social surfaces immediately.
 */
export const blockUser = mutation({
  args: { targetUserId: v.id('users') },
  returns: v.object({ success: v.boolean() }),
  handler: async (
    ctx: MutationCtx,
    args: { targetUserId: Id<'users'> }
  ): Promise<{ success: boolean }> => {
    const blockerId = await requireUserId(ctx);
    if (blockerId === args.targetUserId) {
      throw new Error('You cannot block yourself');
    }

    // Idempotent — skip if already blocked
    const existing = await ctx.db
      .query('user_blocks')
      .withIndex('by_blocker_and_blocked', (q) =>
        q.eq('blockerId', blockerId).eq('blockedId', args.targetUserId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert('user_blocks', {
        blockerId,
        blockedId: args.targetUserId,
        createdAt: Date.now(),
      });
    }

    // Remove any friendship in either direction
    const a = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', blockerId).eq('addresseeId', args.targetUserId)
      )
      .collect();
    const b = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', args.targetUserId).eq('addresseeId', blockerId)
      )
      .collect();
    for (const f of [...a, ...b]) {
      await ctx.db.delete(f._id);
    }

    return { success: true };
  },
});

/**
 * Unblock a previously blocked user. Idempotent.
 */
export const unblockUser = mutation({
  args: { targetUserId: v.id('users') },
  returns: v.object({ success: v.boolean() }),
  handler: async (
    ctx: MutationCtx,
    args: { targetUserId: Id<'users'> }
  ): Promise<{ success: boolean }> => {
    const blockerId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('user_blocks')
      .withIndex('by_blocker_and_blocked', (q) =>
        q.eq('blockerId', blockerId).eq('blockedId', args.targetUserId)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { success: true };
  },
});

/**
 * Report a user or a piece of their content. Stored for admin review.
 */
export const reportUser = mutation({
  args: {
    targetUserId: v.id('users'),
    targetType: v.union(
      v.literal('user'),
      v.literal('message'),
      v.literal('look')
    ),
    targetId: v.optional(v.string()),
    reason: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (
    ctx: MutationCtx,
    args: {
      targetUserId: Id<'users'>;
      targetType: 'user' | 'message' | 'look';
      targetId?: string;
      reason: string;
    }
  ): Promise<{ success: boolean }> => {
    const reporterId = await requireUserId(ctx);
    if (reporterId === args.targetUserId) {
      throw new Error('You cannot report yourself');
    }

    await ctx.db.insert('reports', {
      reporterId,
      targetUserId: args.targetUserId,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason.slice(0, 1000),
      status: 'pending',
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
