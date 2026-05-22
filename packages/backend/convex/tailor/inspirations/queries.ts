import { query, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';

const inspirationCard = v.object({
  _id: v.id('tailorInspirations'),
  storageId: v.id('_storage'),
  imageUrl: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  tags: v.array(v.string()),
});

const customerInspirationCard = v.object({
  _id: v.id('tailorInspirations'),
  imageUrl: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  tags: v.array(v.string()),
  tailorCount: v.number(),
});

// Inspirations this tailor hasn't decided on yet
export const getQueue = query({
  args: {},
  returns: v.array(inspirationCard),
  handler: async (ctx: QueryCtx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return [];

    const dbUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', user.subject))
      .unique();
    if (!dbUser) return [];

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', dbUser._id))
      .unique();
    if (!seller || seller.sellerType !== 'tailor') return [];

    const [all, decisions] = await Promise.all([
      ctx.db
        .query('tailorInspirations')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .collect(),
      ctx.db
        .query('tailorInspirationChoices')
        .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
        .collect(),
    ]);

    const decidedIds = new Set(decisions.map((d) => d.inspirationId));
    return all
      .filter((i) => !decidedIds.has(i._id))
      .map((i) => ({
        _id: i._id,
        storageId: i.storageId,
        imageUrl: i.imageUrl,
        title: i.title,
        description: i.description,
        tags: i.tags,
      }));
  },
});

// All inspirations the tailor accepted
export const getAccepted = query({
  args: {},
  returns: v.array(inspirationCard),
  handler: async (ctx: QueryCtx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return [];

    const dbUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', user.subject))
      .unique();
    if (!dbUser) return [];

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', dbUser._id))
      .unique();
    if (!seller || seller.sellerType !== 'tailor') return [];

    const accepted = await ctx.db
      .query('tailorInspirationChoices')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .filter((q) => q.eq(q.field('choice'), 'accept'))
      .collect();

    const docs = await Promise.all(
      accepted.map((c) => ctx.db.get(c.inspirationId))
    );

    return docs
      .filter((d): d is NonNullable<typeof d> => d !== null && d.isActive)
      .map((d) => ({
        _id: d._id,
        storageId: d.storageId,
        imageUrl: d.imageUrl,
        title: d.title,
        description: d.description,
        tags: d.tags,
      }));
  },
});

// Customer feed: active inspirations accepted by at least one tailor
export const getCustomerFeed = query({
  args: {},
  returns: v.array(customerInspirationCard),
  handler: async (ctx: QueryCtx) => {
    const all = await ctx.db
      .query('tailorInspirations')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect();

    const withTailors = await Promise.all(
      all.map(async (doc) => {
        const acceptCount = (
          await ctx.db
            .query('tailorInspirationChoices')
            .withIndex('by_inspiration_and_choice', (q) =>
              q.eq('inspirationId', doc._id).eq('choice', 'accept')
            )
            .collect()
        ).length;
        return { ...doc, tailorCount: acceptCount };
      })
    );

    return withTailors
      .filter((d) => d.tailorCount > 0)
      .map((d) => ({
        _id: d._id,
        imageUrl: d.imageUrl,
        title: d.title,
        description: d.description,
        tags: d.tags,
        tailorCount: d.tailorCount,
      }));
  },
});

// Detail: tailors who accepted a given inspiration (for customer detail page)
export const getTailorsForInspiration = query({
  args: { inspirationId: v.id('tailorInspirations') },
  returns: v.array(
    v.object({
      sellerId: v.id('sellers'),
      shopName: v.string(),
      logoUrl: v.optional(v.string()),
      skillTags: v.optional(v.array(v.string())),
      turnaroundDays: v.optional(v.number()),
    })
  ),
  handler: async (ctx: QueryCtx, { inspirationId }) => {
    const accepted = await ctx.db
      .query('tailorInspirationChoices')
      .withIndex('by_inspiration_and_choice', (q) =>
        q.eq('inspirationId', inspirationId).eq('choice', 'accept')
      )
      .collect();

    const sellers = await Promise.all(
      accepted.map((c) => ctx.db.get(c.sellerId))
    );

    const results = await Promise.all(
      sellers
        .filter((s): s is NonNullable<typeof s> => s !== null && s.isActive)
        .map(async (s) => {
          const logoUrl = s.logoStorageId
            ? (await ctx.storage.getUrl(s.logoStorageId)) ?? undefined
            : undefined;
          const turnaroundDays = s.turnaroundDays
            ? Math.min(...Object.values(s.turnaroundDays))
            : undefined;
          return {
            sellerId: s._id,
            shopName: s.shopName,
            logoUrl,
            skillTags: s.skillTags,
            turnaroundDays,
          };
        })
    );

    return results;
  },
});
