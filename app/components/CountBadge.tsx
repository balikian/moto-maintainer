type CountBadgeProps = {
  count: number;
  /** Position and ring color, e.g. "absolute -bottom-0.5 -right-0.5 ring-page". */
  className?: string;
};

/** A small red count, like submissions waiting for an admin. Shows nothing at zero; screen readers get the count from the link's label. */
export default function CountBadge({ count, className = '' }: CountBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-extrabold leading-none text-on-brand ring-2 ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** The avatar link's label, with the review count for admins. */
export function accountLinkLabel(email: string | null, reviewCount: number): string {
  const base = email ? `Signed in as ${email}. Account and settings` : 'Account and settings';
  if (reviewCount <= 0) return base;
  return `${base}, ${reviewCount} ${reviewCount === 1 ? 'submission' : 'submissions'} to review`;
}
