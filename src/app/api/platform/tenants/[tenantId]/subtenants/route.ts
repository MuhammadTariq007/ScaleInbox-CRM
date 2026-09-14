import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/context";
import { createTenantSubtenant, listTenantSubtenants } from "@/lib/tenants/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { tenantId } = await params;
    const subtenants = await listTenantSubtenants(tenantId);
    return NextResponse.json({ subtenants });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load subtenants";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { tenantId } = await params;
    const payload = await request.json();
    const subtenant = await createTenantSubtenant({
      tenantId,
      name: payload.name,
      slug: payload.slug,
      status: payload.status,
    });

    return NextResponse.json({ subtenant }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create subtenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
