import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { getUserFromIdentity } from '../lib/auth';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { type SellerTier } from '../types';
import { getTierConfig } from './tierConfig';

const imageTypeValidator = v.union(
  v.literal('front'),
  v.literal('back'),
  v.literal('side'),
  v.literal('detail'),
  v.literal('model'),
  v.literal('flat_lay')
);

/**
 * Generate a slug from shop name
 */
function generateSlug(shopName: string): string {
  return shopName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50); // Limit length
}

/**
 * Generate an upload URL for seller images
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get URL for a storage ID (seller)
 */
export const getStorageUrl = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (
    ctx: MutationCtx,
    args: { storageId: Id<'_storage'> }
  ): Promise<string | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Create a new seller profile (onboarding)
 */
export const createSeller = mutation({
  args: {
    shopName: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    logoStorageId: v.optional(v.id('_storage')),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  returns: v.id('sellers'),
  handler: async (
    ctx: MutationCtx,
    args: {
      shopName: string;
      slug?: string;
      description?: string;
      logoStorageId?: Id<'_storage'>;
      contactEmail?: string;
      contactPhone?: string;
    }
  ): Promise<Id<'sellers'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get user
    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a seller profile
    const existingSeller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (existingSeller) {
      throw new Error('User already has a seller profile');
    }

    // Generate or validate slug
    let slug = args.slug ? args.slug.toLowerCase().replace(/\s+/g, '-') : generateSlug(args.shopName);

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query('sellers')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();

    if (existingSlug) {
      // Add random suffix if slug exists
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const now = Date.now();

    // Create seller
    const sellerId = await ctx.db.insert('sellers', {
      userId: user._id,
      slug,
      shopName: args.shopName,
      description: args.description,
      logoStorageId: args.logoStorageId,
      contactEmail: args.contactEmail ?? user.email,
      contactPhone: args.contactPhone,
      verificationStatus: 'pending',
      isActive: true,
      tryOnCredits: 100,
      createdAt: now,
      updatedAt: now,
    });

    // Update user role to seller
    await ctx.db.patch(user._id, {
      role: 'seller',
      updatedAt: now,
    });

    return sellerId;
  },
});

/**
 * Update seller profile
 */
export const updateWebsiteUrl = mutation({
  args: {
    websiteUrl: v.string(),
  },
  returns: v.id('sellers'),
  handler: async (
    ctx: MutationCtx,
    args: { websiteUrl: string }
  ): Promise<Id<'sellers'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');
    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();
    if (!seller) throw new Error('Seller profile not found');
    await ctx.db.patch(seller._id, { websiteUrl: args.websiteUrl, updatedAt: Date.now() });
    return seller._id;
  },
});

export const updateSeller = mutation({
  args: {
    shopName: v.optional(v.string()),
    description: v.optional(v.string()),
    logoStorageId: v.optional(v.id('_storage')),
    bannerStorageId: v.optional(v.id('_storage')),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
  },
  returns: v.id('sellers'),
  handler: async (
    ctx: MutationCtx,
    args: {
      shopName?: string;
      description?: string;
      logoStorageId?: Id<'_storage'>;
      bannerStorageId?: Id<'_storage'>;
      contactEmail?: string;
      contactPhone?: string;
      websiteUrl?: string;
    }
  ): Promise<Id<'sellers'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      throw new Error('Seller profile not found');
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.shopName !== undefined) updates.shopName = args.shopName;
    if (args.description !== undefined) updates.description = args.description;
    if (args.logoStorageId !== undefined) updates.logoStorageId = args.logoStorageId;
    if (args.bannerStorageId !== undefined) updates.bannerStorageId = args.bannerStorageId;
    if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) updates.contactPhone = args.contactPhone;
    if (args.websiteUrl !== undefined) updates.websiteUrl = args.websiteUrl;

    await ctx.db.patch(seller._id, updates);
    return seller._id;
  },
});

