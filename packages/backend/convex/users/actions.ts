import { action, ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';

/**
 * Generate (or regenerate) the current user's AI style profile on demand.
 *
 * Public wrapper around the internal onboarding `generateStyleProfile` action so
 * the Profile screen can offer a "Generate" button when no profile exists yet.
 * The internal action persists the result to the user record, so the reactive
 * `getCurrentUser` query updates automatically once this resolves.
 */
export const generateMyStyleProfile = action({
  args: {},
  returns: v.string(),
  handler: async (ctx: ActionCtx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.runQuery(internal.users.queries.getCurrentUserInternal, {});
    if (!user) throw new Error('User not found');

    return await ctx.runAction(internal.workflows.actions.generateStyleProfile, {
      userId: user._id,
    });
  },
});

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

    // Get userId from Convex so we can delete all their data
    const user = await ctx.runQuery(internal.users.queries.getCurrentUserInternal, {});
    if (!user) throw new Error('User not found');

    // Delete all Convex data first
    await ctx.runMutation(internal.users.mutations.deleteUserData, { userId: user._id });

    // Delete from WorkOS (best-effort — data is already gone from our side).
    // Only applicable for users who actually have a WorkOS account (native
    // Apple/Google sign-ins have no WorkOS user to clean up).
    const apiKey = process.env.WORKOS_API_KEY;
    if (apiKey && user.workosUserId) {
      try {
        const res = await fetch(`https://api.workos.com/user_management/users/${user.workosUserId}`, {
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
