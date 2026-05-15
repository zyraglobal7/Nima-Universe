import { internalQuery, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../../_generated/dataModel';

export const getSellerPhone = internalQuery({
  args: { sellerId: v.id('sellers') },
  returns: v.union(
    v.object({ contactPhone: v.optional(v.string()) }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sellerId: Id<'sellers'> }
  ): Promise<{ contactPhone?: string } | null> => {
    const seller = await ctx.db.get(args.sellerId);
    if (!seller) return null;
    return { contactPhone: seller.contactPhone };
  },
});