export const toggleWatermark = mutation({
  args: {
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { enabled: boolean }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();
    if (!seller) throw new Error('Seller profile not found');

    await ctx.db.patch(seller._id, { watermarkEnabled: args.enabled, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Create a product as a seller (auto-assigns sellerId)
 */
export const createSellerProduct = mutation({
  args: {
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.union(
      v.literal('top'),
      v.literal('bottom'),
      v.literal('dress'),
      v.literal('outfit'),
      v.literal('outerwear'),
      v.literal('shoes'),
      v.literal('accessory'),
      v.literal('bag'),
      v.literal('jewelry'),
      v.literal('swimwear')
    ),
    subcategory: v.optional(v.string()),
    gender: v.union(v.literal('male'), v.literal('female'), v.literal('unisex')),
    price: v.number(),
    currency: v.string(),
    originalPrice: v.optional(v.number()),
    colors: v.array(v.string()),
    sizes: v.array(v.string()),
    material: v.optional(v.string()),
    tags: v.array(v.string()),
    occasion: v.optional(v.array(v.string())),
    season: v.optional(v.array(v.string())),
    inStock: v.optional(v.boolean()),
    stockQuantity: v.optional(v.number()),
    sku: v.optional(v.string()),
    sourceStore: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.id('items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      name: string;
      brand?: string;
      description?: string;
      category: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry'|'swimwear';
      subcategory?: string;
      gender: 'male' | 'female' | 'unisex';
      price: number;
      currency: string;
      originalPrice?: number;
      colors: string[];
      sizes: string[];
      material?: string;
      tags: string[];
      occasion?: string[];
      season?: string[];
      inStock?: boolean;
      stockQuantity?: number;
      sku?: string;
      sourceStore?: string;
      sourceUrl?: string;
    }
  ): Promise<Id<'items'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      throw new Error('Seller profile not found. Complete onboarding first.');
    }

    // Enforce tier product limit
    const tier = (seller.tier ?? 'basic') as SellerTier;
    const { maxProducts } = await getTierConfig(ctx, tier);
    if (maxProducts !== null) {
      const activeCount = await ctx.db
        .query('items')
        .withIndex('by_seller_and_active', (q) => q.eq('sellerId', seller._id).eq('isActive', true))
        .collect();
      if (activeCount.length >= maxProducts) {
        throw new Error(
          `You've reached the ${maxProducts} product limit for the ${tier} plan. Upgrade to add more products.`
        );
      }
    }

    const now = Date.now();

    // Generate public ID
    const randomPart = Math.random().toString(36).substring(2, 10);
    const publicId = `item_${randomPart}`;

    const itemId = await ctx.db.insert('items', {
      sellerId: seller._id, // Auto-assign seller
      publicId,
      sku: args.sku,
      name: args.name,
      brand: args.brand,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      gender: args.gender,
      price: args.price,
      currency: args.currency,
      originalPrice: args.originalPrice,
      colors: args.colors,
      sizes: args.sizes,
      material: args.material,
      tags: args.tags,
      occasion: args.occasion,
      season: args.season,
      inStock: args.inStock ?? true,
      stockQuantity: args.stockQuantity,
      sourceStore: args.sourceStore,
      sourceUrl: args.sourceUrl,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      saveCount: 0,
      purchaseCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update a seller's product (verifies ownership)
 */
export const updateSellerProduct = mutation({
  args: {
    itemId: v.id('items'),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal('top'),
        v.literal('bottom'),
        v.literal('dress'),
        v.literal('outfit'),
        v.literal('outerwear'),
        v.literal('shoes'),
        v.literal('accessory'),
        v.literal('bag'),
        v.literal('jewelry'),
        v.literal('swimwear')
      )
    ),
    subcategory: v.optional(v.string()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('unisex'))),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
    sizes: v.optional(v.array(v.string())),
    material: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    occasion: v.optional(v.array(v.string())),
    season: v.optional(v.array(v.string())),
    inStock: v.optional(v.boolean()),
    stockQuantity: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sku: v.optional(v.string()),
    sourceStore: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    affiliateUrl: v.optional(v.string()),
  },
  returns: v.id('items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      name?: string;
      brand?: string;
      description?: string;
      category?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry' | 'swimwear';
      subcategory?: string;
      gender?: 'male' | 'female' | 'unisex';
      price?: number;
      currency?: string;
      originalPrice?: number;
      colors?: string[];
      sizes?: string[];
      material?: string;
      tags?: string[];
      occasion?: string[];
      season?: string[];
      inStock?: boolean;
      stockQuantity?: number;
      isActive?: boolean;
      sku?: string;
      sourceStore?: string;
      sourceUrl?: string;
      affiliateUrl?: string;
    }
  ): Promise<Id<'items'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      throw new Error('Seller profile not found');
    }

    // Get item and verify ownership
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.sellerId !== seller._id) {
      throw new Error('You do not have permission to edit this item');
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.brand !== undefined) updates.brand = args.brand;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.subcategory !== undefined) updates.subcategory = args.subcategory;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.originalPrice !== undefined) updates.originalPrice = args.originalPrice;
    if (args.colors !== undefined) updates.colors = args.colors;
    if (args.sizes !== undefined) updates.sizes = args.sizes;
    if (args.material !== undefined) updates.material = args.material;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.occasion !== undefined) updates.occasion = args.occasion;
    if (args.season !== undefined) updates.season = args.season;
    if (args.inStock !== undefined) updates.inStock = args.inStock;
    if (args.stockQuantity !== undefined) updates.stockQuantity = args.stockQuantity;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.sku !== undefined) updates.sku = args.sku;
    if (args.sourceStore !== undefined) updates.sourceStore = args.sourceStore;
    if (args.sourceUrl !== undefined) updates.sourceUrl = args.sourceUrl;
    if (args.affiliateUrl !== undefined) updates.affiliateUrl = args.affiliateUrl;

    await ctx.db.patch(args.itemId, updates);
    return args.itemId;
  },
});

