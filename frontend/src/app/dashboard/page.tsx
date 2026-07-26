"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChartBarIcon,
  MailIcon,
  ServerIcon,
  ShieldIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";

function formatDate(unixSeconds: number | undefined) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const QUICK_LINKS = [
  { label: "Customers", description: "Manage customers & stream access", href: "/dashboard/customers", icon: UsersIcon },
  { label: "Resellers", description: "Onboard and manage resellers", href: "/dashboard/resellers", icon: ShieldIcon, adminOnly: true },
  { label: "Plans", description: "Subscription plans & pricing", href: "/dashboard/plans", icon: TagIcon, adminOnly: true },
  { label: "Reports", description: "Orders & revenue insights", href: "/dashboard/reports", icon: ChartBarIcon, adminOnly: true },
  { label: "Servers", description: "Flussonic servers & streams", href: "/dashboard/servers", icon: ServerIcon, adminOnly: true },
];

function DashboardContent() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const stats = [
    { label: "Email address", value: user?.email ?? "—", icon: <MailIcon className="h-4.5 w-4.5" />, tone: "brand" as const },
    { label: "Role", value: user?.role ?? "—", icon: <ShieldIcon className="h-4.5 w-4.5" />, tone: "accent" as const, capitalize: true },
    { label: "Member since", value: formatDate(user?.created_at), icon: <CalendarIcon className="h-4.5 w-4.5" />, tone: "info" as const },
  ];

  const links = QUICK_LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="animate-fade-in-up mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a quick look at your account and shortcuts to get things done.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={<span className={s.capitalize ? "capitalize" : undefined}>{s.value}</span>}
            icon={s.icon}
            tone={s.tone}
            style={{ animationDelay: `${(i + 1) * 40}ms` }}
          />
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ label, description, href, icon: Icon }, i) => (
          <Link key={label} href={href} className="animate-fade-in-up" style={{ animationDelay: `${(i + 1) * 40}ms` }}>
            <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRightIcon className="h-5 w-5 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-4 font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <DashboardContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
