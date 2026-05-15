/**
 * Seed: Test Tailor Sellers
 *
 * Creates 3 test tailor sellers (+ their user records) plus 3-5 fabrics each.
 * Idempotent: skips any tailor whose slug already exists.
 *
 * Run: npx convex run seed/testTailors:run --no-push
 */

import { internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';

const NOW = Date.now();

const TAILOR_USERS = [
  {
    workosUserId: 'workos_seed_tailor_1',
    email: 'amina.wanjiru@seed.nima.test',
    firstName: 'Amina',
    lastName: 'Wanjiru',
  },
  {
    workosUserId: 'workos_seed_tailor_2',
    email: 'fatuma.odhiambo@seed.nima.test',
    firstName: 'Fatuma',
    lastName: 'Odhiambo',
  },
  {
    workosUserId: 'workos_seed_tailor_3',
    email: 'grace.muthoni@seed.nima.test',
    firstName: 'Grace',
    lastName: 'Muthoni',
  },
] as const;

const TAILOR_SELLERS = [
  {
    slug: 'seed-tailor-amina',
    shopName: "Amina's Ankara Studio",
    description: 'Bespoke Ankara and kitenge dresses, skirts, and two-piece sets. Based in Westlands, Nairobi.',
    contactPhone: '254712001001',
    skillTags: ['ankara', 'kitenge', 'dress', 'skirt', 'two-piece'],
    weeklyCapacity: 8,
    turnaroundDays: { casual: 5, formal: 7, traditional: 6, structured: 8 },
    laborPricing: [
      { garmentType: 'dress', priceKES: 1800 },
      { garmentType: 'skirt', priceKES: 1200 },
      { garmentType: 'top', priceKES: 900 },
    ],
    fabrics: [
      { fabricType: 'Ankara Wax Print', primaryColor: 'red-gold', pattern: 'geometric', metersAvailable: 12, pricePerMeterKES: 380 },
      { fabricType: 'Ankara Wax Print', primaryColor: 'navy-orange', pattern: 'floral', metersAvailable: 8, pricePerMeterKES: 360 },
      { fabricType: 'Kitenge', primaryColor: 'purple-gold', pattern: 'abstract', metersAvailable: 10, pricePerMeterKES: 320 },
      { fabricType: 'Cotton Poplin', primaryColor: 'ivory', pattern: 'solid', metersAvailable: 15, pricePerMeterKES: 220 },
      { fabricType: 'Chiffon', primaryColor: 'blush-pink', pattern: 'solid', metersAvailable: 6, pricePerMeterKES: 480 },
    ],
  },
  {
    slug: 'seed-tailor-fatuma',
    shopName: "Fatuma Couture",
    description: 'Elegant kanga wraps, linen tailoring, and formal evening wear. Workshop in Karen, Nairobi.',
    contactPhone: '254712002002',
    skillTags: ['kanga', 'linen', 'formal', 'evening-wear', 'trouser'],
    weeklyCapacity: 6,
    turnaroundDays: { casual: 6, formal: 10, traditional: 7, structured: 9 },
    laborPricing: [
      { garmentType: 'dress', priceKES: 2200 },
      { garmentType: 'trouser', priceKES: 1400 },
      { garmentType: 'top', priceKES: 1000 },
    ],
    fabrics: [
      { fabricType: 'Kanga', primaryColor: 'turquoise-black', pattern: 'border-print', metersAvailable: 9, pricePerMeterKES: 280 },
      { fabricType: 'Linen', primaryColor: 'natural-beige', pattern: 'solid', metersAvailable: 20, pricePerMeterKES: 520 },
      { fabricType: 'Satin', primaryColor: 'emerald-green', pattern: 'solid', metersAvailable: 5, pricePerMeterKES: 680 },
      { fabricType: 'Linen', primaryColor: 'dusty-blue', pattern: 'solid', metersAvailable: 12, pricePerMeterKES: 500 },
    ],
  },
  {
    slug: 'seed-tailor-grace',
    shopName: "Grace Stitch Works",
    description: 'Casual cotton and denim tailoring, balloon trousers, structured blazers. Studio in Kilimani.',
    contactPhone: '254712003003',
    skillTags: ['cotton', 'denim', 'casual', 'trouser', 'blazer', 'structured'],
    weeklyCapacity: 10,
    turnaroundDays: { casual: 4, formal: 8, traditional: 6, structured: 7 },
    laborPricing: [
      { garmentType: 'trouser', priceKES: 1200 },
      { garmentType: 'dress', priceKES: 1600 },
      { garmentType: 'skirt', priceKES: 1000 },
      { garmentType: 'top', priceKES: 800 },
    ],
    fabrics: [
      { fabricType: 'Cotton Twill', primaryColor: 'camel', pattern: 'solid', metersAvailable: 18, pricePerMeterKES: 290 },
      { fabricType: 'Denim', primaryColor: 'indigo', pattern: 'solid', metersAvailable: 14, pricePerMeterKES: 420 },
      { fabricType: 'Cotton Poplin', primaryColor: 'white', pattern: 'solid', metersAvailable: 22, pricePerMeterKES: 200 },
    ],
  },
] as const;

function makeFabricSku(type: string, color: string, meters: number): string {
  const typeCode = type.replace(/\s+/g, '-').toUpperCase().slice(0, 6);
  const colorCode = color.replace(/\s+/g, '-').toUpperCase().slice(0, 8);
  return `TL-${typeCode}-${colorCode}-${meters}-SEED`;
}

export const run = internalMutation({
  args: {},
  returns: v.object({
    usersCreated: v.number(),
    tailorsCreated: v.number(),
    tailorsSkipped: v.number(),
    fabricsCreated: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{
    usersCreated: number;
    tailorsCreated: number;
    tailorsSkipped: number;
    fabricsCreated: number;
  }> => {
    let usersCreated = 0;
    let tailorsCreated = 0;
    let tailorsSkipped = 0;
    let fabricsCreated = 0;

    for (let i = 0; i < TAILOR_SELLERS.length; i++) {
      const sellerSpec = TAILOR_SELLERS[i];
      const userSpec = TAILOR_USERS[i];

      // Idempotency: skip if slug exists
      const existing = await ctx.db
        .query('sellers')
        .withIndex('by_slug', (q) => q.eq('slug', sellerSpec.slug))
        .first();

      if (existing) {
        tailorsSkipped++;
        continue;
      }

      // Create or reuse the user record
      let userId: Id<'users'>;
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', userSpec.workosUserId))
        .first();

      if (existingUser) {
        userId = existingUser._id;
      } else {
        userId = await ctx.db.insert('users', {
          workosUserId: userSpec.workosUserId,
          email: userSpec.email,
          emailVerified: false,
          firstName: userSpec.firstName,
          lastName: userSpec.lastName,
          stylePreferences: [],
          subscriptionTier: 'free',
          dailyTryOnCount: 0,
          dailyTryOnResetAt: NOW,
          onboardingCompleted: true,
          isActive: true,
          role: 'seller',
          createdAt: NOW,
          updatedAt: NOW,
        });
        usersCreated++;
      }

      // Create the tailor seller record
      const sellerId = await ctx.db.insert('sellers', {
        userId,
        slug: sellerSpec.slug,
        shopName: sellerSpec.shopName,
        description: sellerSpec.description,
        contactPhone: sellerSpec.contactPhone,
        verificationStatus: 'verified',
        tier: 'starter',
        isActive: true,
        sellerType: 'tailor',
        weeklyCapacity: sellerSpec.weeklyCapacity,
        skillTags: [...sellerSpec.skillTags],
        turnaroundDays: { ...sellerSpec.turnaroundDays },
        laborPricing: sellerSpec.laborPricing.map((lp) => ({ ...lp })),
        inventoryLastRefreshedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      });
      tailorsCreated++;

      // Create fabrics for this tailor
      for (const fab of sellerSpec.fabrics) {
        await ctx.db.insert('fabrics', {
          sellerId,
          sku: makeFabricSku(fab.fabricType, fab.primaryColor, fab.metersAvailable),
          fabricType: fab.fabricType,
          primaryColor: fab.primaryColor,
          pattern: fab.pattern,
          metersAvailable: fab.metersAvailable,
          metersReserved: 0,
          pricePerMeterKES: fab.pricePerMeterKES,
          restockable: true,
          photoStorageIds: [],
          status: 'active',
          qcVerifiedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        });
        fabricsCreated++;
      }
    }

    console.log(
      `Seed testTailors: ${tailorsCreated} created, ${tailorsSkipped} skipped, ${fabricsCreated} fabrics`
    );
    return { usersCreated, tailorsCreated, tailorsSkipped, fabricsCreated };
  },
});
