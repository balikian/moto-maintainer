// Shared Tailwind class strings. Colors are the design tokens in globals.css,
// which switch with the theme, so these need no `dark:` variants.

export const ui = {
  page: 'min-h-screen bg-page text-fg',
  card: 'rounded-2xl border border-line bg-surface',
  popover: 'rounded-2xl border border-line bg-surface text-fg shadow-xl shadow-black/20',
  emptyState: 'rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted',
  muted: 'text-muted',
  /** Page sections: "Needs attention", "Service history". */
  sectionTitle: 'text-xl font-extrabold tracking-tight',
  /** Headings inside a card or dialog. */
  subTitle: 'text-sm font-bold',
  label: 'mb-1.5 block text-sm font-semibold text-muted',
  input:
    'w-full rounded-xl border border-line-strong bg-page px-3 py-2.5 text-base text-fg outline-none transition-colors placeholder:text-muted/70 focus:border-accent disabled:opacity-60 sm:text-sm',
  primaryButton:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70',
  secondaryButton:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-raised px-4 py-2.5 text-sm font-bold text-fg transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-60',
  chipButton:
    'inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-fg transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60',
  /** A square button holding only an icon; give it an aria-label. */
  iconButton:
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60',
  errorBox: 'rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger',
  successBox: 'rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-sm text-good',
  infoBox: 'rounded-xl border border-info/30 bg-info/10 px-3 py-2 text-sm text-info',
  /** A small pill for statuses like "Waiting for review". */
  tag: 'rounded-md px-2 py-0.5 text-xs font-bold',
};
