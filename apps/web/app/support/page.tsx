import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { SUPPORT_INFO } from '@/Policies';

export const metadata = {
  title: 'Support | Nima AI',
  description:
    'Get help and support for Nima AI — your personal AI stylist. Contact us at support@shopnima.ai.',
};

/**
 * Renders a support section with optional content, list, and paragraphs.
 */
function SupportSection({
  section,
}: {
  section: {
    heading: string;
    content?: string;
    paragraphs?: readonly string[];
    list?: readonly string[];
  };
}) {
  return (
    <section>
      <h2 className="text-xl font-serif font-semibold text-foreground mb-3">
        {section.heading}
      </h2>

      {section.paragraphs &&
        section.paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed text-foreground/90 mb-3"
          >
            {p}
          </p>
        ))}

      {section.content && (
        <p className="text-sm leading-relaxed text-foreground/90 mb-3">
          {section.content}
        </p>
      )}

      {section.list && (
        <ul className="space-y-2 ml-1">
          {section.list.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="text-lg font-serif font-semibold text-foreground">
            {SUPPORT_INFO.title}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <p className="text-sm leading-relaxed text-foreground/90 mb-6">
          {SUPPORT_INFO.intro}
        </p>

        {/* Primary contact card */}
        <a
          href={`mailto:${SUPPORT_INFO.contactEmail}`}
          className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 mb-8 transition-colors duration-200 hover:border-secondary"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              Email our support team
            </span>
            <span className="text-sm text-secondary">
              {SUPPORT_INFO.contactEmail}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {SUPPORT_INFO.responseTime}
            </span>
          </span>
        </a>

        {/* Support Sections */}
        <div className="space-y-8">
          {SUPPORT_INFO.sections.map((section, idx) => (
            <SupportSection key={idx} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {SUPPORT_INFO.company}. All rights
            reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link
              href="/privacyPolicy"
              className="text-xs text-secondary hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/termsAndConditions"
              className="text-xs text-secondary hover:underline"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
