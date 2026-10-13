import { User } from 'lucide-react';

type AvatarProps = {
  url: string | null;
  /** Tailwind size classes, e.g. "h-9 w-9". */
  className?: string;
  iconSize?: number;
};

/** The rider's profile picture from their sign-in provider, or a person icon. */
export default function Avatar({ url, className = 'h-9 w-9', iconSize = 18 }: AvatarProps) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-fg ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar; next/image would need remotePatterns per provider
        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <User size={iconSize} aria-hidden="true" />
      )}
    </span>
  );
}
