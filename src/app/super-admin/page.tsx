"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

type PlatformSummary = {
  totalTenants: number;
  totalUsers: number;
  activeBilling: number;
  auditEvents: number;
};

export default function SuperAdminPage() {
  const { user, profile, activeTenantId, platformRole } = useAuth();
  const [summary, setSummary] = useState<PlatformSummary>({
    totalTenants: 0,
    totalUsers: 0,
    activeBilling: 0,
    auditEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const [tenantRes, memberRes, billingRes, auditRes] = await Promise.all([
          fetch("/api/platform/tenants"),
          fetch("/api/platform/members"),
          fetch("/api/platform/billing"),
          fetch("/api/platform/audit"),
        ]);

        const tenantData = await tenantRes.json().catch(() => ({ tenants: [] }));
        const memberData = await memberRes.json().catch(() => ({ members: [] }));
        const billingData = await billingRes.json().catch(() => ({ rows: [] }));
        const auditData = await auditRes.json().catch(() => ({ logs: [] }));

        if (!tenantRes.ok || !memberRes.ok || !billingRes.ok || !auditRes.ok) {
          throw new Error("One or more platform services could not be loaded.");
        }

        setSummary({
          totalTenants: Array.isArray(tenantData.tenants) ? tenantData.tenants.length : 0,
          totalUsers: Array.isArray(memberData.members) ? memberData.members.length : 0,
          activeBilling: Array.isArray(billingData.rows) ? billingData.rows.length : 0,
          auditEvents: Array.isArray(auditData.logs) ? auditData.logs.length : 0,
        });
      } catch (loadError) {
        setSummary({ totalTenants: 0, totalUsers: 0, activeBilling: 0, auditEvents: 0 });
        setError(loadError instanceof Error ? loadError.message : "Unable to load platform metrics.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const cards = [
    { label: "Tenants", value: loading ? "—" : summary.totalTenants, color: "bg-blue-500/10 text-blue-400" },
    { label: "Users", value: loading ? "—" : summary.totalUsers, color: "bg-violet-500/10 text-violet-400" },
    { label: "Billing rows", value: loading ? "—" : summary.activeBilling, color: "bg-emerald-500/10 text-emerald-400" },
    { label: "Audit events", value: loading ? "—" : summary.auditEvents, color: "bg-amber-500/10 text-amber-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/55 p-6 shadow-xl shadow-black/5 backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">
              Platform Console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Global tenant overview</h1>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            {platformRole ?? "tenant_admin"}
          </div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error} Refresh the page after confirming the platform API is available.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border/70 bg-card/55 p-5 shadow-sm backdrop-blur-xl">
            <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${card.color}`}>
              {card.label}
            </div>
            <p className="mt-5 text-3xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card/55 p-5 shadow-sm backdrop-blur-xl xl:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">System snapshot</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <p className="text-sm text-slate-400">Signed in as</p>
              <p className="mt-2 truncate text-base font-semibold text-foreground">{user?.email ?? "Unknown user"}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <p className="text-sm text-slate-400">Active tenant</p>
              <p className="mt-2 truncate text-base font-semibold text-foreground">{activeTenantId ?? "Not assigned"}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <p className="text-sm text-slate-400">Workspace</p>
              <p className="mt-2 truncate text-base font-semibold text-foreground">{profile?.account_id ?? "No account"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/55 p-5 shadow-sm backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-foreground">Quick links</h2>
          <div className="mt-4 space-y-2">
            {[
              ["Tenants", "/super-admin/tenants"],
              ["Users", "/super-admin/users"],
              ["Billing", "/super-admin/billing"],
              ["Audit", "/super-admin/audit"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href as string}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-background/45 px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/5"
              >
                <span>{label}</span>
                <span aria-hidden="true" className="text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
