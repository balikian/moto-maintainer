import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/site';
import BrandLogo from './BrandLogo';
import { ui } from './ui';

// The public page about SwingArm: what signed-out visitors see at "/", and
// "About SwingArm" (/about) for riders who are signed in. Server-rendered, so
// it loads fast and search engines can read it.

type HomePageProps = {
  /** Signed-in riders get "Open your garage" instead of "Sign in". */
  signedIn: boolean;
  /** Shows a note at the top after a rider deleted their account. */
  accountDeleted?: boolean;
};

const FEATURES = [
  {
    title: 'Your bike’s real schedule',
    body: 'Starts from the manufacturer’s maintenance schedule where we have it, or a sensible checklist for your bike. Change any interval.',
  },
  {
    title: 'Miles or months',
    body: 'Each job counts down by distance and by time, whichever runs out first, so the bike that sits all winter still gets its brake fluid.',
  },
  {
    title: 'Do it together',
    body: 'Spots jobs worth doing in the same visit, like the air filter with the oil change, and logs them in one go.',
  },
  {
    title: 'A history buyers trust',
    body: 'Every service with date, odometer and cost. Print it, export it, or share a read-only link when you sell.',
  },
];

const INCLUDED = [
  'Every bike in your garage',
  'Maintenance checklist with due dates',
  'Manufacturer schedules, model by model',
  'Service log and spending summary',
  'Print, export and share your history',
];

const FAQ = [
  {
    q: 'Which bikes does it work with?',
    a: 'Any motorcycle. Pick the make and model from the list, or type in your own. Manufacturer schedules are added model by model.',
  },
  {
    q: 'Do I have to use miles?',
    a: 'No. Switch between miles and kilometers any time; your history converts with it.',
  },
  {
    q: 'Who can see my garage?',
    a: 'Only you. A service history is shared only when you create a link, and you can turn the link off.',
  },
];

