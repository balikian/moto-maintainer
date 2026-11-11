'use client';

import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ui } from './ui';

type ModalProps = {
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  /**
   * Also close on a click or tap outside the dialog. Leave it off for forms,
   * so a stray tap doesn't throw away what the rider typed.
   */
  closeOnOutsideClick?: boolean;
  onClose: () => void;
  children: ReactNode;
};

// Open dialogs, innermost last, so Escape closes only the one on top.
const openModals: string[] = [];

export default function Modal({ title, description, size = 'md', closeOnOutsideClick = false, onClose, children }: ModalProps) {
  const titleId = useId();
  // Only a press that starts and ends on the backdrop closes the dialog, so
  // selecting text and letting go outside the box doesn't.
  const pressedBackdrop = useRef(false);
  // Registered once per dialog; a new onClose each render mustn't reorder the stack.
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    openModals.push(titleId);
    // The page behind stays put while a dialog is open (phones otherwise scroll it).
    // `html` reserves the scrollbar's space, so hiding it doesn't shift the layout.
    document.documentElement.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModals.at(-1) === titleId) close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      openModals.splice(openModals.indexOf(titleId), 1);
      if (openModals.length === 0) document.documentElement.style.overflow = '';
    };
  }, [titleId]);

  return (
    <div
      // Padded clear of the phone's status bar and gesture bar in the app.
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 pt-[calc(0.5rem_+_env(safe-area-inset-top))] pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-4 sm:pt-[calc(1rem_+_env(safe-area-inset-top))] sm:pb-[calc(1rem_+_env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // A nested dialog's backdrop sits inside this one, so `target` is checked
      // and a click there doesn't close this dialog too.
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (closeOnOutsideClick && pressedBackdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`relative max-h-full w-full overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6 ${ui.popover} ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'}`}
      >
        {/* The title and close button stay at the top while a long dialog scrolls under them. */}
        <div className="sticky top-0 z-10 -mx-4 flex items-start gap-2 bg-surface px-4 pb-3 pt-4 sm:-mx-6 sm:px-6 sm:pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-extrabold tracking-tight">{title}</h2>
            {description && <p className={`mt-1 text-sm ${ui.muted}`}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg sm:-mr-3 sm:-mt-3"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
