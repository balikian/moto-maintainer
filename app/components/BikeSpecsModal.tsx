'use client';

import { useState, type ReactNode, type SubmitEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSupabaseQuery } from '@/app/hooks/useSupabaseQuery';
import { fetchModelSpecs } from '@/lib/modelData';
import {
  cleanBikeSpecs,
  cleanSpecValues,
  formatSpec,
  groupResolvedSpecs,
  isMeasured,
  MAX_CUSTOM_LABEL,
  MAX_CUSTOM_SPECS,
  MAX_SPEC_TEXT,
  resolveSpecs,
  SPEC_GROUPS,
  specFromDraft,
  specNumberText,
  unitsFor,
  type BikeSpecs,
  type CustomSpec,
  type SpecDraft,
  type SpecKey,
  type SpecKind,
  type SpecValue,
  type SpecValues,
} from '@/lib/specs';
import type { ModelSpecs, Motorcycle, UnitSystem } from '@/lib/types';
import Modal from './Modal';
import SpecField from './SpecField';
import { ui } from './ui';

type BikeSpecsModalProps = {
  supabase: SupabaseClient;
  bike: Motorcycle;
  unitSystem: UnitSystem;
  onClose: () => void;
  /** Receives the bike's own specs; resolves to an error message, or null on success. */
  onSave: (specs: BikeSpecs) => Promise<string | null>;
};

/** Where a value came from: "Manual p. 142", "Manual" or "Yours". */
function sourceLabel(value: SpecValue, from: 'manual' | 'bike'): string {
  if (from === 'bike') return 'Yours';
  return value.page ? `Manual p. ${value.page}` : 'Manual';
}

