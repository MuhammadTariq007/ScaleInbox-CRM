"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Landmark,
  Settings,
  Users,
  Wallet,
  FileText,
  BriefcaseBusiness,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SuperAdminShell } from "./super-admin-shell";

const navItems = [
  { href: "/super-admin", label: "Overview", icon: Landmark },
  { href: "/super-admin/tenants", label: "Tenants", icon: BriefcaseBusiness },
  { href: "/super-admin/users", label: "Users", icon: Users },
  { href: "/super-admin/billing", label: "Billing", icon: Wallet },
  { href: "/super-admin/audit", label: "Audit", icon: FileText },
  { href: "/super-admin/settings", label: "Settings", icon: Settings },
];

function SuperAdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, isPlatformAdmin, signOut } = useAuth();

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "S";

  return (
    <div className="flex min-h-screen bg-[#050b12] text-slate-100">
      <aside className="flex w-72 flex-col border-r border-[#1a2430] bg-[#050b12]">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#1a2430] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#293542] bg-[#0d141b] text-[10px] font-bold tracking-[0.2em] text-slate-200">
            N
          </div>
          <div className="min-w-0 leading-none">
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">
              Platform Console
            </div>
            <div className="mt-1 truncate text-base font-semibold text-slate-100">
              {isPlatformAdmin ? "Super admin" : "Platform"}
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 py-4">
          <div className="rounded-xl border border-[#1a2430] bg-[#0d141b] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">
              Console
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#0d6d5b] text-emerald-100 shadow-[inset_0_0_0_1px_rgba(167,243,208,0.15)]"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-[#1a2430] p-3">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#1a2430] bg-[#0d141b] px-2 py-2.5">
            <Avatar className="h-9 w-9">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Super admin"} />
              ) : null}
              <AvatarFallback className="bg-[#0d6d5b] text-xs font-semibold text-emerald-50">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-100">
                {profile?.full_name ?? "Super admin"}
              </div>
              <div className="truncate text-[11px] text-slate-400">
                {profile?.email ?? "platform@admin.local"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1a2430] bg-[#0d141b] p-1.5">
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-xs font-medium text-emerald-200">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Platform access
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                admin
              </span>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#24313d] bg-transparent px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[#050b12] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SuperAdminShell>
      <SuperAdminFrame>{children}</SuperAdminFrame>
    </SuperAdminShell>
  );
}
