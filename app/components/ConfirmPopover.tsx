'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { ui } from './ui';

type ConfirmPopoverProps = {
  /** What will happen, e.g. `Delete "Oil change"? Its service records are kept.` */
  message: string;
  confirmLabel: string;
  /** Which edge of the trigger the box lines up with. */
  align?: 'left' | 'right';
  onConfirm: () => void;
  /** Renders the button that opens the box; call `open` from its onClick. */
  children: (open: () => void, props: { 'aria-expanded': boolean; 'aria-controls': string }) => ReactNode;
};

/**
 * A small "are you sure?" box next to the button that asked, instead of a
 * browser alert. Closes on Escape, Cancel, or a click outside it.
 */
export default function ConfirmPopover({ message, confirmLabel, align = 'right', onConfirm, children }: ConfirmPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const boxId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useDismiss(wrapperRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    if (isOpen) confirmRef.current?.focus();
  }, [isOpen]);

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      {children(() => setIsOpen(true), { 'aria-expanded': isOpen, 'aria-controls': boxId })}
      {isOpen && (
        <span
          id={boxId}
          role="alertdialog"
          aria-label={message}
          className={`absolute top-full z-40 mt-2 block w-64 max-w-[calc(100vw-2rem)] p-3 text-left ${ui.popover} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <span className="block text-sm font-medium normal-case tracking-normal text-fg">{message}</span>
          <span className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className={`${ui.secondaryButton} px-3 py-1.5 text-xs`}>
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => {
                setIsOpen(false);
                onConfirm();
              }}
              className={`${ui.primaryButton} px-3 py-1.5 text-xs`}
            >
              {confirmLabel}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
