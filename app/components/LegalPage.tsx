import type { ReactNode } from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';
import { SITE_WRAP, SiteFooter, SiteHeader } from './SiteChrome';
import { ui } from './ui';

// The layout of the privacy policy and terms of use: public, server-rendered,
// one readable column like /help.

export function LegalPage({ title, updated, intro, signedIn, children }: {
  title: string;
  /** When the text last changed, e.g. "October 19, 2026". */
  updated: string;
  intro: ReactNode;
  signedIn: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ui.page}>
      <SiteHeader signedIn={signedIn} />

      <main className={`${SITE_WRAP} max-w-[760px] space-y-8 py-12 text-[16px] leading-relaxed sm:py-16`}>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-sm font-semibold text-muted">Last updated {updated}</p>
          <div className="space-y-3 text-lg text-muted">{intro}</div>
        </div>

        {children}

        <section className="space-y-2 border-t border-line pt-8">
          <h2 className="text-2xl font-extrabold tracking-tight">Questions?</h2>
          <p>
            Write to <SupportLink />.
          </p>
          <p>
            <Link href="/" className="font-bold text-accent hover:underline">
              {signedIn ? 'Back to your garage' : 'SwingArm home'}
            </Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-8">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 marker:text-muted">{children}</ul>;
}

export function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-accent hover:underline">
      {SUPPORT_EMAIL}
    </a>
  );
}

export function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-bold text-accent hover:underline">
      {children}
    </Link>
  );
}
