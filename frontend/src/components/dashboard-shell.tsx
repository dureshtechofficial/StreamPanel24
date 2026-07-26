'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getInitials } from '@/lib/get-initials';
import { APP_NAME } from '@/lib/app-config';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  BroadcastIcon,
  ChartBarIcon,
  ChevronDownIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from './icons';

type NavItem = { label: string; icon: typeof HomeIcon; href: string | null; soon?: boolean };
type NavSection = { title: string; items: NavItem[] };

function buildSections(isAdmin: boolean): NavSection[] {
  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
        { label: 'Customers', icon: UsersIcon, href: '/dashboard/customers' },
      ],
    },
  ];

  if (isAdmin) {
    sections.push({
      title: 'Management',
      items: [
        { label: 'Resellers', icon: ShieldIcon, href: '/dashboard/resellers' },
        { label: 'Plans', icon: TagIcon, href: '/dashboard/plans' },
        { label: 'Reports', icon: ChartBarIcon, href: '/dashboard/reports' },
        { label: 'Servers', icon: ServerIcon, href: '/dashboard/servers' },
      ],
    });
  }

  sections.push({
    title: 'Account',
    items: [
      { label: 'Profile', icon: UserIcon, href: null, soon: true },
      isAdmin
        ? { label: 'Settings', icon: SettingsIcon, href: '/dashboard/settings' }
        : { label: 'Settings', icon: SettingsIcon, href: null, soon: true },
    ],
  });

  return sections;
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = buildSections(user?.role === 'admin');

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Close the drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg flu-brand-gradient text-white">
              <BroadcastIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">{APP_NAME}</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Close sidebar"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(({ label, icon: Icon, href, soon }) => {
                  if (!href) {
                    return (
                      <button
                        key={label}
                        disabled
                        title="Coming soon"
                        className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/60"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {label}
                        {soon && (
                          <Badge variant="neutral" className="ml-auto px-1.5 py-0 text-[10px]">
                            Soon
                          </Badge>
                        )}
                      </button>
                    );
                  }
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={label}
                      href={href}
                      className={cn(
                        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary" />
                      )}
                      <Icon className="h-[18px] w-[18px]" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOutIcon className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Topbar */}
        <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open sidebar"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm text-muted-foreground">
                Welcome back, <span className="font-semibold text-foreground">{user?.name?.split(' ')[0]}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="text-foreground hover:bg-muted" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex h-8 w-8 items-center justify-center rounded-full flu-brand-gradient text-xs font-semibold text-white">
                  {getInitials(user?.name)}
                </span>
                <span className="hidden font-medium text-foreground sm:block">{user?.name}</span>
                <ChevronDownIcon className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  {user?.role && (
                    <Badge variant="brand" className="mt-2 capitalize">
                      {user.role}
                    </Badge>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={handleLogout}>
                  <LogOutIcon className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
