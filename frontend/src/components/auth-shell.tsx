import Link from 'next/link';
import { APP_NAME } from '@/lib/app-config';

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
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center bg-flu-navy px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-flu-pink" />
          <span className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</span>
        </Link>
      </header>

      <main className="flu-hero-gradient relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-10%] h-80 w-80 rounded-full bg-flu-pink/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-15%] left-[-5%] h-96 w-96 rounded-full bg-flu-blue/30 blur-3xl"
        />

        <div className="animate-fade-in-up relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="text-xl font-bold tracking-tight text-flu-navy">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <p className="mt-6 text-center text-sm text-gray-600">{footer}</p>
        </div>
      </main>
    </div>
  );
}
