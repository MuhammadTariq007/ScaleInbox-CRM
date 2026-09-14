import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/context";
import { getTenantById } from "@/lib/tenants/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { tenantId } = await params;
    const tenant = await getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load tenant";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
