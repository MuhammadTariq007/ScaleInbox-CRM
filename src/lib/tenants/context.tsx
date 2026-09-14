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
  activeSubtenantId: string | null;
  switchTenant: (tenantId: string | null) => void;
  switchSubtenant: (subtenantId: string | null) => void;
}

const TenantSwitchContext = createContext<TenantSwitchState | null>(null);
const STORAGE_KEY = "tenant-switch-state";

function readPersistedState() {
  if (typeof window === "undefined") {
    return { tenantId: null, subtenantId: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tenantId: null, subtenantId: null };
    }

    const parsed = JSON.parse(raw) as {
      tenantId?: string | null;
      subtenantId?: string | null;
    };

    return {
      tenantId: typeof parsed.tenantId === "string" ? parsed.tenantId : null,
      subtenantId:
        typeof parsed.subtenantId === "string" ? parsed.subtenantId : null,
    };
  } catch {
    return { tenantId: null, subtenantId: null };
  }
}

export function TenantSwitchProvider({
  children,
  initialTenantId,
  initialSubtenantId,
}: {
  children: ReactNode;
  initialTenantId?: string | null;
  initialSubtenantId?: string | null;
}) {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    const persisted = readPersistedState();
    return initialTenantId ?? persisted.tenantId ?? null;
  });
  const [activeSubtenantId, setActiveSubtenantId] = useState<string | null>(() => {
    const persisted = readPersistedState();
    return initialSubtenantId ?? persisted.subtenantId ?? null;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tenantId: activeTenantId, subtenantId: activeSubtenantId }),
    );
  }, [activeTenantId, activeSubtenantId]);

  const value = useMemo<TenantSwitchState>(
    () => ({
      activeTenantId,
      activeSubtenantId,
      switchTenant: (tenantId) => {
        setActiveTenantId(tenantId);
        if (!tenantId) {
          setActiveSubtenantId(null);
        }
      },
      switchSubtenant: (subtenantId) => {
        setActiveSubtenantId(subtenantId);
      },
    }),
    [activeTenantId, activeSubtenantId],
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
      activeSubtenantId: null,
      switchTenant: () => {},
      switchSubtenant: () => {},
    } as const;
  }

  return ctx;
}
