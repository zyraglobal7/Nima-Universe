import { query, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';

const inspirationObject = v.object({
  _id: v.id('tailorInspirations'),
  _creationTime: v.number(),
  storageId: v.id('_storage'),
  imageUrl: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  tags: v.array(v.string()),
  isActive: v.boolean(),
  acceptCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(inspirationObject),
  handler: async (ctx: QueryCtx) => {
    const docs = await ctx.db.query('tailorInspirations').order('desc').collect();
    return Promise.all(
      docs.map(async (doc) => {
        const choices = await ctx.db
          .query('tailorInspirationChoices')
          .withIndex('by_inspiration_and_choice', (q) =>
            q.eq('inspirationId', doc._id).eq('choice', 'accept')
          )
          .collect();
        return { ...doc, acceptCount: choices.length };
      })
    );
  },
});
