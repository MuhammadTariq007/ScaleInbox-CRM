"use client";

import { useEffect, useState } from "react";

interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  actor_role: string | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/platform/audit");
        const json = await res.json();
        setLogs(json.logs ?? []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-2xl font-semibold text-white">Audit trail</h1>
        <p className="mt-2 text-sm text-slate-400">
          This log stream captures tenant creates, member changes, billing events, and failed access attempts.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d141b] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-[#0a1117]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Action</th>
              <th className="px-4 py-3 font-medium text-slate-300">Entity</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actor</th>
              <th className="px-4 py-3 font-medium text-slate-300">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-400">Loading audit log...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-400">No audit entries yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-white/10 bg-[#0d141b]">
                  <td className="px-4 py-3 text-white">{log.action}</td>
                  <td className="px-4 py-3">{log.entity_type ?? "-"}</td>
                  <td className="px-4 py-3">{log.actor_role ?? "system"}</td>
                  <td className="px-4 py-3">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
