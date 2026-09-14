export function formatTenantContextLabel(tenantId: string | null, subtenantId: string | null): string {
  if (!tenantId && !subtenantId) return "Platform";
  if (tenantId && subtenantId) return `Tenant ${tenantId.slice(0, 8)} / ${subtenantId.slice(0, 8)}`;
  if (tenantId) return `Tenant ${tenantId.slice(0, 8)}`;
  return `Workspace ${subtenantId?.slice(0, 8) ?? "unknown"}`;
}
