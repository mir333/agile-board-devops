import { useCallback, useMemo, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import {
  type AreaPathNode,
  type AzureConfig,
  type AzureProject,
  type AzureWorkItem,
  fetchAreaPaths,
  fetchProjects,
  fetchWorkItems,
  type WiqlFilters,
} from "../lib/azure-api";

const PROXY_BASE_URL = "http://localhost:3001";

export function useAzureDevOps() {
  const { settings } = useSettings();
  const [projects, setProjects] = useState<AzureProject[]>([]);
  const [workItems, setWorkItems] = useState<AzureWorkItem[]>([]);
  const [areaPaths, setAreaPaths] = useState<AreaPathNode | null>(null);
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

  const loadProjects = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProjects(config);
      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const loadAreaPaths = useCallback(
    async (project: string) => {
      if (!config) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchAreaPaths(config, project);
        setAreaPaths(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load area paths");
      } finally {
        setIsLoading(false);
      }
    },
    [config],
  );

  const loadWorkItems = useCallback(
    async (project: string, filters: WiqlFilters) => {
      if (!config) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchWorkItems(config, project, filters);
        setWorkItems(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load work items");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [config],
  );

  return {
    isConfigured,
    projects,
    workItems,
    areaPaths,
    isLoading,
    error,
    loadProjects,
    loadAreaPaths,
    loadWorkItems,
  };
}
