import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/context";
import { createTenant, listTenants } from "@/lib/tenants/service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const tenants = await listTenants();
    return NextResponse.json({ tenants });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load tenants";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = await request.json();
    const tenant = await createTenant({
      name: payload.name,
      slug: payload.slug,
      ownerUserId: payload.ownerUserId,
      defaultCurrency: payload.defaultCurrency,
      planName: payload.planName,
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
