'use client';

import Link from 'next/link';
import { APP_NAME } from '@/lib/app-config';
import { usePageTitle } from '@/lib/use-page-title';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  ActivityIcon,
  ArrowRightIcon,
  BroadcastIcon,
  PlayIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons';

const FEATURES = [
  {
    icon: BroadcastIcon,
    title: 'Live streaming',
    text: 'Start, stop, and restart your streams and grab your publish URLs in seconds.',
  },
  {
    icon: ActivityIcon,
    title: 'Live sessions',
    text: 'See who is watching in real time — locations, devices, and connection details.',
  },
  {
    icon: ReceiptIcon,
    title: 'Plans & orders',
    text: 'Browse plans, place orders, and keep every invoice in one tidy history.',
  },
  {
    icon: WalletIcon,
    title: 'Wallet & billing',
    text: 'Top up your wallet and pay for renewals without ever leaving the portal.',
  },
];

const PORTALS = [
  {
    href: '/customer',
    icon: PlayIcon,
    label: 'Customer',
    title: 'Customer portal',
    text: 'Watch and manage your assigned streams, view live sessions, and track your orders and payments.',
    cta: 'Enter customer portal',
  },
  {
    href: '/reseller',
    icon: UsersIcon,
    label: 'Reseller',
    title: 'Reseller portal',
    text: 'Manage your customers, assign streams, place orders on their behalf, and top up your wallet.',
    cta: 'Enter reseller portal',
  },
];

export default function HomePage() {
  usePageTitle('Home');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BroadcastIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">{APP_NAME}</span>
        </div>
        <ThemeToggle className="text-foreground hover:bg-muted" />
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pt-10 pb-6 sm:px-8 sm:pt-16">
          <div className="animate-fade-in-up max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Premium streaming, managed simply
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Your streams and customers, all in{' '}
              <span className="text-gradient">one place</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              {APP_NAME} is the portal for managing your live streams, tracking who&apos;s watching,
              and handling your subscriptions and billing — for customers and resellers alike.
            </p>
          </div>
        </section>

        {/* Portal cards */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-4 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {PORTALS.map(({ href, icon: Icon, label, title, text, cta }) => (
              <Link
                key={href}
                href={href}
                className="group animate-fade-in-up flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {label}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {cta}
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
            Everything you need
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:px-8">
          <span>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <Link href="/customer" className="hover:text-primary">
              Customer portal
            </Link>
            <Link href="/reseller" className="hover:text-primary">
              Reseller portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
