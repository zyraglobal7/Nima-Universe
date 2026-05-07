'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Store, Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { Badge } from '@/components/ui/badge';

function ProductCard({
  item,
  isVerifiedSeller,
}: {
  item: {
    _id: string;
    name: string;
    brand?: string;
    price: number;
    currency: string;
    originalPrice?: number;
    inStock: boolean;
    primaryImageUrl: string | null;
  };
  isVerifiedSeller: boolean;
}) {
  const discount =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round((1 - item.price / item.originalPrice) * 100)
      : null;

  return (
    <Link href={`/product/${item._id}`} className="group block">
      <div className="relative aspect-[3/4] bg-surface rounded-xl overflow-hidden mb-3">
        {item.primaryImageUrl ? (
          <Image
            src={item.primaryImageUrl}
            alt={item.name}
            fill
            unoptimized={
              item.primaryImageUrl.includes('convex.cloud') ||
              item.primaryImageUrl.includes('convex.site') ||
              item.primaryImageUrl.includes('cdn.shopify.com')
            }
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-alt">
            <Package className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount && (
            <span className="px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-full">
              -{discount}%
            </span>
          )}
          {!item.inStock && (
            <span className="px-2 py-0.5 bg-background/80 backdrop-blur-sm text-muted-foreground text-xs font-medium rounded-full">
              Sold out
            </span>
          )}
        </div>

        {/* Verified seller buy indicator */}
        {isVerifiedSeller && item.inStock && (
          <div className="absolute bottom-2 right-2 p-2 bg-background/90 backdrop-blur-sm rounded-full shadow-sm">
            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
      </div>

      <div className="space-y-0.5 px-1">
        {item.brand && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium truncate">
            {item.brand}
          </p>
        )}
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {item.name}
        </p>
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-sm font-semibold text-foreground">
            {formatPrice(item.price, item.currency)}
          </span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(item.originalPrice, item.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="block">
      <div className="aspect-[3/4] bg-surface rounded-xl animate-pulse mb-3" />
      <div className="space-y-1.5 px-1">
        <div className="h-3 bg-muted animate-pulse rounded w-16" />
        <div className="h-4 bg-muted animate-pulse rounded w-full" />
        <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
      </div>
    </div>
  );
}

export default function ShopPage() {
  const params = useParams();
  const slug = params.slug as string;

  const seller = useQuery(api.sellers.queries.getSellerBySlug, { slug });
  const items = useQuery(
    api.items.queries.getSellerItemsWithImages,
    seller ? { sellerId: seller._id } : 'skip'
  );

  // Loading state
  if (seller === undefined) {
    return (
      <div className="min-h-screen bg-background">
        {/* Banner skeleton */}
        <div className="h-48 md:h-64 bg-surface animate-pulse" />

        <div className="max-w-4xl mx-auto px-4">
          {/* Header skeleton */}
          <div className="flex items-end gap-4 -mt-10 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse border-4 border-background flex-shrink-0" />
            <div className="pb-2 space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded w-40" />
              <div className="h-4 bg-muted animate-pulse rounded w-24" />
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (seller === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Store className="w-12 h-12 text-muted-foreground/40" />
        <h1 className="text-2xl font-serif font-semibold text-foreground">Store not found</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          This store doesn&apos;t exist or is no longer active on Nima.
        </p>
        <Link
          href="/discover"
          className="mt-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Browse Discover
        </Link>
      </div>
    );
  }

  const isVerified = seller.verificationStatus === 'verified';

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Back navigation */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          href="/discover"
          className="flex items-center gap-1.5 px-3 py-2 bg-background/80 backdrop-blur-md rounded-full border border-border text-sm text-foreground hover:bg-background transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 via-surface to-secondary/20 overflow-hidden">
        {seller.bannerUrl ? (
          <Image
            src={seller.bannerUrl}
            alt={`${seller.shopName} banner`}
            fill
            unoptimized={
              seller.bannerUrl.includes('convex.cloud') ||
              seller.bannerUrl.includes('convex.site')
            }
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/5 to-secondary/15" />
        )}
        {/* Soft gradient overlay at bottom for logo blending */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Store header */}
        <div className="flex items-end gap-4 -mt-10 mb-6 relative z-10">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl border-4 border-background shadow-lg bg-surface flex-shrink-0 overflow-hidden">
            {seller.logoUrl ? (
              <Image
                src={seller.logoUrl}
                alt={seller.shopName}
                width={80}
                height={80}
                unoptimized={
                  seller.logoUrl.includes('convex.cloud') ||
                  seller.logoUrl.includes('convex.site')
                }
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <Store className="w-8 h-8 text-primary/60" />
              </div>
            )}
          </div>

          {/* Name + status */}
          <div className="pb-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground truncate">
                {seller.shopName}
              </h1>
              {isVerified && <VerifiedBadge size="md" />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isVerified ? (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                  Nima Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                  Verification Pending
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {seller.productCount === 1
                  ? '1 product'
                  : `${seller.productCount} products`}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {seller.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            {seller.description}
          </p>
        )}

        {/* Verified seller explanation if not verified */}
        {!isVerified && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-medium">Verification in progress.</span>{' '}
              The Nima team is in the process of physically verifying this store. Products can be
              browsed and tried on, but purchases will be available once verification is complete.
            </p>
          </div>
        )}

        {/* Products grid */}
        {items === undefined ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No products listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ProductCard
                key={item._id}
                item={item}
                isVerifiedSeller={isVerified}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
