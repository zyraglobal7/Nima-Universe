import { action, ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';

/**
 * Delete the current user's account: purges all data from Convex, then removes
 * the user from WorkOS so they cannot log back in with the same credentials.
 */
export const deleteMyAccount = action({
  args: {},
  returns: v.null(),
  handler: async (ctx: ActionCtx): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const workosUserId = identity.subject;

    // Get userId from Convex so we can delete all their data
    const userId = await ctx.runQuery(internal.users.queries.getUserIdByWorkosId, {
      workosUserId,
    });
    if (!userId) throw new Error('User not found');

    // Delete all Convex data first
    await ctx.runMutation(internal.users.mutations.deleteUserData, { userId });

    // Delete from WorkOS (best-effort — data is already gone from our side)
    const apiKey = process.env.WORKOS_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://api.workos.com/user_management/users/${workosUserId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok && res.status !== 404) {
          console.error('WorkOS user deletion failed:', res.status, await res.text());
        }
      } catch (err) {
        console.error('WorkOS delete request failed:', err);
      }
    }

    return null;
  },
});
