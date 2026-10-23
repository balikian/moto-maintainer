import type { ReactNode } from 'react';
import BrandLogo from './BrandLogo';

/** A centered card on a light page, for history links that can't be shown. */
export default function NoticeCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="theme-light flex min-h-screen w-full items-center justify-center bg-page p-4 text-fg">
      <div className="max-w-md rounded-2xl bg-surface p-8 text-center shadow-lg">
        <div className="flex justify-center">
          <BrandLogo className="h-12" lightOnly />
        </div>
        <h1 className="mt-3 text-lg font-extrabold">{title}</h1>
        <div className="mt-2 space-y-2 text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}
