'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useStoredToggle } from '../hooks/useStoredToggle';
import { ui } from './ui';

const STEPS = [
  {
    title: 'Fill in when things were last done.',
    body: 'Under “When were these last done?”, log a past service and tick everything done at that visit. Don’t know? Start counting today.',
  },
  {
    title: 'Keep the odometer current.',
    body: 'Tap Update next to it now and then. Tasks come due by distance or time, whichever is first.',
  },
  {
    title: 'Log service as you go.',
    body: 'The red Log service button records what was done, where, and what it cost. History keeps it all, ready to share when you sell the bike.',
  },
];

/** A short how-to at the top of Tasks, shown until the rider dismisses it (per browser). */
export default function GettingStarted() {
  const [dismissed, dismiss] = useStoredToggle('moto-maintain:getting-started-dismissed', false);
  if (dismissed) return null;

  return (
    <section aria-labelledby="getting-started-title" className={`${ui.card} relative p-4`}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg"
        aria-label="Close getting started"
      >
        <X size={18} />
      </button>
      <h2 id="getting-started-title" className="pr-10 text-base font-extrabold">Getting started</h2>
      <ol className="mt-3 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-on-brand">
              {index + 1}
            </span>
            <span className="text-sm">
              <span className="font-bold">{step.title}</span> <span className="text-muted">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={dismiss} className={`${ui.primaryButton} px-3 py-2`}>
          Got it
        </button>
        <Link href="/help" className="text-sm font-bold text-accent hover:underline">
          How SwingArm works
        </Link>
      </div>
    </section>
  );
}
