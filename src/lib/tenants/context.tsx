"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TenantSwitchState {
  activeTenantId: string | null;
  switchTenant: (tenantId: string | null) => void;
}

const TenantSwitchContext = createContext<TenantSwitchState | null>(null);
const STORAGE_KEY = "tenant-switch-state";

function readPersistedState() {
  if (typeof window === "undefined") {
    return { tenantId: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tenantId: null };
    }

    const parsed = JSON.parse(raw) as {
      tenantId?: string | null;
    };

    return {
      tenantId: typeof parsed.tenantId === "string" ? parsed.tenantId : null,
    };
  } catch {
    return { tenantId: null };
  }
}

export function TenantSwitchProvider({
  children,
  initialTenantId,
}: {
  children: ReactNode;
  initialTenantId?: string | null;
}) {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    const persisted = readPersistedState();
    return initialTenantId ?? persisted.tenantId ?? null;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tenantId: activeTenantId }));
  }, [activeTenantId]);

  const value = useMemo<TenantSwitchState>(
    () => ({
      activeTenantId,
      switchTenant: (tenantId) => {
        setActiveTenantId(tenantId);
      },
    }),
    [activeTenantId],
  );

  return (
    <TenantSwitchContext.Provider value={value}>
      {children}
    </TenantSwitchContext.Provider>
  );
}

export function useTenantSwitch() {
  const ctx = useContext(TenantSwitchContext);

  if (!ctx) {
    return {
      activeTenantId: null,
      switchTenant: () => {},
    } as const;
  }

  return ctx;
}