/** The hero's picture: a phone showing the Tasks screen, drawn with the app's own colors. */
function PhonePreview() {
  const tiles = [
    { n: 1, label: 'Overdue', color: 'text-danger' },
    { n: 1, label: 'Urgent', color: 'text-danger' },
    { n: 2, label: 'Soon', color: 'text-warn' },
    { n: 8, label: 'All good', color: 'text-muted' },
  ];
  const cards = [
    { name: 'Chain clean & lube', due: '112 mi', color: 'text-danger', fill: 'bg-danger', lit: 12 },
    { name: 'Brake fluid', due: '9 days', color: 'text-danger', fill: 'bg-danger', lit: 12 },
    { name: 'Engine oil & filter', due: '640 mi', color: 'text-warn', fill: 'bg-warn', lit: 11 },
  ];
  return (
    <div aria-hidden="true" className="w-[18.5rem] justify-self-center rounded-[2.25rem] border border-line bg-raised p-2.5 shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-2.5 overflow-hidden rounded-[1.75rem] bg-page px-3 pt-4">
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="text-[11px] font-semibold text-muted">2023 Husqvarna</div>
          <div className="text-xl font-extrabold tracking-tight">Norden 901</div>
          <div className="mt-2.5 grid grid-cols-4 gap-1">
            {tiles.map((tile) => (
              <div key={tile.label} className={`rounded-lg bg-raised px-0.5 py-1.5 text-center ${tile.color}`}>
                <div className="text-base font-extrabold leading-none">{tile.n}</div>
                <div className="mt-1 text-[9px] font-bold">{tile.label}</div>
              </div>
            ))}
          </div>
        </div>
        {cards.map((card) => (
          <div key={card.name} className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <div className="flex justify-between gap-2">
              <span className="text-[13px] font-bold">{card.name}</span>
              <span className={`text-[15px] font-extrabold ${card.color}`}>{card.due}</span>
            </div>
            <div className="mt-2 grid grid-cols-12 gap-0.5">
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} className={`h-1.5 -skew-x-[18deg] rounded-sm ${index < card.lit ? card.fill : 'bg-track'}`} />
              ))}
            </div>
          </div>
        ))}
        <div className="-mx-3 mt-1 flex justify-center border-t border-line bg-surface pb-3.5 pt-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-on-brand">
            <Check size={20} strokeWidth={2.6} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ signedIn, accountDeleted = false }: HomePageProps) {
  const primary = signedIn ? { href: '/', label: 'Open your garage' } : { href: '/login', label: 'Start free' };
  const sectionTitle = 'text-3xl font-extrabold tracking-tight sm:text-4xl';
  const wrap = 'mx-auto w-full max-w-[1120px] px-4 sm:px-8';

  return (
    <div className={ui.page}>
      <header className="border-b border-line bg-surface">
        <div className={`${wrap} flex h-[4.25rem] items-center gap-8`}>
          <Link href="/" aria-label="SwingArm home">
            <BrandLogo className="h-9" />
          </Link>
          <nav aria-label="Page" className="hidden gap-6 text-[15px] font-bold text-muted md:flex">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
            <a href="#apps" className="hover:text-fg">Get the app</a>
          </nav>
          <Link href={signedIn ? '/' : '/login'} className={`ml-auto ${ui.secondaryButton} min-h-11`}>
            {signedIn ? 'Your garage' : 'Sign in'}
          </Link>
        </div>
      </header>

      {accountDeleted && (
        <div className={`${wrap} pt-6`}>
          <div role="status" className={`${ui.successBox} flex items-center gap-3 py-3`}>
            <p className="min-w-0 flex-1 text-base">
              <span className="font-bold">Your account has been deleted.</span> Your bikes, tasks and service history
              are gone for good. Thanks for riding with SwingArm.
            </p>
            <Link href="/" aria-label="Dismiss" className="-my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-good/10">
              <X size={18} />
            </Link>
          </div>
        </div>
      )}

      <main>
        <section className={`${wrap} grid grid-cols-1 items-center gap-14 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]`}>
          <div className="flex flex-col gap-5">
            <p className="text-sm font-extrabold text-accent">Kick-start your service</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-[3.4rem]">
              Know what your bike needs before it&apos;s overdue.
            </h1>
            <p className="max-w-[33rem] text-lg font-medium leading-relaxed text-muted">
              SwingArm tracks every maintenance job by miles and by months, whichever comes first. Log service in a tap, and keep a
              clean history to hand the next owner.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={primary.href} className={`${ui.primaryButton} min-h-13 px-6 text-base`}>
                {primary.label}
              </Link>
              <a href="#pricing" className={`${ui.secondaryButton} min-h-13 px-5 text-base`}>
                See pricing
              </a>
            </div>
            <p className="text-sm font-semibold text-muted">Free during early access. Works in your browser today; phone apps coming soon.</p>
          </div>
          <PhonePreview />
        </section>

        <section id="features" className="scroll-mt-4 border-y border-line bg-surface py-16 sm:py-20">
          <div className={`${wrap} flex flex-col gap-9`}>
            <h2 className={`${sectionTitle} max-w-2xl`}>Everything your service book does, without the grease stains.</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature, index) => (
                <div key={feature.title} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-page p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-[15px] font-extrabold text-accent">
                    {index + 1}
                  </span>
                  <h3 className="text-[17px] font-extrabold">{feature.title}</h3>
                  <p className="text-[15px] leading-normal text-muted">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className={`${wrap} scroll-mt-4 py-16 sm:py-20`}>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
            <h2 className={sectionTitle}>Pricing</h2>
            <p className="text-[17px] text-muted">SwingArm is free while it&apos;s in early access.</p>
          </div>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-5 rounded-[1.25rem] border-2 border-brand bg-surface p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-extrabold">Early access</h3>
              <span className="rounded-md bg-brand px-2.5 py-1 text-xs font-extrabold text-on-brand">Free</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[2.5rem] font-extrabold leading-none tracking-tight">$0</span>
              <span className="text-[15px] font-semibold text-muted">while in early access</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] font-semibold leading-snug">
                  <Check size={18} strokeWidth={2.6} className="mt-0.5 shrink-0 text-good" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href={primary.href} className={`${ui.primaryButton} min-h-12 text-[15px]`}>
              {primary.label}
            </Link>
            <p className="text-center text-sm text-muted">Paid plans may come later. You&apos;ll hear about them before anything changes.</p>
          </div>
        </section>

        <section id="apps" className="scroll-mt-4 border-y border-line bg-surface py-14 sm:py-16">
          <div className={`${wrap} flex flex-wrap items-center justify-between gap-8`}>
            <div className="flex max-w-xl flex-col gap-2">
              <h2 className="text-3xl font-extrabold tracking-tight">Get the app</h2>
              <p className="leading-relaxed text-muted">
                iPhone and Android apps are on the way, with reminders right on your phone. Your garage comes with you: sign in with
                the same account.
              </p>
            </div>
            <ul className="flex flex-wrap gap-3">
              {['App Store', 'Google Play'].map((store) => (
                <li key={store} className="flex min-h-14 min-w-44 flex-col justify-center rounded-xl border border-line bg-page px-4">
                  <span className="text-xs font-bold text-muted">Coming soon to</span>
                  <span className="text-[17px] font-extrabold">{store}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`${wrap} flex flex-col gap-6 py-16 sm:py-18`}>
          <h2 className="text-3xl font-extrabold tracking-tight">Questions</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="flex flex-col gap-2">
                <h3 className="text-[17px] font-extrabold">{q}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{a}</p>
              </div>
            ))}
          </div>
          <p className="text-[15px] text-muted">
            Something else? Write to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-accent hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${wrap} flex flex-wrap justify-between gap-5 pb-9 pt-7 text-sm font-semibold text-muted`}>
          <span>© {new Date().getFullYear()} SwingArm</span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-fg">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
