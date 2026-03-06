export interface AzureConfig {
  org: string;
  pat: string;
  proxyBaseUrl: string;
}

export interface AzureProject {
  id: string;
  name: string;
}

export interface AzureWorkItem {
  id: number;
  fields: Record<string, unknown>;
  url: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  path: string;
  folder: string;
}

export interface ConnectionTestResult {
  proxyReachable: boolean;
  azureAuthenticated: boolean;
  error?: string;
}

interface AzureQueryTreeNode {
  id: string;
  name: string;
  path?: string;
  isFolder: boolean;
  hasChildren?: boolean;
  children?: AzureQueryTreeNode[];
}

function proxyHeaders(config: AzureConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Azure-Pat": config.pat,
    "X-Azure-Org": config.org,
  };
}

function flattenQueryTree(nodes: AzureQueryTreeNode[]): SavedQuery[] {
  const result: SavedQuery[] = [];

  for (const node of nodes) {
    if (!node.isFolder) {
      const path = node.path ?? node.name;
      const folderEnd = path.lastIndexOf("/");
      const folder = folderEnd > 0 ? path.substring(0, folderEnd) : "";
      result.push({
        id: node.id,
        name: node.name,
        path,
        folder,
      });
    }
    if (node.children) {
      result.push(...flattenQueryTree(node.children));
    }
  }

  return result;
}

async function batchFetchWorkItems(
  config: AzureConfig,
  ids: number[],
): Promise<AzureWorkItem[]> {
  if (ids.length === 0) {
    return [];
  }

  const batchSize = 200;
  const allItems: AzureWorkItem[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);

    const batchResponse = await fetch(
      `${config.proxyBaseUrl}/api/devops/_apis/wit/workitemsbatch?api-version=7.1`,
      {
        method: "POST",
        headers: proxyHeaders(config),
        body: JSON.stringify({
          ids: batchIds,
          fields: [
            "System.Id",
            "System.Title",
            "System.State",
            "System.WorkItemType",
            "System.AssignedTo",
            "System.AreaPath",
            "System.IterationPath",
            "System.Tags",
            "System.CreatedDate",
            "System.ChangedDate",
            "System.Description",
            "Microsoft.VSTS.Common.Priority",
          ],
        }),
      },
    );

    if (!batchResponse.ok) {
      throw new Error(
        `Batch fetch failed: ${batchResponse.status} ${batchResponse.statusText}`,
      );
    }

    const batchData = await batchResponse.json();
    allItems.push(...batchData.value);
  }

  return allItems;
}

export async function testConnection(
  config: AzureConfig,
): Promise<ConnectionTestResult> {
  // Step 1: Check if proxy is reachable
  try {
    const healthResponse = await fetch(`${config.proxyBaseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!healthResponse.ok) {
      return {
        proxyReachable: false,
        azureAuthenticated: false,
        error: "Proxy server returned an error",
      };
    }
  } catch {
    return {
      proxyReachable: false,
      azureAuthenticated: false,
      error: `Cannot reach proxy server at ${config.proxyBaseUrl}. Is it running?`,
    };
  }

  // Step 2: Verify Azure credentials by fetching projects
  try {
    const response = await fetch(
      `${config.proxyBaseUrl}/api/devops/_apis/projects?api-version=7.1&$top=1`,
      {
        method: "GET",
        headers: proxyHeaders(config),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.status === 401 || response.status === 403) {
      return {
        proxyReachable: true,
        azureAuthenticated: false,
        error: "Invalid PAT or insufficient permissions",
      };
    }

    if (!response.ok) {
      const body = await response.text();
      return {
        proxyReachable: true,
        azureAuthenticated: false,
        error: `Azure DevOps error (${response.status}): ${body.slice(0, 200)}`,
      };
    }

    return { proxyReachable: true, azureAuthenticated: true };
  } catch {
    return {
      proxyReachable: true,
      azureAuthenticated: false,
      error: "Request to Azure DevOps timed out or failed",
    };
  }
}

export async function fetchProjects(
  config: AzureConfig,
): Promise<AzureProject[]> {
  const response = await fetch(
    `${config.proxyBaseUrl}/api/devops/_apis/projects?api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch projects: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.value;
}

export async function fetchSavedQueries(
  config: AzureConfig,
): Promise<SavedQuery[]> {
  const response = await fetch(
    `${config.proxyBaseUrl}/api/devops/_apis/wit/queries?$depth=2&$expand=minimal&api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch saved queries: ${response.status}`);
  }

  const data = await response.json();
  return flattenQueryTree(data.value);
}

export async function executeSavedQuery(
  config: AzureConfig,
  queryId: string,
): Promise<AzureWorkItem[]> {
  const response = await fetch(
    `${config.proxyBaseUrl}/api/devops/_apis/wit/wiql/${queryId}?api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to execute saved query: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const ids: number[] =
    data.workItems?.map((wi: { id: number }) => wi.id) ?? [];

  return batchFetchWorkItems(config, ids);
}
