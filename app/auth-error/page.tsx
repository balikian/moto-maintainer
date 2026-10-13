import Link from 'next/link';
import BrandLogo from '../components/BrandLogo';

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4 text-fg">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-xl">
        <h1 className="flex justify-center">
          <BrandLogo className="h-14" />
        </h1>
        <h2 className="mt-6 text-lg font-extrabold">That sign-in link didn&apos;t work</h2>
        <p className="mt-2 text-sm text-muted">
          It may have expired or already been used. Sign-in links only work once.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-on-brand transition-colors hover:bg-brand-hover"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
