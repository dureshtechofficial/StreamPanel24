'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ChevronDownIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  ServerIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from './icons';

const BASE_NAV_ITEMS = [
  { label: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
  { label: 'Customers', icon: UsersIcon, href: '/dashboard/customers' },
];

const ADMIN_NAV_ITEMS = [{ label: 'Servers', icon: ServerIcon, href: '/dashboard/servers' }];

const PROFILE_NAV_ITEM = { label: 'Profile', icon: UserIcon, href: null };
const SETTINGS_NAV_ITEM_DISABLED = { label: 'Settings', icon: SettingsIcon, href: null };
const SETTINGS_NAV_ITEM_ADMIN = {
  label: 'Settings',
  icon: SettingsIcon,
  href: '/dashboard/settings',
};

function getInitials(name: string | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(user?.role === 'admin' ? ADMIN_NAV_ITEMS : []),
    PROFILE_NAV_ITEM,
    user?.role === 'admin' ? SETTINGS_NAV_ITEM_ADMIN : SETTINGS_NAV_ITEM_DISABLED,
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-flu-pink" />
            <span className="text-base font-semibold tracking-tight text-flu-navy">project7</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden"
            aria-label="Close sidebar"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ label, icon: Icon, href }) => {
            const active = href !== null && pathname === href;

            if (!href) {
              return (
                <button
                  key={label}
                  disabled
                  title="Coming soon"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-gray-400"
                >
                  <Icon className="h-4.5 w-4.5" />
                  {label}
                  <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    Soon
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-flu-pink bg-flu-pink/10 text-flu-pink'
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOutIcon className="h-4.5 w-4.5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-flu-navy px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open sidebar"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <p className="text-sm text-white/60">
              Welcome back, <span className="font-medium text-white">{user?.name}</span>
            </p>
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flu-pink text-xs font-semibold text-white">
                {getInitials(user?.name)}
              </span>
              <span className="hidden font-medium text-white sm:block">{user?.name}</span>
              <ChevronDownIcon
                className={`h-4 w-4 text-white/50 transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="animate-fade-in-down absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