/**
 * Update order item fulfillment status (seller marks as shipped, etc.)
 */
export const updateOrderItemStatus = mutation({
  args: {
    orderItemId: v.id('order_items'),
    fulfillmentStatus: v.union(
      v.literal('processing'),
      v.literal('shipped'),
      v.literal('delivered'),
      v.literal('cancelled')
    ),
    trackingNumber: v.optional(v.string()),
    trackingCarrier: v.optional(v.string()),
  },
  returns: v.id('order_items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      orderItemId: Id<'order_items'>;
      fulfillmentStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled';
      trackingNumber?: string;
      trackingCarrier?: string;
    }
  ): Promise<Id<'order_items'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      throw new Error('Seller profile not found');
    }

    // Get order item and verify ownership
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) {
      throw new Error('Order item not found');
    }

    if (orderItem.sellerId !== seller._id) {
      throw new Error('You do not have permission to update this order item');
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      fulfillmentStatus: args.fulfillmentStatus,
      updatedAt: now,
    };

    if (args.trackingNumber !== undefined) updates.trackingNumber = args.trackingNumber;
    if (args.trackingCarrier !== undefined) updates.trackingCarrier = args.trackingCarrier;

    // Set timestamp based on status
    if (args.fulfillmentStatus === 'shipped') {
      updates.shippedAt = now;
    } else if (args.fulfillmentStatus === 'delivered') {
      updates.deliveredAt = now;
    }

    await ctx.db.patch(args.orderItemId, updates);

    // Update parent order status if needed
    await updateParentOrderStatus(ctx, orderItem.orderId);

    return args.orderItemId;
  },
});

/**
 * Helper to update parent order status based on all order items
 */
async function updateParentOrderStatus(ctx: MutationCtx, orderId: Id<'orders'>): Promise<void> {
  const order = await ctx.db.get(orderId);
  if (!order) return;

  const orderItems = await ctx.db
    .query('order_items')
    .withIndex('by_order', (q) => q.eq('orderId', orderId))
    .collect();

  if (orderItems.length === 0) return;

  // Determine overall status
  const allDelivered = orderItems.every((oi) => oi.fulfillmentStatus === 'delivered');
  const allShipped = orderItems.every(
    (oi) => oi.fulfillmentStatus === 'shipped' || oi.fulfillmentStatus === 'delivered'
  );
  const someShipped = orderItems.some(
    (oi) => oi.fulfillmentStatus === 'shipped' || oi.fulfillmentStatus === 'delivered'
  );
  const allCancelled = orderItems.every((oi) => oi.fulfillmentStatus === 'cancelled');

  let newStatus: 'processing' | 'partially_shipped' | 'shipped' | 'delivered' | 'cancelled' = 'processing';

  if (allCancelled) {
    newStatus = 'cancelled';
  } else if (allDelivered) {
    newStatus = 'delivered';
  } else if (allShipped) {
    newStatus = 'shipped';
  } else if (someShipped) {
    newStatus = 'partially_shipped';
  }

  if (order.status !== newStatus) {
    await ctx.db.patch(orderId, {
      status: newStatus,
      updatedAt: Date.now(),
    });
  }
}
/**
 * Add an image to an item (seller)
 */
