"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function SuperAdminShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading, isPlatformAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (!loading && !profileLoading && !isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [user, loading, profileLoading, isPlatformAdmin, router]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b12] text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Checking platform access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isPlatformAdmin) {
    return null;
  }

  return <>{children}</>;
}

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SuperAdminShellInner>{children}</SuperAdminShellInner>
    </AuthProvider>
  );
}
