import { X } from 'lucide-react';

type ErrorListProps = {
  errors: string[];
  onDismiss: (index: number) => void;
};

export default function ErrorList({ errors, onDismiss }: ErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2" role="alert">
      {errors.map((message, index) => (
        <div
          key={`${index}-${message}`}
          className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
        >
          <div className="text-sm leading-snug">{message}</div>
          <button
            type="button"
            onClick={() => onDismiss(index)}
            className="rounded-full bg-white p-1 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
