import { Star } from 'lucide-react';

type FoundingBadgeProps = {
  /** Size and position, e.g. "absolute -right-1 -top-1 h-5 w-5 ring-2 ring-page". */
  className?: string;
  iconSize?: number;
};

/**
 * The founding rider's star (founding_riders): on the avatar, on More and on
 * the join page. Decorative; the text beside it, or the avatar link's label,
 * says it.
 */
export default function FoundingBadge({ className = 'h-5 w-5', iconSize = 11 }: FoundingBadgeProps) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-brand text-on-brand ${className}`}>
      <Star size={iconSize} strokeWidth={2.4} fill="currentColor" />
    </span>
  );
}
