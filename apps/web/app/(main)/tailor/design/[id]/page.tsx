'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Scissors, ArrowLeft, Clock, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Id } from '@/convex/_generated/dataModel';

// Derive garment type from item category
function itemCategoryToGarmentType(category: string): string {
  if (category === 'dress') return 'dress';
  if (category === 'bottom') return 'trouser';
  if (category === 'top') return 'top';
  return 'dress';
}

export default function TailorDesignPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as Id<'items'>;

  const item = useQuery(api.items.queries.getTailoredDesign, { itemId });

  if (item === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
        <Scissors className="w-12 h-12 text-text-secondary opacity-30" />
        <p className="text-text-secondary">Design not available.</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const garmentType = itemCategoryToGarmentType(item.category);

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero image placeholder */}
      <div className="aspect-[3/4] bg-surface-2 rounded-xl flex items-center justify-center">
        <Scissors className="w-16 h-16 text-text-secondary opacity-20" />
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-serif font-semibold text-text-primary">{item.name}</h1>
          {item.brand && <p className="text-sm text-text-secondary mt-0.5">{item.brand}</p>}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold text-primary">
            KES {item.price.toLocaleString()}
          </span>
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            7–10 days
          </Badge>
        </div>

        {item.description && (
          <p className="text-sm text-text-secondary leading-relaxed">{item.description}</p>
        )}

        {item.material && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Fabric:</span>
            {item.material}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button
            className="w-full"
            onClick={() => router.push(`/tailor/measurements/${garmentType}?next=/tailor/checkout/${item._id}`)}
          >
            <Ruler className="w-4 h-4 mr-2" />
            Set measurements &amp; order
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/tailor/checkout/${item._id}`)}
          >
            Order now — KES {item.price.toLocaleString()}
          </Button>
        </div>

        <p className="text-xs text-text-secondary text-center">
          Full payment upfront via M-Pesa. No balance on delivery.
        </p>
      </div>
    </div>
  );
}
