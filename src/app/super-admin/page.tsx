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

  useEffect(() => {
    const load = async () => {
      try {
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

        setSummary({
          totalTenants: Array.isArray(tenantData.tenants) ? tenantData.tenants.length : 0,
          totalUsers: Array.isArray(memberData.members) ? memberData.members.length : 0,
          activeBilling: Array.isArray(billingData.rows) ? billingData.rows.length : 0,
          auditEvents: Array.isArray(auditData.logs) ? auditData.logs.length : 0,
        });
      } catch {
        setSummary({ totalTenants: 0, totalUsers: 0, activeBilling: 0, auditEvents: 0 });
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">
              Platform Console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Global tenant overview</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200">
            {platformRole ?? "tenant_admin"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${card.color}`}>
              {card.label}
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0d141b] p-5 xl:col-span-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h2 className="text-lg font-semibold text-white">System snapshot</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-[#0a1117] p-4">
              <p className="text-sm text-slate-400">Signed in as</p>
              <p className="mt-2 text-base font-semibold text-white">{user?.email ?? "Unknown user"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0a1117] p-4">
              <p className="text-sm text-slate-400">Active tenant</p>
              <p className="mt-2 text-base font-semibold text-white">{activeTenantId ?? "Not assigned"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0a1117] p-4">
              <p className="text-sm text-slate-400">Workspace</p>
              <p className="mt-2 text-base font-semibold text-white">{profile?.account_id ?? "No account"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h2 className="text-lg font-semibold text-white">Quick links</h2>
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
                className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
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
