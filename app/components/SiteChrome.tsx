import type { ReactNode } from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';
import BrandLogo from './BrandLogo';
import { ui } from './ui';

// The header and footer of the public pages (home, /about, /help, /privacy,
// /terms).

/** The width and side padding of the public pages' content. */
export const SITE_WRAP = 'mx-auto w-full max-w-[1120px] px-4 sm:px-8';

export function SiteHeader({ signedIn, nav }: {
  signedIn: boolean;
  /** Links to this page's sections, shown from tablet width up. */
  nav?: ReactNode;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className={`${SITE_WRAP} flex h-[4.25rem] items-center gap-8`}>
        <Link href="/" aria-label="SwingArm home">
          <BrandLogo className="h-9" />
        </Link>
        {nav && (
          <nav aria-label="Page" className="hidden gap-6 text-[15px] font-bold text-muted md:flex">
            {nav}
          </nav>
        )}
        <Link href={signedIn ? '/' : '/login'} className={`ml-auto ${ui.secondaryButton} min-h-11`}>
          {signedIn ? 'Your garage' : 'Sign in'}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className={`${SITE_WRAP} flex flex-wrap justify-between gap-5 pb-9 pt-7 text-sm font-semibold text-muted`}>
        <span>© {new Date().getFullYear()} SwingArm</span>
        <span className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/help" className="hover:text-fg">
            How it works
          </Link>
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-fg">
            Contact
          </a>
        </span>
      </div>
    </footer>
  );
}
