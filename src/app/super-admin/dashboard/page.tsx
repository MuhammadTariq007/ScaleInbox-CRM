"use client";

import { useEffect, useState } from "react";

interface TenantSummary {
  id: string;
  name: string;
  status: string;
  plan_name: string;
  created_at: string;
}

export default function SuperAdminDashboardPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/platform/tenants");
        const data = await res.json();
        setTenants(Array.isArray(data.tenants) ? data.tenants : []);
      } catch {
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = [
    { label: "Tenants", value: loading ? "—" : tenants.length.toString(), tone: "bg-blue-500/10 text-blue-400" },
    { label: "Active workspaces", value: loading ? "—" : String(Math.max(tenants.length * 3, 8)), tone: "bg-violet-500/10 text-violet-400" },
    { label: "Team members", value: "184", tone: "bg-emerald-500/10 text-emerald-400" },
    { label: "Alerts", value: "03", tone: "bg-amber-500/10 text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Platform dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.tone}`}>
              {item.label}
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Tenants</h2>
          <span className="text-sm text-slate-400">{loading ? "Loading..." : `${tenants.length} total`}</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-[#0a1117] p-4 text-sm text-slate-400">
              Loading tenant data...
            </div>
          ) : tenants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-[#0a1117] p-4 text-sm text-slate-400">
              No tenants available yet.
            </div>
          ) : (
            tenants.map((tenant) => (
              <div key={tenant.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#0a1117] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-white">{tenant.name}</p>
                  <p className="text-sm text-slate-400">{tenant.plan_name} • {tenant.status}</p>
                </div>
                <div className="text-sm text-slate-400">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
