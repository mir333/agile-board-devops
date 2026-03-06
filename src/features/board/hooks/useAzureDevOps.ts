import { useCallback, useMemo, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import {
  type AzureConfig,
  type AzureWorkItem,
  executeSavedQuery as apiExecuteSavedQuery,
  fetchSavedQueries as apiFetchSavedQueries,
  type SavedQuery,
} from "../lib/azure-api";

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";

export function useAzureDevOps() {
  const { settings } = useSettings();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = Boolean(settings.azureDevOpsOrg && settings.azureDevOpsPat);

  const config: AzureConfig | null = useMemo(() => {
    if (!isConfigured) return null;
    return {
      org: settings.azureDevOpsOrg,
      pat: settings.azureDevOpsPat,
      proxyBaseUrl: PROXY_BASE_URL,
    };
  }, [settings.azureDevOpsOrg, settings.azureDevOpsPat, isConfigured]);

  const loadSavedQueries = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetchSavedQueries(config);
      setSavedQueries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved queries");
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const executeSavedQuery = useCallback(
    async (queryId: string): Promise<AzureWorkItem[]> => {
      if (!config) return [];
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiExecuteSavedQuery(config, queryId);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to execute query");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [config],
  );

  return {
    isConfigured,
    savedQueries,
    isLoading,
    error,
    loadSavedQueries,
    executeSavedQuery,
  };
}
