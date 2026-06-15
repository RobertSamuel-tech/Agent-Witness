"use client";

import { useCallback, useEffect, useState } from "react";
import type { TenantSummary } from "@/lib/db/types";

export const TENANT_STORAGE_KEY = "tenant-id";

export function getStoredTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TENANT_STORAGE_KEY);
}

export function setStoredTenantId(tenantId: string): void {
  window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
}

interface UseTenantsResult {
  tenants: TenantSummary[];
  selectedTenantId: string | null;
  loading: boolean;
  error: string | null;
  selectTenant: (tenantId: string) => void;
  refetch: () => void;
}

/**
 * Loads the full tenant list from /api/tenants and resolves the active
 * tenant: a stored UUID if it still exists in the list, otherwise the
 * first tenant returned. Persists the resolution back to localStorage so
 * other consumers of getStoredTenantId() stay in sync.
 */
export function useTenants(): UseTenantsResult {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchTenants() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tenants");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as { tenants: TenantSummary[] };
        if (cancelled) return;

        setTenants(data.tenants);

        const stored = getStoredTenantId();
        if (stored && data.tenants.some((tenant) => tenant.id === stored)) {
          setSelectedTenantId(stored);
        } else if (data.tenants.length > 0) {
          setStoredTenantId(data.tenants[0].id);
          setSelectedTenantId(data.tenants[0].id);
        } else {
          setSelectedTenantId(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tenants");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTenants();

    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  const selectTenant = useCallback((tenantId: string) => {
    setStoredTenantId(tenantId);
    setSelectedTenantId(tenantId);
  }, []);

  const refetch = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  return { tenants, selectedTenantId, loading, error, selectTenant, refetch };
}
