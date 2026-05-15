'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2, Scissors } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';

function LeadTimeBadge({ days }: { days?: number }) {
  const d = days ?? 7;
  return (
    <span className="text-xs text-muted-foreground">
      {d}–{d + 2} days
    </span>
  );
}

function DesignCard({
  item,
  onClick,
}: {
  item: {
    _id: Id<'items'>;
    name: string;
    price: number;
    currency: string;
    description?: string;
    sellerId?: Id<'sellers'>;
  };
  onClick: () => void;
}) {
  const priceKES = item.price;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-sm"
    >
      <div className="aspect-[3/4] bg-surface-alt flex items-center justify-center overflow-hidden">
        <Scissors className="w-10 h-10 text-muted-foreground opacity-30 group-hover:opacity-50 transition-opacity" />
      </div>
      <div className="p-4 space-y-1">
        <p className="font-medium text-foreground text-sm leading-tight line-clamp-2">{item.name}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-primary">
            KES {priceKES.toLocaleString()}
          </span>
          <LeadTimeBadge />
        </div>
      </div>
    </button>
  );
}

export default function TailorFeedPage() {
  const router = useRouter();
  const designs = useQuery(api.items.queries.getTailoredDesigns, { limit: 50 });

  if (designs === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">Tailored for you</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Custom-made by Nairobi tailors. Every piece made to your measurements.
        </p>
      </div>

      {designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <Scissors className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No designs available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {designs.map((item) => (
            <DesignCard
              key={item._id}
              item={item}
              onClick={() => router.push(`/tailor/design/${item._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
