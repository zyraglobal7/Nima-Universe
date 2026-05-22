'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, ArrowLeft, Scissors, Clock, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function InspirationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const tailors = useQuery(api.tailor.inspirations.queries.getTailorsForInspiration, {
    inspirationId: id as Id<'tailorInspirations'>,
  });

  // We don't have a single-inspo query, so derive from customer feed
  const feed = useQuery(api.tailor.inspirations.queries.getCustomerFeed, {});

  if (tailors === undefined || feed === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inspo = feed.find((i) => i._id === id);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Inspiration image */}
      {inspo?.imageUrl && (
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', maxHeight: 420 }}>
          <Image src={inspo.imageUrl} alt={inspo.title ?? ''} fill className="object-cover" />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-serif font-semibold">{inspo?.title ?? 'Inspiration'}</h1>
        {inspo?.description && (
          <p className="text-muted-foreground text-sm mt-1">{inspo.description}</p>
        )}
        {inspo?.tags && inspo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {inspo.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">
          {tailors.length} tailor{tailors.length !== 1 ? 's' : ''} can make this
        </h2>

        {tailors.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Scissors className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No tailors available yet for this style.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tailors.map((tailor) => (
              <button
                key={tailor.sellerId}
                onClick={() => router.push(`/tailor/inspiration/${id}/book/${tailor.sellerId}`)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  {tailor.logoUrl && <AvatarImage src={tailor.logoUrl} alt={tailor.shopName} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {tailor.shopName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{tailor.shopName}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {tailor.turnaroundDays !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> From {tailor.turnaroundDays} days
                      </span>
                    )}
                    {tailor.skillTags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] h-4">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
