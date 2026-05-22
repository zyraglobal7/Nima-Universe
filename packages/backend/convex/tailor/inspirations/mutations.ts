import { mutation, MutationCtx } from '../../_generated/server';
import { v } from 'convex/values';

export const choose = mutation({
  args: {
    inspirationId: v.id('tailorInspirations'),
    choice: v.union(v.literal('accept'), v.literal('skip')),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, { inspirationId, choice }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error('Unauthenticated');

    const dbUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', user.subject))
      .unique();
    if (!dbUser) throw new Error('User not found');

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', dbUser._id))
      .unique();
    if (!seller || seller.sellerType !== 'tailor') throw new Error('Not a tailor');

    // Upsert — overwrite any previous choice
    const existing = await ctx.db
      .query('tailorInspirationChoices')
      .withIndex('by_seller_and_inspiration', (q) =>
        q.eq('sellerId', seller._id).eq('inspirationId', inspirationId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { choice, createdAt: Date.now() });
    } else {
      await ctx.db.insert('tailorInspirationChoices', {
        sellerId: seller._id,
        inspirationId,
        choice,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
