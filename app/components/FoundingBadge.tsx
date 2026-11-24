type FoundingBadgeProps = {
  /** Size and position, e.g. "absolute -right-1 -top-1 h-5 w-5 ring-2 ring-page". */
  className?: string;
  iconSize?: number;
};

/** A chain sprocket: ten teeth around a solid ring with a hole in the middle (24 × 24). */
const SPROCKET_PATH =
  'M12 4.4L13.2 1.1L14.9 1.4L14.8 4.9L16.5 5.9L19.4 3.9L20.6 5.1L18.4 7.9L19.2 9.7L22.8 9.8L23 11.4L19.6 12.5L19.2 14.3L22 16.6L21.2 18L17.9 16.8L16.5 18.1L17.4 21.6L15.9 22.3L13.9 19.4L12 19.6L10.8 22.9L9.1 22.6L9.2 19.1L7.5 18.1L4.6 20.1L3.4 18.9L5.6 16.1L4.8 14.3L1.2 14.2L1 12.6L4.4 11.5L4.8 9.7L2 7.4L2.8 6L6.1 7.2L7.5 5.9L6.6 2.4L8.1 1.7L10.1 4.6Z' +
  'M15.4 12a3.4 3.4 0 1 0 -6.8 0a3.4 3.4 0 1 0 6.8 0Z';

/**
 * The founding rider's sprocket (founding_riders): on the avatar, on More and
 * on the join page. A solid shape, so it still reads at the avatar's 20 px.
 * Decorative; the text beside it, or the avatar link's label, says it.
 */
export default function FoundingBadge({ className = 'h-5 w-5', iconSize = 11 }: FoundingBadgeProps) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-brand text-on-brand ${className}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
        <path d={SPROCKET_PATH} />
      </svg>
    </span>
  );
}
