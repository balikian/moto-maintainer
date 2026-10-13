import { ui } from './ui';

export default function LoadingScreen() {
  return (
    <div className={`flex items-center justify-center p-4 ${ui.page}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className={`text-sm ${ui.muted}`}>Checking your garage access…</p>
      </div>
    </div>
  );
}