export const addItemImage = mutation({
  args: {
    itemId: v.id('items'),
    storageId: v.optional(v.id('_storage')),
    externalUrl: v.optional(v.string()),
    altText: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isPrimary: v.optional(v.boolean()),
    imageType: imageTypeValidator,
  },
  returns: v.id('item_images'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      storageId?: Id<'_storage'>;
      externalUrl?: string;
      altText?: string;
      sortOrder?: number;
      isPrimary?: boolean;
      imageType: 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';
    }
  ): Promise<Id<'item_images'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      throw new Error('Seller profile not found');
    }

    // Verify item exists and belongs to seller
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.sellerId !== seller._id) {
      throw new Error('You do not have permission to add images to this item');
    }

    // Must have either storageId or externalUrl
    if (!args.storageId && !args.externalUrl) {
      throw new Error('Must provide either storageId or externalUrl');
    }

    // Get existing images to determine sort order
    const existingImages = await ctx.db
      .query('item_images')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect();

    const sortOrder = args.sortOrder ?? existingImages.length;
    let isPrimary = args.isPrimary ?? false;

    // If this is the first image, make it primary
    if (existingImages.length === 0) {
      isPrimary = true;
    }

    // If setting as primary, unset existing primary
    if (isPrimary) {
      const currentPrimary = existingImages.find((img) => img.isPrimary);
      if (currentPrimary) {
        await ctx.db.patch(currentPrimary._id, { isPrimary: false });
      }
    }

    const imageId = await ctx.db.insert('item_images', {
      itemId: args.itemId,
      storageId: args.storageId,
      externalUrl: args.externalUrl,
      altText: args.altText,
      sortOrder,
      isPrimary,
      imageType: args.imageType,
      createdAt: Date.now(),
    });

    return imageId;
  },
});

/**
 * Delete an item image (seller)
 */
export const deleteItemImage = mutation({
  args: {
    imageId: v.id('item_images'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { imageId: Id<'item_images'> }
  ): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await getUserFromIdentity(ctx);

    if (!user) {
      throw new Error('User not found');
    }

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      throw new Error('Seller profile not found');
    }

    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return false;
    }

    // Verify item ownership
    const item = await ctx.db.get(image.itemId);
    if (!item) {
      // Orphaned image, but let's be safe
      return false;
    }

    if (item.sellerId !== seller._id) {
      throw new Error('You do not have permission to delete this image');
    }

    // Delete from storage if it's a stored file
    if (image.storageId) {
      await ctx.storage.delete(image.storageId);
    }

    // Delete the record
    await ctx.db.delete(args.imageId);

    // If this was primary, set another one as primary
    if (image.isPrimary) {
      const remainingImages = await ctx.db
        .query('item_images')
        .withIndex('by_item', (q) => q.eq('itemId', image.itemId))
        .collect();

      if (remainingImages.length > 0) {
        await ctx.db.patch(remainingImages[0]._id, { isPrimary: true });
      }
    }

    return true;
  },
});

export const deleteSellerProduct = mutation({
  args: {
    itemId: v.id('items'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { itemId: Id<'items'> }
  ): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();
    if (!seller) throw new Error('Seller profile not found');

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error('Item not found');
    if (item.sellerId !== seller._id) throw new Error('You do not have permission to delete this item');

    // Delete all images and their storage files
    const images = await ctx.db
      .query('item_images')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect();

    for (const image of images) {
      if (image.storageId) {
        await ctx.storage.delete(image.storageId);
      }
      await ctx.db.delete(image._id);
    }

    await ctx.db.delete(args.itemId);
    return true;
  },
});

const categoryValidator = v.union(
  v.literal('top'),
  v.literal('bottom'),
  v.literal('dress'),
  v.literal('outfit'),
  v.literal('outerwear'),
  v.literal('shoes'),
  v.literal('accessory'),
  v.literal('bag'),
  v.literal('jewelry'),
  v.literal('swimwear')
);
const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));

