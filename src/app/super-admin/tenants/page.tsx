"use client";

import { useEffect, useMemo, useState } from "react";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_name: string;
  default_currency: string;
  created_at: string;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    defaultCurrency: "USD",
    planName: "starter",
  });
  const [message, setMessage] = useState<string | null>(null);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/platform/tenants");
      const data = await res.json();
      setTenants(Array.isArray(data.tenants) ? data.tenants : []);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, []);

  const summary = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === "active").length;
    const trial = tenants.filter((tenant) => tenant.status === "trial").length;
    return { active, trial, total: tenants.length };
  }, [tenants]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setMessage("Tenant name is required.");
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          defaultCurrency: form.defaultCurrency,
          planName: form.planName,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Unable to create tenant");
      }

      setForm({ name: "", slug: "", defaultCurrency: "USD", planName: "starter" });
      setMessage(`Created tenant: ${payload.tenant?.name ?? form.name}`);
      await loadTenants();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create tenant");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">Tenant operations</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Tenant management</h1>
        <p className="mt-2 text-sm text-slate-400">
          Create and track tenant workspaces, plans, and current health.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-sm text-slate-400">Total tenants</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-sm text-slate-400">Active</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d141b] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-sm text-slate-400">Trials</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.trial}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h2 className="text-lg font-semibold text-white">Create tenant</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <input
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Tenant name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Slug"
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
          />
          <select
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none"
            value={form.defaultCurrency}
            onChange={(event) => setForm((prev) => ({ ...prev, defaultCurrency: event.target.value }))}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="KRW">KRW</option>
          </select>
          <select
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none"
            value={form.planName}
            onChange={(event) => setForm((prev) => ({ ...prev, planName: event.target.value }))}
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create tenant"}
          </button>

          {message ? <span className="text-sm text-slate-300">{message}</span> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h2 className="text-lg font-semibold text-white">Tenant list</h2>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-[#0a1117]">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                <th className="px-4 py-3 font-medium text-slate-300">Slug</th>
                <th className="px-4 py-3 font-medium text-slate-300">Plan</th>
                <th className="px-4 py-3 font-medium text-slate-300">Currency</th>
                <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading tenants...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-white/10 bg-[#0d141b]">
                    <td className="px-4 py-3 font-medium text-white">{tenant.name}</td>
                    <td className="px-4 py-3">{tenant.slug}</td>
                    <td className="px-4 py-3">{tenant.plan_name}</td>
                    <td className="px-4 py-3">{tenant.default_currency}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200">
                        {tenant.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
