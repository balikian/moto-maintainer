import { formatSpec, type ResolvedSpec, type SpecGroup } from '@/lib/specs';
import type { UnitSystem } from '@/lib/types';
import { ui } from './ui';

type TaskSpecsProps = {
  /** From specsForTasks: the groups that go with the task(s), with the bike's values. */
  groups: { group: SpecGroup; specs: ResolvedSpec[] }[];
  unitSystem: UnitSystem;
  title?: string;
  /** Opens the bike's Specs; without it, groups with no values aren't mentioned. */
  onOpenSpecs?: () => void;
};

/** The specs that go with a job (oil grade and amount on an oil change), so they're at hand while doing it. */
export default function TaskSpecs({ groups, unitSystem, title = 'Specs', onOpenSpecs }: TaskSpecsProps) {
  const filled = groups.filter(({ specs }) => specs.length > 0);
  const empty = onOpenSpecs ? groups.filter(({ specs }) => specs.length === 0) : [];
  if (filled.length === 0 && empty.length === 0) return null;
  const emptyNames = empty.map(({ group }) => group.label.toLowerCase()).join(' or ');

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-3 pt-2">
        <h3 className={ui.subTitle}>{title}</h3>
        {onOpenSpecs && filled.length > 0 && (
          <button type="button" onClick={onOpenSpecs} className="text-sm font-bold text-accent hover:underline">
            All specs
          </button>
        )}
      </div>
      {filled.length > 0 && (
        <dl className="divide-y divide-line px-3 pb-1">
          {filled.flatMap(({ specs }) =>
            specs.map((spec) => (
              <div key={spec.key} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5 text-sm">
                <dt className="text-muted">{spec.label}</dt>
                <dd className="ml-auto text-right font-bold">{formatSpec(spec.value, unitSystem)}</dd>
              </div>
            ))
          )}
        </dl>
      )}
      {empty.length > 0 && (
        <p className={`px-3 pb-2.5 text-sm ${filled.length > 0 ? 'border-t border-line pt-2' : 'pt-1'} text-muted`}>
          No {emptyNames} specs yet.{' '}
          <button type="button" onClick={onOpenSpecs} className="font-bold text-accent hover:underline">
            Add them
          </button>
        </p>
      )}
    </section>
  );
}
