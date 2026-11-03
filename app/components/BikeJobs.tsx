'use client';

import { Check, ChevronDown, ExternalLink, Pencil, Plus, Sparkles, Wrench } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import { cleanJobLinks, estimatedTotal, jobKindLabel, linkLabel } from '@/lib/jobs';
import type { BikeJob, JobKind, ServiceLog } from '@/lib/types';
import { useStoredToggle } from '../hooks/useStoredToggle';
import { ui } from './ui';

type BikeJobsProps = {
  open: BikeJob[];
  /** Done ones, with the service record that finished each, newest first. */
  done: { job: BikeJob; log: Pick<ServiceLog, 'performed_at'> }[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (job: BikeJob) => void;
  /** Opens Log service with this job ticked. */
  onLog: (job: BikeJob) => void;
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const KIND_STYLE: Record<JobKind, { icon: typeof Wrench; tone: string; tag: string }> = {
  repair: { icon: Wrench, tone: 'text-warn', tag: 'bg-warn/10 text-warn' },
  upgrade: { icon: Sparkles, tone: 'text-accent', tag: 'bg-accent/10 text-accent' },
};

function KindTag({ kind }: { kind: JobKind }) {
  return <span className={`${ui.tag} ${KIND_STYLE[kind].tag}`}>{jobKindLabel(kind)}</span>;
}

function EditButton({ job, onEdit, className = '' }: { job: BikeJob; onEdit: (job: BikeJob) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(job)}
      className={`${ui.iconButton} -mr-2 border-0 bg-transparent text-muted hover:text-fg ${className}`}
      aria-label={`Edit ${job.name}`}
    >
      <Pencil size={17} aria-hidden="true" />
    </button>
  );
}

/**
 * The bike's repairs and upgrades: one-time jobs, apart from the recurring
 * tasks. Each still to do shows its estimate, links and notes, with Log it;
 * done ones wait in a collapsible list.
 */
export default function BikeJobs({ open, done, loading, onAdd, onEdit, onLog }: BikeJobsProps) {
  const [doneCollapsed, toggleDone] = useStoredToggle('moto-maintain:done-jobs-collapsed', true);
  const estimate = estimatedTotal(open);

  return (
    <section aria-labelledby="jobs-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="jobs-title" className={ui.sectionTitle}>Repairs &amp; upgrades</h2>
          {estimate && (
            <p className={`text-sm ${ui.muted}`}>
              About {currencyFormatter.format(estimate.total)} estimated
              {estimate.priced < open.length ? ` for ${estimate.priced} of ${open.length}` : ''}
            </p>
          )}
        </div>
        <button type="button" onClick={onAdd} className={ui.chipButton}>
          <Plus size={15} aria-hidden="true" />
          Add
        </button>
      </div>

      {loading ? (
        <div className={ui.emptyState}>Loading repairs and upgrades…</div>
      ) : open.length === 0 && done.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-2xl border border-dashed border-line p-5 text-left text-sm text-muted transition-colors hover:border-line-strong"
        >
          <span className="block font-bold text-fg">Something broken, or a mod you’re planning?</span>
          Keep a list here, with estimates and links to the parts you’re comparing. Tick it off when you log the work.
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {open.length > 0 ? (
            <ul className={`divide-y divide-line ${ui.card}`}>
              {open.map((job) => {
                const { icon: Icon, tone } = KIND_STYLE[job.kind];
                const links = cleanJobLinks(job.links);
                return (
                  <li key={job.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon size={18} className={`mt-1 shrink-0 ${tone}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold leading-snug">{job.name}</h3>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                            <KindTag kind={job.kind} />
                            {job.estimated_cost !== null && <span>Est. {currencyFormatter.format(Number(job.estimated_cost))}</span>}
                          </p>
                        </div>
                        <EditButton job={job} onEdit={onEdit} className="-mt-1.5" />
                      </div>
                      {job.notes && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-muted">{job.notes}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => onLog(job)} className={`${ui.chipButton} min-h-11`}>
                          <Check size={15} aria-hidden="true" /> Log it
                        </button>
                        {links.map((link, index) => (
                          <a
                            key={`${link.url}-${index}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer noopener nofollow"
                            className={`${ui.chipButton} min-h-11 max-w-full text-accent`}
                          >
                            <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{linkLabel(link)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={`${ui.card} flex items-center gap-3 px-4 py-4 text-sm`}>
              <Check size={20} className="shrink-0 text-good" aria-hidden="true" />
              <span className="font-bold">All done.</span>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <button
                type="button"
                onClick={toggleDone}
                aria-expanded={!doneCollapsed}
                aria-controls="done-jobs"
                className="inline-flex min-h-11 items-center gap-2"
              >
                <ChevronDown size={16} className={`transition-transform ${doneCollapsed ? '-rotate-90' : ''}`} aria-hidden="true" />
                <span className="text-base font-extrabold">Done</span>
                <span className="rounded-md bg-raised px-2 py-0.5 text-xs font-extrabold text-muted">{done.length}</span>
              </button>
              <ul id="done-jobs" hidden={doneCollapsed} className={`mt-1 divide-y divide-line ${ui.card}`}>
                {done.map(({ job, log }) => (
                  <li key={job.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold">{job.name}</span>{' '}
                      <span className="text-sm text-muted">· {formatDisplayDate(log.performed_at.slice(0, 10))}</span>
                    </div>
                    <KindTag kind={job.kind} />
                    <EditButton job={job} onEdit={onEdit} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
