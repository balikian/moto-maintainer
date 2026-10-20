'use client';

import { Check } from 'lucide-react';
import type { View } from '../hooks/useView';
import { NAV_TABS } from './AppNav';
import Avatar from './Avatar';
import BrandLogo from './BrandLogo';
import CountBadge, { accountLinkLabel } from './CountBadge';
import ViewLink from './ViewLink';
import { ui } from './ui';

type DesktopHeaderProps = {
  view: View;
  avatarUrl: string | null;
  email: string | null;
  /** Admins only: submissions waiting for review, shown as a badge on the avatar. */
  reviewCount: number;
  onNavigate: (view: View) => void;
  onLogService: () => void;
  canLogService: boolean;
};

/** Desktop's bar across the top: logo, screens, Log service, and the avatar, which opens More. Phones use AppNav. */
export default function DesktopHeader({ view, avatarUrl, email, reviewCount, onNavigate, onLogService, canLogService }: DesktopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-surface print:hidden lg:block">
      <div className="mx-auto flex h-[4.25rem] max-w-[1180px] items-center gap-9 px-8">
        <ViewLink view="tasks" onNavigate={onNavigate} aria-label="SwingArm: your tasks">
          <BrandLogo className="h-9" />
        </ViewLink>
        <nav aria-label="Main" className="flex gap-1 self-stretch">
          {NAV_TABS.filter((tab) => tab.view !== 'more').map(({ view: target, label, Icon }) => {
            const isCurrent = target === view;
            return (
              <ViewLink
                key={target}
                view={target}
                onNavigate={onNavigate}
                aria-current={isCurrent ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 text-[15px] transition-colors ${
                  isCurrent ? 'font-extrabold text-fg shadow-[inset_0_-3px_0_var(--sa-brand)]' : 'font-bold text-muted hover:text-fg'
                }`}
              >
                <Icon size={18} className={isCurrent ? 'text-accent' : undefined} aria-hidden="true" />
                {label}
              </ViewLink>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" onClick={onLogService} disabled={!canLogService} className={`${ui.primaryButton} min-h-11 text-[15px]`}>
            <Check size={17} strokeWidth={2.6} aria-hidden="true" /> Log service
          </button>
          <ViewLink
            view="more"
            onNavigate={onNavigate}
            aria-current={view === 'more' ? 'page' : undefined}
            className="relative flex h-11 w-11 items-center justify-center rounded-full"
            aria-label={accountLinkLabel(email, reviewCount)}
            title={email ?? undefined}
          >
            <Avatar
              url={avatarUrl}
              className={`h-9 w-9 ring-2 ring-offset-2 ring-offset-surface ${view === 'more' ? 'ring-accent' : 'ring-line'}`}
            />
            <CountBadge count={reviewCount} className="absolute -bottom-1 -right-1.5 ring-surface" />
          </ViewLink>
        </div>
      </div>
    </header>
  );
}