/**
 * Internal: insert a single scraped product for a seller, bypassing auth.
 * Caller (action) is responsible for verifying seller identity + tier limits.
 */
export const insertScrapedProduct = internalMutation({
  args: {
    sellerId: v.id('sellers'),
    name: v.string(),
    description: v.optional(v.string()),
    category: categoryValidator,
    subcategory: v.optional(v.string()),
    gender: genderValidator,
    price: v.number(),
    originalPrice: v.optional(v.number()),
    colors: v.array(v.string()),
    sizes: v.array(v.string()),
    tags: v.array(v.string()),
    inStock: v.boolean(),
    sourceUrl: v.optional(v.string()),
    sku: v.optional(v.string()),
  },
  returns: v.id('items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      sellerId: Id<'sellers'>;
      name: string;
      description?: string;
      category: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry' | 'swimwear';
      subcategory?: string;
      gender: 'male' | 'female' | 'unisex';
      price: number;
      originalPrice?: number;
      colors: string[];
      sizes: string[];
      tags: string[];
      inStock: boolean;
      sourceUrl?: string;
      sku?: string;
    }
  ): Promise<Id<'items'>> => {
    const now = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 10);
    const publicId = `item_${randomPart}`;
    return await ctx.db.insert('items', {
      sellerId: args.sellerId,
      publicId,
      name: args.name,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      gender: args.gender,
      price: args.price,
      currency: 'KES',
      originalPrice: args.originalPrice,
      colors: args.colors,
      sizes: args.sizes,
      tags: args.tags,
      inStock: args.inStock,
      sourceUrl: args.sourceUrl,
      sku: args.sku,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      saveCount: 0,
      purchaseCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal: add an external-URL image to an item (for scraped products).
 */
export const insertScrapedItemImage = internalMutation({
  args: {
    itemId: v.id('items'),
    externalUrl: v.string(),
    imageType: v.union(
      v.literal('front'),
      v.literal('back'),
      v.literal('side'),
      v.literal('detail'),
      v.literal('model'),
      v.literal('flat_lay')
    ),
    isPrimary: v.boolean(),
    sortOrder: v.number(),
  },
  returns: v.id('item_images'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      externalUrl: string;
      imageType: 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';
      isPrimary: boolean;
      sortOrder: number;
    }
  ): Promise<Id<'item_images'>> => {
    if (args.isPrimary) {
      const existing = await ctx.db
        .query('item_images')
        .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
        .filter((q) => q.eq(q.field('isPrimary'), true))
        .first();
      if (existing) await ctx.db.patch(existing._id, { isPrimary: false });
    }
    return await ctx.db.insert('item_images', {
      itemId: args.itemId,
      externalUrl: args.externalUrl,
      imageType: args.imageType,
      isPrimary: args.isPrimary,
      sortOrder: args.sortOrder,
      createdAt: Date.now(),
    });
  },
});

/**
 * Upgrade an existing seller account to tailor type.
 * Sets sellerType = 'tailor' and stores tailor-specific profile details.
 */
export const upgradeToTailor = mutation({
  args: {
    skillTags: v.array(v.string()),
    weeklyCapacity: v.number(),
    turnaroundDays: v.object({
      casual: v.number(),
      formal: v.number(),
      traditional: v.number(),
      structured: v.number(),
    }),
    laborPricing: v.array(v.object({
      garmentType: v.string(),
      priceKES: v.number(),
    })),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      skillTags: string[];
      weeklyCapacity: number;
      turnaroundDays: { casual: number; formal: number; traditional: number; structured: number };
      laborPricing: Array<{ garmentType: string; priceKES: number }>;
    }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error('User not found');

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    if (!seller) throw new Error('Seller profile not found');
    if (seller.sellerType === 'tailor') throw new Error('Already a tailor');

    await ctx.db.patch(seller._id, {
      sellerType: 'tailor',
      skillTags: args.skillTags,
      weeklyCapacity: args.weeklyCapacity,
      turnaroundDays: args.turnaroundDays,
      laborPricing: args.laborPricing,
      updatedAt: Date.now(),
    });
    return null;
  },
});
