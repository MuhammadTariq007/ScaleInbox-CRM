import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/context";

export async function GET() {
  try {
    await requirePlatformAdmin();

    return NextResponse.json({
      rows: [
        {
          tenant: "Acme Commerce",
          plan: "Growth",
          usage: "12.4k messages / 8.1k contact records",
          status: "active",
        },
        {
          tenant: "Northwind Labs",
          plan: "Scale",
          usage: "19.2k messages / 12.3k contact records",
          status: "trial",
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load billing overview";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
