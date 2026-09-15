export function formatTenantContextLabel(tenantId: string | null): string {
  if (!tenantId) return "Platform";
  return `Tenant ${tenantId.slice(0, 8)}`;
}
