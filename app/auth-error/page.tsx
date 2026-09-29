import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
        <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
        <h2 className="mt-6 text-lg font-bold">That sign-in link didn&apos;t work</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          It may have expired or already been used. Sign-in links only work once.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
