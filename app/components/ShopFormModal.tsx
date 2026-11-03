'use client';

import { useState, type SubmitEvent } from 'react';
import { MapPin, X } from 'lucide-react';
import {
  cleanShop,
  pastedLinkProblem,
  readAddress,
  readEmail,
  readPhone,
  readWebsite,
  SHOP_FIELD_LIMITS,
  shopInput,
  type ShopInput,
} from '@/lib/shops';
import type { Shop } from '@/lib/types';
import Modal from './Modal';
import { ui } from './ui';

type ShopFormModalProps = {
  /** The shop being edited; omit to add one. */
  shop?: Shop;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSubmit: (input: ShopInput) => Promise<string | null>;
};

// Text fields, so a pasted link (tel:, mailto:, Google's) isn't refused before it's read.
const FIELDS: { key: 'phone' | 'email' | 'website'; label: string; autoComplete: string; placeholder: string; read: (text: string) => string }[] = [
  { key: 'phone', label: 'Phone', autoComplete: 'tel', placeholder: '(555) 123-4567', read: readPhone },
  { key: 'email', label: 'Email', autoComplete: 'email', placeholder: 'service@example.com', read: readEmail },
  { key: 'website', label: 'Website', autoComplete: 'url', placeholder: 'example.com', read: readWebsite },
];

/** What's wrong with a pasted link, under its field, as soon as it's pasted. */
function FieldProblem({ id, message }: { id: string; message: string | null }) {
  return (
    <p id={id} aria-live="polite" className="mt-1.5 text-sm text-danger empty:hidden">
      {message}
    </p>
  );
}

/**
 * Add or edit a shop or mechanic: a name, and any of phone, email, address, website and notes.
 * Each field also takes what a long-press copies from Google (see lib/shops.ts), read when the rider leaves it.
 */
export default function ShopFormModal({ shop, onClose, onSubmit }: ShopFormModalProps) {
  const [values, setValues] = useState<ShopInput>(() => shopInput(shop));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof ShopInput) => (value: string) => setValues((previous) => ({ ...previous, [key]: value }));
  const readAddressField = () =>
    setValues((previous) => {
      const { address, mapUrl } = readAddress(previous.address, previous.name);
      return { ...previous, address, map_url: mapUrl ?? previous.map_url };
    });

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Opened from another form (ShopPicker): React would pass the submit on to it.
    event.stopPropagation();
    const cleaned = cleanShop(values);
    if ('error' in cleaned) {
      setError(cleaned.error);
      return;
    }
    setSaving(true);
    setError(null);
    const submitError = await onSubmit(values);
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title={shop ? 'Edit shop' : 'Add a shop'}
      description={shop ? undefined : 'A shop or mechanic you take your bikes to. Only the name is needed.'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="shop-name" className={ui.label}>Name</label>
          <input
            id="shop-name"
            required
            value={values.name}
            onChange={(event) => set('name')(event.target.value)}
            maxLength={SHOP_FIELD_LIMITS.name}
            autoComplete="organization"
            placeholder="Moto Works"
            className={ui.input}
          />
        </div>

        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`shop-${field.key}`} className={ui.label}>
              {field.label} <span className="font-normal text-muted">optional</span>
            </label>
            <input
              id={`shop-${field.key}`}
              autoComplete={field.autoComplete}
              value={values[field.key]}
              onChange={(event) => set(field.key)(event.target.value)}
              onBlur={() => set(field.key)(field.read(values[field.key]))}
              maxLength={SHOP_FIELD_LIMITS.mapUrl}
              placeholder={field.placeholder}
              aria-describedby={`shop-${field.key}-problem`}
              className={ui.input}
            />
            {field.key !== 'website' && (
              <FieldProblem id={`shop-${field.key}-problem`} message={pastedLinkProblem(field.key, field.read(values[field.key]))} />
            )}
          </div>
        ))}

        <div>
          <label htmlFor="shop-address" className={ui.label}>
            Address <span className="font-normal text-muted">optional</span>
          </label>
          <textarea
            id="shop-address"
            rows={2}
            autoComplete="street-address"
            value={values.address}
            onChange={(event) => set('address')(event.target.value)}
            onBlur={readAddressField}
            maxLength={SHOP_FIELD_LIMITS.mapUrl}
            placeholder="12 Main St, Bend, OR, or a Google Maps link"
            aria-describedby="shop-address-problem"
            className={ui.input}
          />
          <FieldProblem id="shop-address-problem" message={pastedLinkProblem('address', readAddress(values.address).address)} />
          {values.map_url && (
            <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
              <MapPin size={15} className="shrink-0 text-good" aria-hidden="true" />
              <span className="min-w-0 flex-1">Map link saved: Directions opens it.</span>
              <button
                type="button"
                onClick={() => set('map_url')('')}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 font-bold text-fg hover:bg-raised"
              >
                <X size={14} aria-hidden="true" /> Remove
              </button>
            </p>
          )}
        </div>

        <p className={`text-xs ${ui.muted}`}>
          Copying from Google? Press and hold the website or address and copy it (a Google Maps link works for the
          address too). For the phone, press and hold the text (message) button and copy that link, or tap Call and copy
          the number from your phone’s dialer.
        </p>

        <div>
          <label htmlFor="shop-notes" className={ui.label}>
            Notes <span className="font-normal text-muted">optional</span>
          </label>
          <textarea
            id="shop-notes"
            rows={2}
            value={values.notes}
            onChange={(event) => set('notes')(event.target.value)}
            maxLength={SHOP_FIELD_LIMITS.notes}
            placeholder="Ask for Sam; closed Mondays"
            className={ui.input}
          />
        </div>

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={`w-1/2 py-2.5 ${ui.secondaryButton}`}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={`w-1/2 py-2.5 ${ui.primaryButton}`}>
            {saving ? 'Saving…' : shop ? 'Save changes' : 'Add shop'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
