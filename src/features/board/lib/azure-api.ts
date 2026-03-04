export interface AzureConfig {
  org: string;
  pat: string;
  proxyBaseUrl: string;
}

export interface WiqlFilters {
  project: string;
  areaPath?: string;
  states?: string[];
  types?: string[];
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

export interface AreaPathNode {
  id: number;
  name: string;
  path: string;
  hasChildren: boolean;
  children?: AreaPathNode[];
}

function proxyHeaders(config: AzureConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Azure-Pat": config.pat,
    "X-Azure-Org": config.org,
  };
}

export function buildWiqlQuery(filters: WiqlFilters): string {
  const conditions: string[] = [`[System.TeamProject] = '${filters.project}'`];

  if (filters.areaPath) {
    conditions.push(`[System.AreaPath] UNDER '${filters.areaPath}'`);
  }

  if (filters.states && filters.states.length > 0) {
    const stateList = filters.states.map((s) => `'${s}'`).join(",");
    conditions.push(`[System.State] IN (${stateList})`);
  }

  if (filters.types && filters.types.length > 0) {
    const typeList = filters.types.map((t) => `'${t}'`).join(",");
    conditions.push(`[System.WorkItemType] IN (${typeList})`);
  }

  return `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.CreatedDate] DESC`;
}

export async function fetchProjects(config: AzureConfig): Promise<AzureProject[]> {
  const response = await fetch(`${config.proxyBaseUrl}/api/devops/_apis/projects?api-version=7.1`, {
    method: "GET",
    headers: proxyHeaders(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.value;
}

export async function fetchAreaPaths(config: AzureConfig, project: string): Promise<AreaPathNode> {
  const response = await fetch(
    `${config.proxyBaseUrl}/api/devops/${project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch area paths: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchWorkItems(
  config: AzureConfig,
  project: string,
  filters: WiqlFilters,
): Promise<AzureWorkItem[]> {
  const query = buildWiqlQuery(filters);

  const wiqlResponse = await fetch(
    `${config.proxyBaseUrl}/api/devops/${project}/_apis/wit/wiql?api-version=7.1`,
    {
      method: "POST",
      headers: proxyHeaders(config),
      body: JSON.stringify({ query }),
    },
  );

  if (!wiqlResponse.ok) {
    throw new Error(`WIQL query failed: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
  }

  const wiqlData = await wiqlResponse.json();
  const ids: number[] = wiqlData.workItems?.map((wi: { id: number }) => wi.id) ?? [];

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
      throw new Error(`Batch fetch failed: ${batchResponse.status} ${batchResponse.statusText}`);
    }

    const batchData = await batchResponse.json();
    allItems.push(...batchData.value);
  }

  return allItems;
}
