'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Scissors,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  Clock,
  Users,
  Banknote,
} from 'lucide-react';

// ── constants ──────────────────────────────────────────────────────────────

const SKILL_TAG_OPTIONS = [
  'Ankara', 'Kitenge', 'Kanga', 'Linen', 'Cotton', 'Satin',
  'Chiffon', 'Denim', 'Bridal', 'Suits', 'Menswear', 'Childrenswear',
  'Traditional', 'Contemporary', 'Streetwear', 'Formal',
];

const GARMENT_TYPES = [
  { key: 'dress', label: 'Dress' },
  { key: 'top', label: 'Top / Blouse' },
  { key: 'trouser', label: 'Trousers' },
  { key: 'skirt', label: 'Skirt' },
  { key: 'suit', label: 'Suit / Blazer' },
  { key: 'traditional', label: 'Traditional outfit' },
] as const;

const TURNAROUND_LABELS: Record<string, string> = {
  casual: 'Casual wear',
  formal: 'Formal / Evening',
  traditional: 'Traditional',
  structured: 'Structured / Tailored',
};

const steps = [
  { id: 1, title: 'Your skills', icon: Scissors },
  { id: 2, title: 'Capacity', icon: Users },
  { id: 3, title: 'Pricing', icon: Banknote },
  { id: 4, title: 'Review', icon: CheckCircle2 },
];

// ── page ───────────────────────────────────────────────────────────────────

export default function TailorOnboardingPage() {
  const router = useRouter();
  const seller = useQuery(api.sellers.queries.getCurrentSeller);
  const upgradeToTailor = useMutation(api.sellers.mutations.upgradeToTailor);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 – skills
  const [skillTags, setSkillTags] = useState<string[]>([]);

  // Step 2 – capacity & turnaround
  const [weeklyCapacity, setWeeklyCapacity] = useState('5');
  const [turnaround, setTurnaround] = useState({
    casual: '7',
    formal: '14',
    traditional: '10',
    structured: '14',
  });

  // Step 3 – labor pricing
  const [pricing, setPricing] = useState<Record<string, string>>(() =>
    Object.fromEntries(GARMENT_TYPES.map((g) => [g.key, '']))
  );

  // Redirect if already a tailor
  if (seller === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (seller?.sellerType === 'tailor') {
    router.replace('/seller/tailor');
    return null;
  }
  if (!seller) {
    router.replace('/seller/onboarding');
    return null;
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  function toggleSkill(tag: string) {
    setSkillTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (skillTags.length === 0) {
        toast.error('Select at least one skill or speciality');
        return false;
      }
    }
    if (step === 2) {
      const cap = parseInt(weeklyCapacity);
      if (isNaN(cap) || cap < 1) {
        toast.error('Enter a valid weekly capacity');
        return false;
      }
      for (const [key, val] of Object.entries(turnaround)) {
        const days = parseInt(val);
        if (isNaN(days) || days < 1) {
          toast.error(`Enter a valid turnaround for ${TURNAROUND_LABELS[key]}`);
          return false;
        }
      }
    }
    if (step === 3) {
      const filled = GARMENT_TYPES.filter((g) => pricing[g.key] !== '');
      if (filled.length === 0) {
        toast.error('Add pricing for at least one garment type');
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    const laborPricing = GARMENT_TYPES
      .filter((g) => pricing[g.key] !== '')
      .map((g) => ({ garmentType: g.key, priceKES: parseInt(pricing[g.key]) }));

    setSaving(true);
    try {
      await upgradeToTailor({
        skillTags,
        weeklyCapacity: parseInt(weeklyCapacity),
        turnaroundDays: {
          casual: parseInt(turnaround.casual),
          formal: parseInt(turnaround.formal),
          traditional: parseInt(turnaround.traditional),
          structured: parseInt(turnaround.structured),
        },
        laborPricing,
      });
      toast.success("You're now a Nima tailor!");
      router.push('/seller/tailor');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif font-semibold text-lg">Become a Tailor</h1>
            <p className="text-sm text-muted-foreground">
              {seller.shopName} · Tailor profile setup
            </p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`hidden sm:block text-sm font-medium ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step > s.id ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <AnimatePresence mode="wait">

          {/* Step 1 – Skills */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Your specialities</h2>
                <p className="text-muted-foreground mt-1">
                  What fabrics and styles do you work with? Pick everything that applies.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SKILL_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleSkill(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                      skillTags.includes(tag)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-surface border-border text-foreground hover:border-primary/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {skillTags.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {skillTags.length} selected: {skillTags.join(', ')}
                </p>
              )}
            </motion.div>
          )}

          {/* Step 2 – Capacity */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Capacity &amp; turnaround</h2>
                <p className="text-muted-foreground mt-1">
                  Help customers know what to expect before they order.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Orders per week
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="5"
                  value={weeklyCapacity}
                  onChange={(e) => setWeeklyCapacity(e.target.value)}
                  className="max-w-[160px]"
                />
                <p className="text-xs text-muted-foreground">How many orders can you comfortably handle per week?</p>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Turnaround times (days)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(TURNAROUND_LABELS) as Array<keyof typeof turnaround>).map((key) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{TURNAROUND_LABELS[key]}</label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        placeholder="7"
                        value={turnaround[key]}
                        onChange={(e) => setTurnaround((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 – Pricing */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Labour pricing</h2>
                <p className="text-muted-foreground mt-1">
                  Your base labour charge per garment type in KES. Leave blank for garments you don't make.
                </p>
              </div>

              <div className="space-y-3">
                {GARMENT_TYPES.map((g) => (
                  <div key={g.key} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-40 flex-shrink-0">{g.label}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-muted-foreground">KES</span>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        placeholder="e.g. 2500"
                        value={pricing[g.key]}
                        onChange={(e) =>
                          setPricing((prev) => ({ ...prev, [g.key]: e.target.value }))
                        }
                        className="h-9 max-w-[160px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4 – Review */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Review &amp; confirm</h2>
                <p className="text-muted-foreground mt-1">
                  Everything looks good? Confirm to activate your tailor profile.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 space-y-5">
                {/* Skills */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillTags.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </div>

                {/* Capacity */}
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacity &amp; turnaround</p>
                  <p className="text-sm"><span className="text-muted-foreground">Weekly capacity:</span> {weeklyCapacity} orders</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {(Object.keys(TURNAROUND_LABELS) as Array<keyof typeof turnaround>).map((k) => (
                      <p key={k}>
                        <span className="text-muted-foreground">{TURNAROUND_LABELS[k]}:</span> {turnaround[k]} days
                      </p>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labour pricing</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {GARMENT_TYPES.filter((g) => pricing[g.key] !== '').map((g) => (
                      <p key={g.key}>
                        <span className="text-muted-foreground">{g.label}:</span> KES {parseInt(pricing[g.key]).toLocaleString()}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 p-4 flex gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">You're almost ready to start taking orders</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your tailor section will unlock in the seller dashboard where you can manage fabrics, designs, and orders.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer actions */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < 4 ? (
            <Button onClick={() => { if (validateStep()) setStep((s) => s + 1); }}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Activating…</>
              ) : (
                <><Scissors className="w-4 h-4 mr-2" />Activate tailor profile</>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
