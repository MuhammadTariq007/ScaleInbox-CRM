"use client";

import { useEffect, useState } from "react";

interface BillingUsageRow {
  tenant: string;
  plan: string;
  usage: string;
  status: string;
}

export default function BillingPage() {
  const [rows, setRows] = useState<BillingUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/platform/billing");
        const json = await res.json();
        setRows(json.rows ?? []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-2xl font-semibold text-white">Billing & usage</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tenant plans, quota usage, and billing webhooks are surfaced here.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d141b] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-[#0a1117]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Tenant</th>
              <th className="px-4 py-3 font-medium text-slate-300">Plan</th>
              <th className="px-4 py-3 font-medium text-slate-300">Usage</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-400">Loading billing overview...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-400">No billing usage yet.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.tenant}-${index}`} className="border-t border-white/10 bg-[#0d141b]">
                  <td className="px-4 py-3 text-white">{row.tenant}</td>
                  <td className="px-4 py-3">{row.plan}</td>
                  <td className="px-4 py-3">{row.usage}</td>
                  <td className="px-4 py-3">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
