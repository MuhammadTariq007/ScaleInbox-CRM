"use client";

import { useEffect, useState } from "react";

interface PlatformMemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  status: string;
}

export default function UsersPage() {
  const [members, setMembers] = useState<PlatformMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/platform/members");
        const json = await res.json();
        setMembers(json.members ?? []);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-2xl font-semibold text-white">Platform users</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tenant assignments and role membership are listed here.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d141b] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-[#0a1117]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">User</th>
              <th className="px-4 py-3 font-medium text-slate-300">Tenant</th>
              <th className="px-4 py-3 font-medium text-slate-300">Role</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-400">
                  Loading membership...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-400">
                  No tenant memberships recorded yet.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-white/10 bg-[#0d141b]">
                  <td className="px-4 py-3 text-white">{member.user_id}</td>
                  <td className="px-4 py-3">{member.tenant_id}</td>
                  <td className="px-4 py-3">{member.role}</td>
                  <td className="px-4 py-3">{member.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
