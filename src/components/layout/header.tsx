"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronDown,
  Landmark,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  User,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { useTenantSwitch } from "@/lib/tenants/context";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/inbox": "inbox",
  "/notifications": "notifications",
  "/contacts": "contacts",
  "/pipelines": "pipelines",
  "/broadcasts": "broadcasts",
  "/automations": "automations",
  "/settings": "settings",
};

function getPageTitleKey(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

import { useTranslations } from "next-intl";

export function Header({ onOpenSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const pathname = usePathname();
  const {
    profile,
    signOut,
    isPlatformAdmin,
    activeTenantId: authTenantId,
    activeSubtenantId: authSubtenantId,
  } = useAuth();
  const {
    activeTenantId,
    activeSubtenantId,
    switchTenant,
  } = useTenantSwitch();
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string; name: string }>>([]);
  const resolvedTenantId = activeTenantId ?? authTenantId;
  const resolvedSubtenantId = activeSubtenantId ?? authSubtenantId;
  const titleKey = getPageTitleKey(pathname);

  useEffect(() => {
    if (isPlatformAdmin) {
      setTenantOptions([]);
      return;
    }

    const loadTenants = async () => {
      try {
        const response = await fetch("/api/platform/tenants");
        const json = await response.json();
        const items = Array.isArray(json.tenants) ? json.tenants : [];
        setTenantOptions(
          items
            .filter((tenant: { id?: string; name?: string }) => tenant?.id && tenant?.name)
            .map((tenant: { id: string; name: string }) => ({
              id: tenant.id,
              name: tenant.name,
            })),
        );
      } catch {
        setTenantOptions([]);
      }
    };

    if (authTenantId) {
      void loadTenants();
    }
  }, [isPlatformAdmin, authTenantId]);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — mobile only. 44×44 hit target per Apple HIG. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
          {t(titleKey as string)}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ModeToggle />

        {!isPlatformAdmin && resolvedTenantId && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted focus:outline-none">
              <span className="truncate max-w-[150px]">
                {resolvedTenantId ? `Tenant: ${resolvedTenantId.slice(0, 8)}` : "Platform"}
              </span>
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {tenantOptions.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Switch tenant
                  </div>
                  {tenantOptions.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.id}
                      onSelect={() => switchTenant(tenant.id)}
                      className={tenant.id === resolvedTenantId ? "bg-muted/50" : ""}
                    >
                      {tenant.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {resolvedTenantId && (
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  Active tenant: {resolvedTenantId}
                </DropdownMenuItem>
              )}
              {resolvedSubtenantId && (
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  Active subtenant: {resolvedSubtenantId}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none data-popup-open:bg-muted/70 sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label={t("openAccountMenu")}
        >
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? t("defaultAvatar")}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {profile?.full_name ?? t("defaultUser")}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-popover text-popover-foreground ring-border"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.full_name ?? t("defaultUser")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-border" />
          {isPlatformAdmin && (
            <DropdownMenuItem
              render={
                <Link
                  href="/super-admin"
                  className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                />
              }
            >
              <Landmark className="size-4" />
              Platform console
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=profile"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <User className="size-4" />
            {t("menuProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=whatsapp"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <SettingsIcon className="size-4" />
            {t("menuSettings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <LogOut className="size-4" />
            {t("menuSignOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
