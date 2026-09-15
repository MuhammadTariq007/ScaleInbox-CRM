"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SuperAdminShell } from "./super-admin-shell";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu } from "lucide-react";

function SuperAdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Platform console</p>
            <h1 className="text-lg font-semibold">{pathname === "/super-admin" ? "Overview" : pathname.split("/").pop()?.replace(/-/g, " ")}</h1>
          </div>
        </header>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SuperAdminShell>
      <SuperAdminFrame>{children}</SuperAdminFrame>
    </SuperAdminShell>
  );
}
