import type { View } from '../hooks/useView';
import Avatar from './Avatar';
import BrandLogo from './BrandLogo';
import CountBadge, { accountLinkLabel } from './CountBadge';
import FoundingBadge from './FoundingBadge';
import ViewLink from './ViewLink';

type TopBarProps = {
  avatarUrl: string | null;
  email: string | null;
  /** Admins only: submissions waiting for review, shown as a badge on the avatar. */
  reviewCount: number;
  /** Founding riders get a star on the avatar. */
  founding: boolean;
  onNavigate: (view: View) => void;
  /** False on More itself, where the avatar would link to the same screen. */
  showAvatar: boolean;
};

/** The phone's top bar on every screen: the logo (back to Tasks) and the avatar, which opens More. Desktop uses DesktopHeader. */
export default function TopBar({ avatarUrl, email, reviewCount, founding, onNavigate, showAvatar }: TopBarProps) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-4 lg:hidden">
      <ViewLink view="tasks" onNavigate={onNavigate} aria-label="SwingArm: your tasks">
        <BrandLogo className="h-10 sm:h-12" />
      </ViewLink>
      {showAvatar && (
        <ViewLink
          view="more"
          onNavigate={onNavigate}
          className="relative flex h-11 w-11 items-center justify-center rounded-full"
          aria-label={accountLinkLabel(email, reviewCount, founding)}
          title={email ?? undefined}
        >
          <Avatar url={avatarUrl} className="h-9 w-9 ring-2 ring-line ring-offset-2 ring-offset-page" />
          {founding && <FoundingBadge className="absolute -right-1 -top-1 h-5 w-5 ring-2 ring-page" />}
          <CountBadge count={reviewCount} className="absolute -bottom-1 -right-1.5 ring-page" />
        </ViewLink>
      )}
    </header>
  );
}
