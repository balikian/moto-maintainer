import type { FavoriteSpecRow } from '@/lib/specs';

type FavoriteSpecsProps = {
  /** From favoriteSpecRows: the bike's starred specs, ready to show. */
  specs: FavoriteSpecRow[];
  className?: string;
};

/** A bike's starred specs at a glance, on its card in Garage and at the top of Tasks. */
export default function FavoriteSpecs({ specs, className = '' }: FavoriteSpecsProps) {
  if (specs.length === 0) return null;
  return (
    <dl aria-label="Starred specs" className={`grid grid-cols-2 gap-x-3 gap-y-2 ${className}`}>
      {specs.map((spec) => (
        <div key={spec.id} className="min-w-0">
          <dt className="text-xs font-semibold text-muted">{spec.label}</dt>
          <dd className="text-sm font-bold break-words">{spec.value}</dd>
        </div>
      ))}
    </dl>
  );
}
