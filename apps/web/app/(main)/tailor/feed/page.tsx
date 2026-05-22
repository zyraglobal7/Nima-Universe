'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2, Scissors, ImageIcon, Users } from 'lucide-react';
import Image from 'next/image';
import type { Id } from '@/convex/_generated/dataModel';

function InspirationCard({
  inspo,
  onClick,
}: {
  inspo: {
    _id: Id<'tailorInspirations'>;
    imageUrl?: string;
    title: string;
    description?: string;
    tags: string[];
    tailorCount: number;
  };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] bg-surface-alt overflow-hidden">
        {inspo.imageUrl ? (
          <Image
            src={inspo.imageUrl}
            alt={inspo.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground opacity-30" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white font-medium text-sm leading-tight line-clamp-2">{inspo.title}</p>
          <div className="flex items-center gap-1 text-white/70 text-xs mt-1">
            <Users className="w-3 h-3" />
            <span>{inspo.tailorCount} tailor{inspo.tailorCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function TailorFeedPage() {
  const router = useRouter();
  const inspirations = useQuery(api.tailor.inspirations.queries.getCustomerFeed, {});

  if (inspirations === undefined) {
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
          Pick a style. Our Nairobi tailors bring it to life — made to your exact measurements.
        </p>
      </div>

      {inspirations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <Scissors className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="font-medium text-foreground">No styles yet</p>
          <p className="text-muted-foreground text-sm">Our tailors are building their portfolios. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {inspirations.map((inspo) => (
            <InspirationCard
              key={inspo._id}
              inspo={inspo}
              onClick={() => router.push(`/tailor/inspiration/${inspo._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
