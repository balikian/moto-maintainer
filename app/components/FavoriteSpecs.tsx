import { formatSpec, type ResolvedSpec } from '@/lib/specs';
import type { UnitSystem } from '@/lib/types';

type FavoriteSpecsProps = {
  /** From pickFavoriteSpecs: the bike's starred specs that have a value. */
  specs: ResolvedSpec[];
  unitSystem: UnitSystem;
  className?: string;
};

/** A bike's starred specs at a glance, on its card in Garage and at the top of Tasks. */
export default function FavoriteSpecs({ specs, unitSystem, className = '' }: FavoriteSpecsProps) {
  if (specs.length === 0) return null;
  return (
    <dl aria-label="Starred specs" className={`grid grid-cols-2 gap-x-3 gap-y-2 ${className}`}>
      {specs.map((spec) => (
        <div key={spec.key} className="min-w-0">
          <dt className="text-xs font-semibold text-muted">{spec.label}</dt>
          <dd className="text-sm font-bold break-words">{formatSpec(spec.value, unitSystem)}</dd>
        </div>
      ))}
    </dl>
  );
}
