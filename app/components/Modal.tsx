'use client';

import { useEffect, useEffectEvent, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ui } from './ui';

type ModalProps = {
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  onClose: () => void;
  children: ReactNode;
};

// Open dialogs, innermost last, so Escape closes only the one on top.
const openModals: string[] = [];

export default function Modal({ title, description, size = 'md', onClose, children }: ModalProps) {
  const titleId = useId();
  // Registered once per dialog; a new onClose each render mustn't reorder the stack.
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    openModals.push(titleId);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModals.at(-1) === titleId) close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      openModals.splice(openModals.indexOf(titleId), 1);
    };
  }, [titleId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`relative max-h-[calc(100dvh-1rem)] w-full overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6 ${ui.popover} ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg sm:right-3 sm:top-3"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 id={titleId} className="pr-10 text-xl font-extrabold tracking-tight">{title}</h2>
        {description && <p className={`mt-1 text-sm ${ui.muted}`}>{description}</p>}

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
