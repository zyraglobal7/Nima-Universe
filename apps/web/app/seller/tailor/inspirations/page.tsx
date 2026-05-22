'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, X, Check, ImageIcon, Scissors, RotateCcw, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Inspiration = {
  _id: Id<'tailorInspirations'>;
  storageId: Id<'_storage'>;
  imageUrl?: string;
  title: string;
  description?: string;
  tags: string[];
};

function SwipeCard({
  inspo,
  onChoose,
  isTop,
}: {
  inspo: Inspiration;
  onChoose: (id: Id<'tailorInspirations'>, choice: 'accept' | 'skip') => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-14, 0, 14]);

  // Small colour tint on edges only — not a full overlay
  const rightBg = useTransform(x, [0, 120], ['rgba(34,197,94,0)', 'rgba(34,197,94,0.18)']);
  const leftBg = useTransform(x, [-120, 0], ['rgba(239,68,68,0.18)', 'rgba(239,68,68,0)']);

  // Corner badge opacity (appears at 60px drag)
  const acceptBadge = useTransform(x, [40, 100], [0, 1]);
  const skipBadge = useTransform(x, [-100, -40], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 90) onChoose(inspo._id, 'accept');
    else if (info.offset.x < -90) onChoose(inspo._id, 'skip');
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden border border-border bg-card scale-[0.94] opacity-60 translate-y-3" />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 z-10 rounded-2xl overflow-hidden border border-border bg-card shadow-xl cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.01 }}
    >
      {/* Subtle tint (no blocking overlay) */}
      <motion.div className="absolute inset-0 z-10 pointer-events-none rounded-2xl" style={{ background: rightBg }} />
      <motion.div className="absolute inset-0 z-10 pointer-events-none rounded-2xl" style={{ background: leftBg }} />

      {/* Corner badges */}
      <motion.div
        className="absolute top-4 left-4 z-20 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-bold pointer-events-none"
        style={{ opacity: acceptBadge }}
      >
        YES
      </motion.div>
      <motion.div
        className="absolute top-4 right-4 z-20 bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold pointer-events-none"
        style={{ opacity: skipBadge }}
      >
        SKIP
      </motion.div>

      {inspo.imageUrl ? (
        <Image src={inspo.imageUrl} alt={inspo.title} fill className="object-cover pointer-events-none select-none" draggable={false} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="w-16 h-16 text-muted-foreground opacity-30" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent p-5 pointer-events-none">
        <p className="text-white font-semibold text-lg leading-tight select-none">{inspo.title}</p>
        {inspo.description && (
          <p className="text-white/70 text-sm mt-1 line-clamp-2 select-none">{inspo.description}</p>
        )}
        {inspo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {inspo.tags.map((t) => (
              <span key={t} className="text-[11px] bg-white/20 text-white rounded-full px-2 py-0.5 select-none">{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function TailorInspirationsPage() {
  const queue = useQuery(api.tailor.inspirations.queries.getQueue, {});
  const accepted = useQuery(api.tailor.inspirations.queries.getAccepted, {});
  const choose = useMutation(api.tailor.inspirations.mutations.choose);

  const [dismissed, setDismissed] = useState<Set<Id<'tailorInspirations'>>>(new Set());
  const [activeTab, setActiveTab] = useState<'queue' | 'accepted'>('queue');

  const handleChoose = async (id: Id<'tailorInspirations'>, choice: 'accept' | 'skip') => {
    setDismissed((prev) => new Set([...prev, id]));
    try {
      await choose({ inspirationId: id, choice });
      if (choice === 'accept') toast.success('Added to your portfolio');
    } catch {
      toast.error('Failed to record choice');
      setDismissed((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  if (queue === undefined || accepted === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const remaining = queue.filter((i) => !dismissed.has(i._id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold">Inspirations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Accept styles you can make — they appear on the customer feed.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'queue' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          Queue {remaining.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{remaining.length}</Badge>}
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'accepted' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          My Styles {accepted.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{accepted.length}</Badge>}
        </button>
      </div>

      {activeTab === 'queue' && (
        <div>
          {remaining.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
              <Scissors className="w-12 h-12 text-muted-foreground opacity-30" />
              <p className="font-medium">You&apos;re all caught up!</p>
              <p className="text-sm text-muted-foreground">No new inspirations right now. Check back later.</p>
            </div>
          ) : (
            <>
              {/* Mobile swipe stack */}
              <div className="md:hidden">
                <div className="relative mx-auto select-none" style={{ width: '100%', maxWidth: 340, height: 460 }}>
                  <AnimatePresence>
                    {remaining.slice(0, 2).map((inspo, idx) => (
                      <SwipeCard
                        key={inspo._id}
                        inspo={inspo}
                        onChoose={handleChoose}
                        isTop={idx === 0}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex justify-center gap-8 mt-8">
                  <button
                    className="h-14 w-14 rounded-full border-2 border-red-300 text-red-500 bg-background flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    onClick={() => remaining[0] && handleChoose(remaining[0]._id, 'skip')}
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button
                    className="h-14 w-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                    onClick={() => remaining[0] && handleChoose(remaining[0]._id, 'accept')}
                  >
                    <Heart className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  {remaining.length} left · Swipe right to accept, left to skip
                </p>
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {remaining.map((inspo) => (
                  <div key={inspo._id} className="group border rounded-xl overflow-hidden bg-card">
                    <div className="relative aspect-[3/4]">
                      {inspo.imageUrl ? (
                        <Image src={inspo.imageUrl} alt={inspo.title} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <ImageIcon className="w-10 h-10 text-muted-foreground opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="font-medium text-sm leading-tight line-clamp-1">{inspo.title}</p>
                      {inspo.description && <p className="text-xs text-muted-foreground line-clamp-2">{inspo.description}</p>}
                      {inspo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {inspo.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleChoose(inspo._id, 'skip')}>
                          <X className="w-3.5 h-3.5 mr-1" /> Skip
                        </Button>
                        <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleChoose(inspo._id, 'accept')}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'accepted' && (
        <div>
          {accepted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No accepted styles yet.</p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('queue')}>
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Go to queue
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {accepted.map((inspo) => (
                <div key={inspo._id} className="relative border rounded-xl overflow-hidden bg-card">
                  <div className="relative aspect-[3/4]">
                    {inspo.imageUrl ? (
                      <Image src={inspo.imageUrl} alt={inspo.title} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <ImageIcon className="w-8 h-8 text-muted-foreground opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm leading-tight line-clamp-1">{inspo.title}</p>
                    {inspo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {inspo.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
