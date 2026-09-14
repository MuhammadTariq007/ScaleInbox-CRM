export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-2xl font-semibold text-white">Platform settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Configure feature flags, default plans, and platform-wide security defaults here.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#0a1117] p-4">
            <p className="text-sm text-slate-400">Default plan</p>
            <p className="mt-2 text-lg font-medium text-white">Starter</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a1117] p-4">
            <p className="text-sm text-slate-400">Security baseline</p>
            <p className="mt-2 text-lg font-medium text-white">Strict</p>
          </div>
        </div>
      </div>
    </div>
  );
}
