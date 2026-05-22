'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Scissors,
  ShoppingBag,
  BarChart2,
  TrendingUp,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Data ────────────────────────────────────────────────────────────────────

const heroImages = [
  { src: '/seller-hero/pexels-aysegul-aytoren-46790226-12729102.jpg', aspect: 'aspect-[3/4]' },
  { src: '/seller-hero/pexels-biravencrow-33327425.jpg',              aspect: 'aspect-[4/5]' },
  { src: '/seller-hero/pexels-biravencrow-33327425 (1).jpg',          aspect: 'aspect-[3/4]' },
  { src: '/seller-hero/pexels-biravencrow-33357508.jpg',              aspect: 'aspect-[2/3]' },
  { src: '/seller-hero/pexels-matreding-13532890.jpg',                aspect: 'aspect-[4/5]' },
];

const sellerBenefits = [
  { icon: Sparkles,  title: 'AI-powered discovery',    desc: "Your products surface to shoppers through Nima's styling AI — not just a search bar. Every recommendation is personalised." },
  { icon: BarChart2, title: 'Real-time analytics',     desc: "See exactly what's converting. Track try-ons, saves, clicks, and revenue in one dashboard." },
  { icon: TrendingUp,title: 'Virtual try-on included', desc: 'Customers try your items on their own photo before buying. Fewer returns, higher confidence.' },
  { icon: Users,     title: 'Growing customer base',   desc: "Reach Nairobi's style-conscious shoppers who are actively looking for what you sell." },
  { icon: ShoppingBag,title:'Easy product management', desc: 'Upload once — our AI writes descriptions, tags products, and keeps your catalog fresh.' },
  { icon: Zap,       title: 'Fast setup, low friction',desc: 'Onboard in minutes. Import your existing catalog or start fresh — no tech skills needed.' },
];

const tailorBenefits = [
  { icon: Scissors,     title: 'Orders come to you',       desc: 'Customers browse your accepted styles and book you directly. No chasing — just sewing.' },
  { icon: TrendingUp,   title: 'Guaranteed payouts',       desc: 'Payment is collected upfront. Your payout is released the moment QC passes — no chasing clients.' },
  { icon: Sparkles,     title: 'Curated inspiration feed', desc: 'Admin curates style inspirations. You swipe to accept the ones you can make. Customers see your portfolio.' },
  { icon: BarChart2,    title: 'Manage your capacity',     desc: 'Set your weekly order capacity and lead times. Nima only routes orders you can handle.' },
  { icon: CheckCircle2, title: 'Transparent QC',           desc: 'Our quality check protects your reputation and ensures fair payment disputes — documented every time.' },
  { icon: Users,        title: 'Build a loyal clientele',  desc: 'Repeat customers come back to the tailor they trust. Nima keeps your profile in front of them.' },
];

const stats = [
  { value: 'AI-first', label: 'Discovery engine' },
  { value: 'M-Pesa',   label: 'Seamless payments' },
  { value: 'Virtual',  label: 'Try-on included' },
  { value: 'QC',       label: 'Quality guarantee' },
];

// ─── Shared reveal variant ────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: 'easeOut' as const, delay: i * 0.07 },
  }),
};

// ─── Components ──────────────────────────────────────────────────────────────

