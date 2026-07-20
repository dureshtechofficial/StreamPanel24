"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import { CalendarIcon, MailIcon, ShieldIcon } from "@/components/icons";
import { usePageTitle } from "@/lib/use-page-title";

function formatDate(unixSeconds: number | undefined) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DashboardContent() {
  usePageTitle("Dashboard");
  const { user } = useAuth();

  const cards = [
    { label: "Email address", value: user?.email ?? "—", icon: MailIcon },
    { label: "Role", value: user?.role ?? "—", icon: ShieldIcon, badge: true },
    {
      label: "Member since",
      value: formatDate(user?.created_at),
      icon: CalendarIcon,
    },
  ];

  return (
    <div className="w-full">
      <div className="animate-fade-in-up mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s a quick look at your servers.
        </p>
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
