import type { ReactNode } from 'react';
import type { View } from '../hooks/useView';
import Avatar from './Avatar';
import ViewLink from './ViewLink';

type TopBarProps = {
  /** The logo on Tasks, the screen's title elsewhere. */
  children: ReactNode;
  avatarUrl: string | null;
  email: string | null;
  className?: string;
  /** Shows the avatar, which opens More; omit on More itself. Desktop shows it in DesktopHeader instead. */
  onNavigate?: (view: View) => void;
};

/** The top of each screen: its title, and the signed-in rider's avatar, which opens More. */
export default function TopBar({ children, avatarUrl, email, onNavigate, className = '' }: TopBarProps) {
  return (
    <header className={`flex min-h-12 items-center justify-between gap-4 ${className}`}>
      {children}
      {onNavigate && (
        <ViewLink
          view="more"
          onNavigate={onNavigate}
          className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
          aria-label={email ? `Signed in as ${email}. Account and settings` : 'Account and settings'}
          title={email ?? undefined}
        >
          <Avatar url={avatarUrl} className="h-9 w-9 ring-2 ring-line ring-offset-2 ring-offset-page" />
        </ViewLink>
      )}
    </header>
  );
}
