'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ShopInput } from '@/lib/shops';
import type { Shop } from '@/lib/types';
import ShopFormModal from './ShopFormModal';
import { ui } from './ui';

/** The picker's choice that opens the Add a shop dialog. */
const NEW_SHOP = 'new';

type ShopPickerProps = {
  id: string;
  label: string;
  /** A shop id, or '' for none. */
  value: string;
  onChange: (shopId: string) => void;
  shops: Shop[];
  /** Saves a new shop; resolves to it, or to an error message. The new shop is then picked. */
  onAddShop: (input: ShopInput) => Promise<Shop | string>;
  noneLabel?: string;
  hint?: string;
};

/** A drop-down of the rider's shops, with "Add a shop…" to add one without leaving the form. */
export default function ShopPicker({ id, label, value, onChange, shops, onAddShop, noneLabel = 'None', hint }: ShopPickerProps) {
  const [adding, setAdding] = useState(false);
  // One added here shows in the list before the shops reload.
  const [addedShop, setAddedShop] = useState<Shop | null>(null);
  const options = addedShop && !shops.some((shop) => shop.id === addedShop.id) ? [...shops, addedShop] : shops;

  return (
    <div>
      <label htmlFor={id} className={ui.label}>
        {label} <span className="font-normal text-muted">optional</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          if (event.target.value === NEW_SHOP) setAdding(true);
          else onChange(event.target.value);
        }}
        className={ui.input}
      >
        <option value="">{noneLabel}</option>
        {options.map((shop) => (
          <option key={shop.id} value={shop.id}>{shop.name}</option>
        ))}
        <option value={NEW_SHOP}>Add a shop…</option>
      </select>
      {hint && <p className={`mt-1 text-xs ${ui.muted}`}>{hint}</p>}

      {/* Outside the form this sits in, so its own form doesn't nest in the page. */}
      {adding &&
        createPortal(
          <ShopFormModal
            onClose={() => setAdding(false)}
            onSubmit={async (input) => {
              const result = await onAddShop(input);
              if (typeof result === 'string') return result;
              setAddedShop(result);
              onChange(result.id);
              setAdding(false);
              return null;
            }}
          />,
          document.body
        )}
    </div>
  );
}
