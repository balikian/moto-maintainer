'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ui } from './ui';

type ModalProps = {
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ title, description, size = 'md', onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`relative max-h-[calc(100vh-2rem)] w-full overflow-y-auto p-6 ${ui.popover} ${size === 'lg' ? 'max-w-xl' : 'max-w-md'}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        {description && <p className={`mt-1 text-sm ${ui.muted}`}>{description}</p>}

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
