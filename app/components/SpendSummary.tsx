'use client';

import { summarizeSpend } from '@/lib/spend';
import { categoryLabel } from '@/lib/taskCategories';
import type { MaintenanceTask, ServiceLog } from '@/lib/types';
import { useStoredToggle } from '../hooks/useStoredToggle';
import { ui } from './ui';

type SpendSummaryProps = {
  logs: ServiceLog[];
  tasks: MaintenanceTask[];
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** What this bike's maintenance has cost: this year or all time, split by category. */
export default function SpendSummary({ logs, tasks }: SpendSummaryProps) {
  const [allTime, toggleAllTime] = useStoredToggle('moto-maintain:spend-all-time', false);
  const year = new Date().getFullYear();
  const summary = summarizeSpend(logs, tasks, allTime ? undefined : year);
  const largest = summary.byCategory[0]?.total ?? 0;

  return (
    <div className={`${ui.card} mb-3 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={ui.subTitle}>Spending</h3>
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-lg bg-raised p-1 text-xs font-bold">
          {[
            { label: String(year), selected: !allTime },
            { label: 'All time', selected: allTime },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={option.selected}
              onClick={option.selected ? undefined : toggleAllTime}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                option.selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {summary.paidServices === 0 ? (
        <p className={`mt-2 text-sm ${ui.muted}`}>
          No costs logged {allTime ? 'yet' : `in ${year}`}. Add a cost when you log service to see where the money goes.
        </p>
      ) : (
        <>
          <p className="mt-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums">{currencyFormatter.format(summary.total)}</span>
            <span className={`ml-2 text-sm ${ui.muted}`}>
              across {summary.paidServices} service{summary.paidServices === 1 ? '' : 's'}
            </span>
          </p>
          <ul className="mt-3 space-y-2">
            {summary.byCategory.map(({ category, total }) => (
              <li key={category}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium">{categoryLabel(category)}</span>
                  <span className={ui.muted}>{currencyFormatter.format(total)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${largest > 0 ? Math.max(2, (total / largest) * 100) : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
