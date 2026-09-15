"use client";

import { useEffect, useState } from "react";

interface PlatformMemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  status: string;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

const ROLE_OPTIONS = [
  "tenant_viewer",
  "tenant_agent",
  "tenant_admin",
  "tenant_owner",
  "platform_super_admin",
] as const;

export default function UsersPage() {
  const [members, setMembers] = useState<PlatformMemberRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: "",
    userId: "",
    role: "tenant_admin",
  });

  const load = async () => {
    try {
      const [membersRes, tenantsRes] = await Promise.all([
        fetch("/api/platform/members"),
        fetch("/api/platform/tenants"),
      ]);

      const membersJson = await membersRes.json().catch(() => ({ members: [] }));
      const tenantsJson = await tenantsRes.json().catch(() => ({ tenants: [] }));

      setMembers(Array.isArray(membersJson.members) ? membersJson.members : []);
      setTenants(Array.isArray(tenantsJson.tenants) ? tenantsJson.tenants : []);
    } catch {
      setMembers([]);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAssign = async () => {
    if (!form.tenantId.trim() || !form.userId.trim()) {
      setMessage("Tenant ID and user ID are required.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/platform/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: form.tenantId,
          userId: form.userId,
          role: form.role,
          status: "active",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to assign tenant membership");
      }

      setMessage(`Assigned ${form.userId} to tenant ${form.tenantId}.`);
      setForm({ tenantId: "", userId: "", role: "tenant_admin" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign tenant membership");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (member: PlatformMemberRow, role: string) => {
    try {
      const response = await fetch("/api/platform/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: member.tenant_id,
          userId: member.user_id,
          role,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update role");
      }

      setMessage(`Updated role for ${member.user_id} to ${role}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update role");
    }
  };

  const handleRemove = async (member: PlatformMemberRow) => {
    try {
      const response = await fetch("/api/platform/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: member.tenant_id,
          userId: member.user_id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove membership");
      }

      setMessage(`Removed ${member.user_id} from tenant ${member.tenant_id}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove membership");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-2xl font-semibold text-white">Platform users</h1>
        <p className="mt-2 text-sm text-slate-400">
          Assign users to tenants and manage their platform role from here.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h2 className="text-lg font-semibold text-white">Assign user to tenant</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <select
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none"
            value={form.tenantId}
            onChange={(event) => setForm((prev) => ({ ...prev, tenantId: event.target.value }))}
          >
            <option value="">Select tenant</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.slug})
              </option>
            ))}
          </select>

          <input
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="User ID"
            value={form.userId}
            onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
          />

          <select
            className="rounded-lg border border-white/10 bg-[#0a1117] px-3 py-2 text-sm text-white outline-none"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAssign}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
          >
            {saving ? "Assigning..." : "Assign user"}
          </button>

          {message ? <span className="text-sm text-slate-300">{message}</span> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d141b] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-[#0a1117]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">User</th>
              <th className="px-4 py-3 font-medium text-slate-300">Tenant</th>
              <th className="px-4 py-3 font-medium text-slate-300">Role</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-400">
                  Loading membership...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-400">
                  No tenant memberships recorded yet.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-white/10 bg-[#0d141b]">
                  <td className="px-4 py-3 text-white">{member.user_id}</td>
                  <td className="px-4 py-3">{member.tenant_id}</td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(event) => void handleRoleChange(member, event.target.value)}
                      className="rounded border border-white/10 bg-[#0a1117] px-2 py-1 text-xs text-slate-100 outline-none"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{member.status}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleRemove(member)}
                      className="rounded border border-red-500/40 bg-red-500/5 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
