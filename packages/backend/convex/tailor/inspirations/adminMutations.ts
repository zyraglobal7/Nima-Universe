import { mutation, MutationCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../../_generated/dataModel';

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx): Promise<string> => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    storageId: v.id('_storage'),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  returns: v.id('tailorInspirations'),
  handler: async (ctx, args): Promise<Id<'tailorInspirations'>> => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    const now = Date.now();
    return await ctx.db.insert('tailorInspirations', {
      storageId: args.storageId,
      imageUrl: imageUrl ?? undefined,
      title: args.title,
      description: args.description,
      tags: args.tags,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setActive = mutation({
  args: { id: v.id('tailorInspirations'), isActive: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, isActive }) => {
    await ctx.db.patch(id, { isActive, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id('tailorInspirations') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (doc) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(id);
    }
    return null;
  },
});