function BenefitCard({ icon: Icon, title, desc, index }: {
  icon: React.ElementType; title: string; desc: string; index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-48px' }}
      className="group flex gap-4 p-5 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 hover:border-[#C9A07A]/30 transition-all duration-300"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#C9A07A]/12 flex items-center justify-center group-hover:bg-[#C9A07A]/20 transition-colors">
        <Icon className="w-5 h-5 text-[#C9A07A]" />
      </div>
      <div>
        <p className="font-semibold text-sm text-[#F5F0E8]">{title}</p>
        <p className="text-sm text-[#8C7B6E] mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ─── Masonry hero grid ────────────────────────────────────────────────────────

function MasonryGrid() {
  const col1 = heroImages.filter((_, i) => i % 2 === 0); // 0, 2, 4
  const col2 = heroImages.filter((_, i) => i % 2 === 1); // 1, 3

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Two-column masonry */}
      <div className="flex gap-2.5 h-full">
        {/* Column 1 */}
        <div className="flex flex-col gap-2.5 flex-1">
          {col1.map((img, i) => (
            <motion.div
              key={img.src}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`relative w-full ${img.aspect} rounded-2xl overflow-hidden flex-shrink-0`}
            >
              <Image
                src={img.src}
                alt="Fashion"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 0px, 30vw"
                priority={i === 0}
              />
            </motion.div>
          ))}
        </div>

        {/* Column 2 — offset top */}
        <div className="flex flex-col gap-2.5 flex-1 mt-8">
          {col2.map((img, i) => (
            <motion.div
              key={img.src}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 + i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`relative w-full ${img.aspect} rounded-2xl overflow-hidden flex-shrink-0`}
            >
              <Image
                src={img.src}
                alt="Fashion"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 0px, 30vw"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom dissolve fade */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #1A1614 0%, #1A1614 15%, transparent 100%)' }}
      />

      {/* Subtle left edge fade for blending into text */}
      <div className="absolute inset-y-0 left-0 w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #1A1614, transparent)' }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerLandingPage() {
  const router = useRouter();
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  useEffect(() => {
    if (seller) router.replace('/seller/dashboard');
  }, [seller, router]);

  if (seller === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1614' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#C9A07A' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#1A1614', color: '#F5F0E8' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(26,22,20,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <Link href="/" className="font-serif font-semibold text-xl" style={{ color: '#F5F0E8' }}>Nima</Link>
        <div className="flex items-center gap-3">
          <Link href="/seller/onboarding">
            <button className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 cursor-pointer hover:opacity-80"
              style={{ border: '1px solid rgba(255,255,255,0.18)', color: '#F5F0E8', background: 'transparent' }}
            >
              Seller sign up
            </button>
          </Link>
          <Link href="/sign-in">
            <button className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 cursor-pointer hover:opacity-90"
              style={{ background: '#C9A07A', color: '#1A1614' }}
            >
              Sign in
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>

        {/* Ambient glow blobs */}
        <div className="absolute pointer-events-none" aria-hidden
          style={{ top: '-10%', left: '-5%', width: '55%', height: '70%', borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(92,42,51,0.45) 0%, transparent 70%)',
            filter: 'blur(80px)', transform: 'rotate(-20deg)' }}
        />
        <div className="absolute pointer-events-none" aria-hidden
          style={{ bottom: '-15%', right: '-10%', width: '60%', height: '75%', borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(166,124,82,0.25) 0%, transparent 70%)',
            filter: 'blur(100px)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-12 items-start pt-20 lg:pt-28 pb-24">

          {/* Left — text */}
          <div className="flex flex-col justify-center lg:pt-8">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8 select-none"
                style={{ border: '1px solid rgba(201,160,122,0.3)', background: 'rgba(201,160,122,0.1)', color: '#C9A07A' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                For sellers & tailors
              </div>

              <h1 className="font-serif leading-tight mb-6"
                style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)', letterSpacing: '-0.02em', color: '#F5F0E8' }}
              >
                Grow your fashion<br />business in Nairobi
              </h1>

              <p className="leading-relaxed mb-10 max-w-md"
                style={{ fontSize: '1.0625rem', color: '#8C7B6E', lineHeight: 1.65 }}
              >
                Nima connects your products — or your craft — with thousands of style-driven customers through AI-powered discovery, virtual try-ons, and personalised recommendations.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/seller/onboarding">
                  <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm transition-all duration-200 hover:opacity-90 cursor-pointer"
                    style={{ background: '#C9A07A', color: '#1A1614' }}
                  >
                    Start selling <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/seller/tailor/onboarding">
                  <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm transition-all duration-200 hover:bg-white/8 cursor-pointer"
                    style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#F5F0E8' }}
                  >
                    <Scissors className="w-4 h-4" /> Join as a tailor
                  </button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 mt-10">
                <div className="flex -space-x-2">
                  {['#5C2A33', '#A67C52', '#3D6B4F', '#2A4A5C'].map((c, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2"
                      style={{ background: c, borderColor: '#1A1614' }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: '#8C7B6E' }}>
                  Trusted by sellers across Nairobi
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right — masonry */}
          <div className="hidden lg:block" style={{ height: '80vh', maxHeight: 700 }}>
            <MasonryGrid />
          </div>
        </div>

        {/* Page-bottom fade to section below */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #1A1614, transparent)' }}
        />
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="py-14 px-6"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map(({ value, label }, i) => (
            <motion.div
              key={label}
              variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-center"
            >
              <p className="font-serif text-2xl font-semibold" style={{ color: '#C9A07A' }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: '#8C7B6E', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Seller benefits ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
            style={{ border: '1px solid rgba(166,124,82,0.3)', background: 'rgba(166,124,82,0.1)', color: '#C9A07A' }}
          >
            <ShoppingBag className="w-3 h-3" /> For sellers
          </div>
          <h2 className="font-serif text-3xl font-semibold" style={{ color: '#F5F0E8', letterSpacing: '-0.01em' }}>
            What Nima does for your store
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: '#8C7B6E' }}>
            List your products once. Nima&apos;s AI puts them in front of the right shopper at the right moment.
          </p>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sellerBenefits.map((b, i) => <BenefitCard key={b.title} {...b} index={i} />)}
        </div>
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10">
          <Link href="/seller/onboarding">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90 cursor-pointer"
              style={{ background: '#C9A07A', color: '#1A1614' }}
            >
              Open your store <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── Tailor benefits ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
            style={{ border: '1px solid rgba(92,42,51,0.5)', background: 'rgba(92,42,51,0.2)', color: '#C9A07A' }}
          >
            <Scissors className="w-3 h-3" /> For tailors
          </div>
          <h2 className="font-serif text-3xl font-semibold" style={{ color: '#F5F0E8', letterSpacing: '-0.01em' }}>
            What Nima does for your craft
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: '#8C7B6E' }}>
            Stop chasing clients. Nima matches you with customers who want exactly what you make — and pays you on time.
          </p>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tailorBenefits.map((b, i) => <BenefitCard key={b.title} {...b} index={i} />)}
        </div>
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10">
          <Link href="/seller/tailor/onboarding">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:bg-white/8 cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#F5F0E8' }}
            >
              <Scissors className="w-4 h-4" /> Join as a tailor <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 px-6"
        style={{ background: 'linear-gradient(135deg, #2D1519 0%, #1A1614 40%, #2C2218 100%)' }}
      >
        {/* Blobs */}
        <div className="absolute pointer-events-none" aria-hidden
          style={{ top: '-30%', right: '-10%', width: '50%', height: '160%', borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(92,42,51,0.5) 0%, transparent 65%)',
            filter: 'blur(80px)' }}
        />
        <div className="absolute pointer-events-none" aria-hidden
          style={{ bottom: '-40%', left: '-5%', width: '40%', height: '140%', borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(166,124,82,0.3) 0%, transparent 65%)',
            filter: 'blur(70px)' }}
        />

        <motion.div
          variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <h2 className="font-serif text-4xl font-semibold mb-3" style={{ color: '#F5F0E8', letterSpacing: '-0.02em' }}>
            Ready to grow with Nima?
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#8C7B6E' }}>
            Join sellers and tailors already earning on the platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/seller/onboarding">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90 cursor-pointer"
                style={{ background: '#C9A07A', color: '#1A1614' }}
              >
                Open your store <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/seller/tailor/onboarding">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium transition-all duration-200 hover:bg-white/8 cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#F5F0E8' }}
              >
                <Scissors className="w-4 h-4" /> Join as a tailor
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
