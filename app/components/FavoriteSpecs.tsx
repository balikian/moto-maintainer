import { Disc, Droplet, Fuel, type LucideIcon } from 'lucide-react';
import type { FavoriteSpecRow, SpecChipIcon } from '@/lib/specs';

type FavoriteSpecsProps = {
  /** From favoriteSpecRows: the bike's starred specs, ready to show. */
  specs: FavoriteSpecRow[];
  /** Each spec in its own pill (Garage's cards), else side by side in a strip (the top of Tasks). */
  chips?: boolean;
  className?: string;
};

const ICONS: Record<SpecChipIcon, LucideIcon> = { fuel: Fuel, oil: Droplet, tire: Disc };

/**
 * A bike's starred specs at a glance, on its card in Garage and at the top of
 * Tasks: an icon and the value ("91 octane" by a fuel pump), or the label and
 * the value for specs without their own icon. Phrasing content only, so it can
 * sit inside the button that opens Specs.
 */
export default function FavoriteSpecs({ specs, chips = false, className = '' }: FavoriteSpecsProps) {
  if (specs.length === 0) return null;
  return (
    <span className={`flex flex-wrap ${chips ? 'gap-1.5' : 'gap-x-3.5 gap-y-1'} ${className}`}>
      {specs.map((spec) => {
        const Icon = spec.icon && ICONS[spec.icon];
        return (
          <span
            key={spec.id}
            className={`inline-flex min-w-0 items-center gap-1.5 text-sm font-bold ${chips ? 'rounded-full bg-raised px-2.5 py-1' : ''}`}
          >
            {Icon && <Icon size={14} className="shrink-0 text-muted" aria-hidden="true" />}
            <span className="min-w-0 break-words">
              <span className={spec.valueOnly ? 'sr-only' : 'font-semibold text-muted'}>{spec.label}: </span>
              {spec.value}
            </span>
          </span>
        );
      })}
    </span>
  );
}
