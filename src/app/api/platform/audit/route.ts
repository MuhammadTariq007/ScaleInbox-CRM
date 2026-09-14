import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/context";

export async function GET() {
  try {
    await requirePlatformAdmin();

    return NextResponse.json({
      logs: [
        {
          id: "audit-1",
          action: "tenant_created",
          entity_type: "tenant",
          created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          actor_role: "platform_super_admin",
        },
        {
          id: "audit-2",
          action: "member_updated",
          entity_type: "tenant_users",
          created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
          actor_role: "tenant_admin",
        },
        {
          id: "audit-3",
          action: "billing_webhook",
          entity_type: "subscription",
          created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          actor_role: "system",
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load audit log";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
