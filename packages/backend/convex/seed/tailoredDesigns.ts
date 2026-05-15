/**
 * Seed: Tailored Design Items
 *
 * Creates 20 hand-curated tailored design items referencing the 3 seed tailors.
 * Stub images in /public/seed/tailored/ — final art comes from Grace's content batch.
 * Idempotent: skips any item whose publicId already exists.
 *
 * Prerequisite: run seed/testTailors:run first so the seller records exist.
 *
 * Run: npx convex run seed/tailoredDesigns:run --no-push
 */

import { internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';

const NOW = Date.now();

type DesignSpec = {
  publicId: string;
  tailorSlug: string;
  name: string;
  description: string;
  category: 'dress' | 'bottom' | 'top' | 'outfit' | 'outerwear';
  subcategory: string;
  gender: 'female' | 'male' | 'unisex';
  priceKES: number;   // human-readable KES; stored as cents (× 100)
  colors: string[];
  tags: string[];
  occasion: string[];
};

const DESIGNS: DesignSpec[] = [
  // ── Amina's Ankara Studio ─────────────────────────────────────────────────
  {
    publicId: 'item_seed_td_001',
    tailorSlug: 'seed-tailor-amina',
    name: 'Fitted Ankara Midi Dress',
    description: 'Bold geometric wax-print midi dress with a fitted bodice and flared skirt. Zip closure at back.',
    category: 'dress',
    subcategory: 'midi-dress',
    gender: 'female',
    priceKES: 5500,
    colors: ['red', 'gold'],
    tags: ['ankara', 'traditional', 'vibrant', 'afrocentric'],
    occasion: ['casual', 'event', 'date_night'],
  },
  {
    publicId: 'item_seed_td_002',
    tailorSlug: 'seed-tailor-amina',
    name: 'Kitenge High-Low Skirt',
    description: 'Knee-high front, calf-length back. Bold kitenge print with an elasticated waistband.',
    category: 'bottom',
    subcategory: 'skirt',
    gender: 'female',
    priceKES: 3200,
    colors: ['purple', 'gold'],
    tags: ['kitenge', 'traditional', 'casual', 'afrocentric'],
    occasion: ['casual', 'weekend'],
  },
  {
    publicId: 'item_seed_td_003',
    tailorSlug: 'seed-tailor-amina',
    name: 'Ankara A-Line Dress',
    description: 'Classic A-line silhouette in a navy-orange floral Ankara print. Sleeveless, knee-length.',
    category: 'dress',
    subcategory: 'a-line-dress',
    gender: 'female',
    priceKES: 4800,
    colors: ['navy', 'orange'],
    tags: ['ankara', 'casual', 'afrocentric', 'summer'],
    occasion: ['casual', 'work'],
  },
  {
    publicId: 'item_seed_td_004',
    tailorSlug: 'seed-tailor-amina',
    name: 'Kitenge Two-Piece Set',
    description: 'Matching peplum crop top and midi skirt in rich purple-gold kitenge. Versatile set, wear together or separately.',
    category: 'outfit',
    subcategory: 'two-piece',
    gender: 'female',
    priceKES: 6500,
    colors: ['purple', 'gold'],
    tags: ['kitenge', 'traditional', 'vibrant', 'afrocentric'],
    occasion: ['event', 'date_night', 'casual'],
  },
  {
    publicId: 'item_seed_td_005',
    tailorSlug: 'seed-tailor-amina',
    name: 'Ankara Peplum Top',
    description: 'Structured peplum top in geometric red-gold Ankara print. Pairs with trousers or solid skirts.',
    category: 'top',
    subcategory: 'peplum-top',
    gender: 'female',
    priceKES: 2800,
    colors: ['red', 'gold'],
    tags: ['ankara', 'structured', 'afrocentric'],
    occasion: ['work', 'casual'],
  },
  {
    publicId: 'item_seed_td_006',
    tailorSlug: 'seed-tailor-amina',
    name: 'Kitenge Maxi Dress',
    description: 'Floor-length kitenge maxi with a deep V-neckline and gathered waist. Statement African fashion.',
    category: 'dress',
    subcategory: 'maxi-dress',
    gender: 'female',
    priceKES: 7000,
    colors: ['purple', 'gold', 'ivory'],
    tags: ['kitenge', 'traditional', 'formal', 'afrocentric'],
    occasion: ['event', 'formal', 'date_night'],
  },
  {
    publicId: 'item_seed_td_007',
    tailorSlug: 'seed-tailor-amina',
    name: 'Ankara Cape Dress',
    description: 'Dramatic cape-back midi dress in geometric Ankara. Clean front silhouette with a flowing cape back.',
    category: 'dress',
    subcategory: 'cape-dress',
    gender: 'female',
    priceKES: 7500,
    colors: ['red', 'gold', 'black'],
    tags: ['ankara', 'formal', 'dramatic', 'afrocentric'],
    occasion: ['formal', 'event'],
  },
  // ── Fatuma Couture ────────────────────────────────────────────────────────
  {
    publicId: 'item_seed_td_008',
    tailorSlug: 'seed-tailor-fatuma',
    name: 'Linen Wide-Leg Trousers',
    description: 'Relaxed wide-leg trousers in natural beige linen. High-rise waist, single pleat front. Perfect for Nairobi heat.',
    category: 'bottom',
    subcategory: 'trousers',
    gender: 'female',
    priceKES: 4200,
    colors: ['beige', 'natural'],
    tags: ['linen', 'casual', 'minimalist', 'breathable'],
    occasion: ['work', 'casual', 'weekend'],
  },
  {
    publicId: 'item_seed_td_009',
    tailorSlug: 'seed-tailor-fatuma',
    name: 'Kanga Wrap Skirt',
    description: 'Adjustable wrap skirt in turquoise-black border-print kanga. Ties at the waist, midi length.',
    category: 'bottom',
    subcategory: 'skirt',
    gender: 'female',
    priceKES: 2800,
    colors: ['turquoise', 'black'],
    tags: ['kanga', 'coastal', 'casual', 'traditional'],
    occasion: ['casual', 'beach', 'weekend'],
  },
  {
    publicId: 'item_seed_td_010',
    tailorSlug: 'seed-tailor-fatuma',
    name: 'Satin Evening Dress',
    description: 'Sleek emerald-green satin slip dress with adjustable spaghetti straps. Bias-cut for a fluid drape.',
    category: 'dress',
    subcategory: 'slip-dress',
    gender: 'female',
    priceKES: 8000,
    colors: ['emerald', 'green'],
    tags: ['satin', 'formal', 'luxury', 'evening'],
    occasion: ['formal', 'date_night', 'event'],
  },
  {
    publicId: 'item_seed_td_011',
    tailorSlug: 'seed-tailor-fatuma',
    name: 'Linen Safari Shirt Dress',
    description: 'Collared shirt dress in dusty-blue linen with button-down front and safari-style patch pockets.',
    category: 'dress',
    subcategory: 'shirt-dress',
    gender: 'female',
    priceKES: 5200,
    colors: ['dusty-blue'],
    tags: ['linen', 'safari', 'casual', 'minimalist'],
    occasion: ['casual', 'work', 'travel'],
  },
  {
    publicId: 'item_seed_td_012',
    tailorSlug: 'seed-tailor-fatuma',
    name: 'Chiffon Wrap Dress',
    description: 'Feminine wrap-front dress in blush-pink chiffon. V-neck, flutter sleeves, midi length.',
    category: 'dress',
    subcategory: 'wrap-dress',
    gender: 'female',
    priceKES: 6000,
    colors: ['blush', 'pink'],
    tags: ['chiffon', 'feminine', 'formal', 'summer'],
    occasion: ['date_night', 'formal', 'event'],
  },
  {
    publicId: 'item_seed_td_013',
    tailorSlug: 'seed-tailor-fatuma',
    name: 'Linen Men\'s Trousers',
    description: 'Tailored straight-leg linen trousers for men in natural beige. Flat-front, side pockets, invisible zip.',
    category: 'bottom',
    subcategory: 'trousers',
    gender: 'male',
    priceKES: 4500,
    colors: ['beige', 'natural'],
    tags: ['linen', 'minimalist', 'smart-casual'],
    occasion: ['work', 'casual', 'weekend'],
  },
  // ── Grace Stitch Works ────────────────────────────────────────────────────
  {
    publicId: 'item_seed_td_014',
    tailorSlug: 'seed-tailor-grace',
    name: 'Cotton Pencil Skirt',
    description: 'Tailored pencil skirt in crisp white cotton poplin. Knee-length, back slit, concealed zip.',
    category: 'bottom',
    subcategory: 'skirt',
    gender: 'female',
    priceKES: 2500,
    colors: ['white'],
    tags: ['cotton', 'classic', 'work', 'minimalist'],
    occasion: ['work', 'formal'],
  },
  {
    publicId: 'item_seed_td_015',
    tailorSlug: 'seed-tailor-grace',
    name: 'Cotton Balloon Trousers',
    description: 'Fashion-forward balloon-leg trousers in camel cotton twill. High-waisted with tapered ankle.',
    category: 'bottom',
    subcategory: 'trousers',
    gender: 'female',
    priceKES: 3800,
    colors: ['camel'],
    tags: ['cotton', 'trendy', 'casual', 'statement'],
    occasion: ['casual', 'weekend', 'date_night'],
  },
  {
    publicId: 'item_seed_td_016',
    tailorSlug: 'seed-tailor-grace',
    name: 'Denim Midi Skirt',
    description: 'A-line midi skirt in classic indigo denim. Button-front detail, mid-rise waistband.',
    category: 'bottom',
    subcategory: 'skirt',
    gender: 'female',
    priceKES: 3500,
    colors: ['indigo', 'denim-blue'],
    tags: ['denim', 'casual', 'classic', 'everyday'],
    occasion: ['casual', 'weekend'],
  },
  {
    publicId: 'item_seed_td_017',
    tailorSlug: 'seed-tailor-grace',
    name: 'Structured Cotton Dress',
    description: 'Shift dress in camel cotton twill with structured shoulders and a clean A-line silhouette.',
    category: 'dress',
    subcategory: 'shift-dress',
    gender: 'female',
    priceKES: 4500,
    colors: ['camel'],
    tags: ['cotton', 'structured', 'minimalist', 'work'],
    occasion: ['work', 'formal', 'casual'],
  },
  {
    publicId: 'item_seed_td_018',
    tailorSlug: 'seed-tailor-grace',
    name: 'Men\'s Denim Trousers',
    description: 'Straight-cut denim trousers for men in indigo blue. Five-pocket construction, medium weight denim.',
    category: 'bottom',
    subcategory: 'trousers',
    gender: 'male',
    priceKES: 4000,
    colors: ['indigo'],
    tags: ['denim', 'casual', 'everyday'],
    occasion: ['casual', 'weekend'],
  },
  {
    publicId: 'item_seed_td_019',
    tailorSlug: 'seed-tailor-grace',
    name: 'White Cotton Shirt',
    description: 'Crisp white cotton poplin shirt with a relaxed fit and barrel cuffs. Tucks in or wears out.',
    category: 'top',
    subcategory: 'shirt',
    gender: 'unisex',
    priceKES: 2500,
    colors: ['white'],
    tags: ['cotton', 'classic', 'minimalist', 'versatile'],
    occasion: ['work', 'casual'],
  },
  {
    publicId: 'item_seed_td_020',
    tailorSlug: 'seed-tailor-grace',
    name: 'Camel Blazer',
    description: 'Tailored single-button blazer in camel cotton twill. Notch lapels, single patch pocket.',
    category: 'outerwear',
    subcategory: 'blazer',
    gender: 'unisex',
    priceKES: 6500,
    colors: ['camel'],
    tags: ['cotton', 'structured', 'smart-casual', 'classic'],
    occasion: ['work', 'formal', 'casual'],
  },
];

export const run = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
    missingTailors: v.array(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{ created: number; skipped: number; missingTailors: string[] }> => {
    let created = 0;
    let skipped = 0;
    const missingTailors: string[] = [];

    // Cache seller lookups so we don't re-query the same slug repeatedly
    const sellerCache = new Map<string, Id<'sellers'>>();

    for (const spec of DESIGNS) {
      // Idempotency: skip if publicId already exists
      const existing = await ctx.db
        .query('items')
        .withIndex('by_public_id', (q) => q.eq('publicId', spec.publicId))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Resolve seller
      let sellerId: Id<'sellers'> | undefined = sellerCache.get(spec.tailorSlug);
      if (!sellerId) {
        const seller = await ctx.db
          .query('sellers')
          .withIndex('by_slug', (q) => q.eq('slug', spec.tailorSlug))
          .first();
        if (!seller) {
          if (!missingTailors.includes(spec.tailorSlug)) missingTailors.push(spec.tailorSlug);
          continue;
        }
        sellerId = seller._id;
        sellerCache.set(spec.tailorSlug, sellerId);
      }

      await ctx.db.insert('items', {
        sellerId,
        publicId: spec.publicId,
        name: spec.name,
        description: spec.description,
        category: spec.category,
        subcategory: spec.subcategory,
        gender: spec.gender,
        // Price in cents (KES × 100)
        price: spec.priceKES * 100,
        currency: 'KES',
        colors: spec.colors,
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom'],
        material: undefined,
        tags: spec.tags,
        occasion: spec.occasion,
        inStock: true,
        isActive: true,
        kind: 'tailored_design',
        createdAt: NOW,
        updatedAt: NOW,
      });
      created++;
    }

    if (missingTailors.length > 0) {
      console.warn('Missing tailors (run seed/testTailors:run first):', missingTailors);
    }
    console.log(`Seed tailoredDesigns: ${created} created, ${skipped} skipped`);
    return { created, skipped, missingTailors };
  },
});
