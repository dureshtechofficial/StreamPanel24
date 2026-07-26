'use client';

import Link from 'next/link';
import { APP_NAME } from '@/lib/app-config';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { BroadcastIcon, ShieldIcon, ActivityIcon, WalletIcon } from '@/components/icons';

const HIGHLIGHTS = [
  { icon: BroadcastIcon, title: 'Live streaming control', text: 'Manage Flussonic servers, streams, and sessions in one place.' },
  { icon: ShieldIcon, title: 'Role-based access', text: 'Admins, resellers, and customers — each with the right scope.' },
  { icon: ActivityIcon, title: 'Real-time insight', text: 'Live session monitoring and server health at a glance.' },
  { icon: WalletIcon, title: 'Billing built in', text: 'Plans, orders, and wallet top-ups without leaving the app.' },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Brand panel */}
      <aside className="flu-hero-gradient relative hidden overflow-hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-15%] left-[-10%] h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <BroadcastIcon className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            The control room for your streaming business.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            One dashboard for servers, streams, customers, and billing — fast, secure, and built for teams.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t}</p>
                  <p className="text-xs text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 lg:invisible">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BroadcastIcon className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">{APP_NAME}</span>
          </Link>
          <ThemeToggle className="text-foreground hover:bg-muted" />
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div className="animate-fade-in-up w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-8">{children}</div>

            <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
