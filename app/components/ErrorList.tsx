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
          className="flex items-start justify-between gap-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-danger"
        >
          <div className="text-sm font-medium leading-snug">{message}</div>
          <button
            type="button"
            onClick={() => onDismiss(index)}
            className="rounded-full bg-surface p-1 text-muted hover:text-fg"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
