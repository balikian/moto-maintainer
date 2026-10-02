'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ui } from './ui';

type ConfirmPopoverProps = {
  /** What will happen, e.g. `Delete "Oil change"? Its service records are kept.` */
  message: string;
  confirmLabel: string;
  /** Styles the confirm button red for deletes. */
  destructive?: boolean;
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
export default function ConfirmPopover({ message, confirmLabel, destructive = true, align = 'right', onConfirm, children }: ConfirmPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const boxId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();

    // Capture phase, so Escape closes only this box and not a dialog behind it.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setIsOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
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
          <span className="block text-sm font-normal normal-case tracking-normal text-slate-700 dark:text-slate-200">{message}</span>
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
              className={
                destructive
                  ? 'inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-500'
                  : `${ui.primaryButton} px-3 py-1.5 text-xs`
              }
            >
              {confirmLabel}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
