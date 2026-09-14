import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/context";
import { createTenantMembership, listPlatformMembers, updateTenantMembershipRole, removeTenantMembership } from "@/lib/tenants/service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const members = await listPlatformMembers();
    return NextResponse.json({ members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load platform members";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = await request.json();
    const member = await createTenantMembership({
      tenantId: payload.tenantId,
      userId: payload.userId,
      role: payload.role,
      status: payload.status,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create member assignment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = await request.json();
    const member = await updateTenantMembershipRole({
      tenantId: payload.tenantId,
      userId: payload.userId,
      role: payload.role,
    });

    return NextResponse.json({ member });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update member assignment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = await request.json();
    await removeTenantMembership({
      tenantId: payload.tenantId,
      userId: payload.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to remove member assignment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
