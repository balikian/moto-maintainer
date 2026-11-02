'use client';

import { useState, type SubmitEvent } from 'react';
import { cleanShop, SHOP_FIELD_LIMITS, shopInput, type ShopInput } from '@/lib/shops';
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

const FIELDS: { key: Exclude<keyof ShopInput, 'name' | 'notes'>; label: string; type: string; inputMode?: 'tel' | 'email' | 'url'; autoComplete: string; placeholder: string }[] = [
  { key: 'phone', label: 'Phone', type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '(555) 123-4567' },
  { key: 'email', label: 'Email', type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'service@example.com' },
  { key: 'address', label: 'Address', type: 'text', autoComplete: 'street-address', placeholder: '12 Main St, Bend, OR' },
  { key: 'website', label: 'Website', type: 'text', inputMode: 'url', autoComplete: 'url', placeholder: 'example.com' },
];

/** Add or edit a shop or mechanic: a name, and any of phone, email, address, website and notes. */
export default function ShopFormModal({ shop, onClose, onSubmit }: ShopFormModalProps) {
  const [values, setValues] = useState<ShopInput>(() => shopInput(shop));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof ShopInput) => (value: string) => setValues((previous) => ({ ...previous, [key]: value }));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
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
              type={field.type}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete}
              value={values[field.key]}
              onChange={(event) => set(field.key)(event.target.value)}
              maxLength={SHOP_FIELD_LIMITS[field.key]}
              placeholder={field.placeholder}
              className={ui.input}
            />
          </div>
        ))}

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