/** A bike's specs: a quick list to read at the pump or the air hose, and a form to fill in or change them. */
export default function BikeSpecsModal({ supabase, bike, unitSystem, onClose, onSave }: BikeSpecsModalProps) {
  const name = `${bike.year} ${bike.make} ${bike.model}`;
  const own = cleanBikeSpecs(bike.specs);
  const manualQuery = useSupabaseQuery<ModelSpecs | null>(`${bike.year}|${bike.make}|${bike.model}`, () =>
    fetchModelSpecs(supabase, bike)
  );
  const manual = manualQuery.data ? cleanSpecValues(manualQuery.data.specs) : null;
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Modal title="Edit specs" description={name} size="lg" onClose={onClose}>
        <SpecsForm
          own={own}
          manual={manual}
          unitSystem={unitSystem}
          onCancel={() => setEditing(false)}
          onSave={async (specs) => {
            const error = await onSave(specs);
            if (!error) setEditing(false);
            return error;
          }}
        />
      </Modal>
    );
  }

  const groups = groupResolvedSpecs(resolveSpecs(manual, own));
  const custom = own.custom ?? [];

  return (
    <Modal title="Specs" description={name} size="lg" closeOnOutsideClick onClose={onClose}>
      {manualQuery.loading ? (
        <p className={`text-sm ${ui.muted}`}>Loading…</p>
      ) : groups.length === 0 && custom.length === 0 ? (
        <div className={ui.emptyState}>
          No specs yet. Add the ones you look up most, like oil, tire pressures and torques.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ group, specs }) => (
            <section key={group.id}>
              <h3 className={`${ui.subTitle} mb-1.5`}>{group.label}</h3>
              <dl className="divide-y divide-line rounded-xl border border-line">
                {specs.map((spec) => (
                  <div key={spec.key} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <dt className="text-sm text-muted">{spec.label}</dt>
                    <dd className="text-right">
                      <span className="block text-sm font-bold">{formatSpec(spec.value, unitSystem)}</span>
                      <span className="block text-xs text-muted">{sourceLabel(spec.value, spec.from)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {custom.length > 0 && (
            <section>
              <h3 className={`${ui.subTitle} mb-1.5`}>Your own</h3>
              <dl className="divide-y divide-line rounded-xl border border-line">
                {custom.map((row, index) => (
                  <div key={index} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <dt className="text-sm text-muted">{row.label}</dt>
                    <dd className="text-right text-sm font-bold">{row.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <p className={`text-xs ${ui.muted}`}>
            Torques and capacities matter: check anything marked Yours against the manual before you rely on it.
          </p>
        </div>
      )}
      {manualQuery.error && <p className={`mt-3 ${ui.errorBox}`}>Couldn&apos;t load the manual&apos;s specs: {manualQuery.error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={ui.secondaryButton}>
          Close
        </button>
        <button type="button" onClick={() => setEditing(true)} className={ui.primaryButton} disabled={manualQuery.loading}>
          <Pencil size={15} aria-hidden="true" /> Edit
        </button>
      </div>
    </Modal>
  );
}

/** A field's starting text and unit: the bike's own value, else empty in the manual's unit (or the rider's). */
function startDraft(key: SpecKey, kind: SpecKind, own: SpecValues, manual: SpecValues | null, units: UnitSystem): SpecDraft {
  const value = own[key];
  if (kind === 'text') return { text: value && !isMeasured(value) ? value.text : '', unit: null };
  if (value && isMeasured(value)) return { text: specNumberText(value), unit: value.unit };
  const fromManual = manual?.[key];
  return { text: '', unit: fromManual && isMeasured(fromManual) ? fromManual.unit : unitsFor(kind, units)[0] };
}

const filledSummary = (filled: number, total: number) => (filled === 0 ? 'Empty' : `${filled} of ${total} filled`);

/** One group of the form, opened and closed by its header like More's groups; closed, it shows how much is filled in. */
function FormGroup({ id, title, summary, open, onToggle, children }: {
  id: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = `spec-group-${id}`;
  return (
    <section className={ui.card}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-extrabold">{title}</span>
            {!open && <span className="block truncate text-sm font-medium text-muted">{summary}</span>}
          </span>
          <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
        </button>
      </h3>
      <div id={contentId} hidden={!open} className="space-y-2.5 border-t border-line px-3.5 py-3.5">
        {children}
      </div>
    </section>
  );
}

function SpecsForm({
  own,
  manual,
  unitSystem,
  onCancel,
  onSave,
}: {
  own: BikeSpecs;
  manual: SpecValues | null;
  unitSystem: UnitSystem;
  onCancel: () => void;
  onSave: (specs: BikeSpecs) => Promise<string | null>;
}) {
  const [drafts, setDrafts] = useState<Record<string, SpecDraft>>(() =>
    Object.fromEntries(
      SPEC_GROUPS.flatMap((group) => group.specs.map((spec) => [spec.key, startDraft(spec.key, spec.kind, own.values ?? {}, manual, unitSystem)]))
    )
  );
  const [custom, setCustom] = useState<CustomSpec[]>(own.custom ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every group starts closed, so the form opens as a short list.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const toggleGroup = (id: string) =>
    setOpenGroups((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const openGroup = (id: string) => setOpenGroups((previous) => new Set(previous).add(id));

  const setDraft = (key: string, change: Partial<SpecDraft>) => setDrafts((previous) => ({ ...previous, [key]: { ...previous[key], ...change } }));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const values: SpecValues = {};
    for (const group of SPEC_GROUPS) {
      for (const spec of group.specs) {
        const value = specFromDraft(spec.kind, drafts[spec.key]);
        if (value === 'invalid') {
          openGroup(group.id);
          setError(`${spec.label}: enter a number, or a range like 25–35.`);
          return;
        }
        if (value) values[spec.key] = value;
      }
    }
    const rows = custom.map((row) => ({ label: row.label.trim(), text: row.text.trim() })).filter((row) => row.label || row.text);
    if (rows.some((row) => !row.label || !row.text)) {
      openGroup('custom');
      setError('Give each of your own rows a name and a value.');
      return;
    }

    setSaving(true);
    const saveError = await onSave({ values, custom: rows });
    setSaving(false);
    setError(saveError);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <p className={`pb-2.5 text-sm ${ui.muted}`}>
        {manual
          ? 'Values from the manual are shown in gray. Type over one to use your own; leave it empty to keep the manual’s.'
          : 'Fill in the ones you look up most. Leave the rest empty.'}{' '}
        Ranges like 25–35 work too.
      </p>

      {SPEC_GROUPS.map((group) => (
        <FormGroup
          key={group.id}
          id={group.id}
          title={group.label}
          summary={filledSummary(group.specs.filter((spec) => drafts[spec.key].text.trim() || manual?.[spec.key]).length, group.specs.length)}
          open={openGroups.has(group.id)}
          onToggle={() => toggleGroup(group.id)}
        >
          {group.specs.map((spec) => {
            const fromManual = manual?.[spec.key];
            return (
              <SpecField
                key={spec.key}
                id={`spec-${spec.key}`}
                label={spec.label}
                kind={spec.kind}
                draft={drafts[spec.key]}
                placeholder={fromManual ? formatSpec(fromManual, unitSystem) : 'example' in spec ? spec.example : ''}
                unitSystem={unitSystem}
                onChange={(change) => setDraft(spec.key, change)}
              />
            );
          })}
        </FormGroup>
      ))}

      <FormGroup
        id="custom"
        title="Your own"
        summary={custom.length === 0 ? 'Anything else, like a headlight bulb' : `${custom.length} ${custom.length === 1 ? 'row' : 'rows'}`}
        open={openGroups.has('custom')}
        onToggle={() => toggleGroup('custom')}
      >
        {custom.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={row.label}
              onChange={(event) => setCustom((rows) => rows.map((r, i) => (i === index ? { ...r, label: event.target.value } : r)))}
              placeholder="Name, like Headlight bulb"
              aria-label="Name"
              maxLength={MAX_CUSTOM_LABEL}
              className={`${ui.input} min-w-0`}
            />
            <input
              value={row.text}
              onChange={(event) => setCustom((rows) => rows.map((r, i) => (i === index ? { ...r, text: event.target.value } : r)))}
              placeholder="Value"
              aria-label="Value"
              maxLength={MAX_SPEC_TEXT}
              className={`${ui.input} min-w-0`}
            />
            <button
              type="button"
              onClick={() => setCustom((rows) => rows.filter((_, i) => i !== index))}
              className={ui.iconButton}
              aria-label={`Remove ${row.label || 'this row'}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {custom.length < MAX_CUSTOM_SPECS && (
          <button type="button" onClick={() => setCustom((rows) => [...rows, { label: '', text: '' }])} className={ui.chipButton}>
            <Plus size={15} aria-hidden="true" /> Add a row
          </button>
        )}
      </FormGroup>

      {error && <p className={ui.errorBox}>{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-line bg-surface px-4 pt-3 pb-1 sm:-mx-6 sm:px-6">
        <button type="button" onClick={onCancel} className={ui.secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={ui.primaryButton}>
          {saving ? 'Saving…' : 'Save specs'}
        </button>
      </div>
    </form>
  );
}
