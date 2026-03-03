# Agile Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Miro-style infinite canvas board that loads Azure DevOps work items as draggable cards, with filtering by project/area/state/type.

**Architecture:** tldraw canvas with custom `work-item-card` shape, a standalone Bun HTTP server proxying Azure DevOps REST API calls (solving CORS), filter panel overlay, and RxDB for connection config + board snapshot persistence.

**Tech Stack:** tldraw (canvas), Bun (backend proxy), Azure DevOps REST API v7.1 (PAT auth), RxDB/Dexie (persistence), React 19, TypeScript, Tailwind CSS v4, shadcn/ui

---

## Task 1: Install tldraw

**Files:**
- Modify: `package.json`

**Step 1: Install tldraw**

Run: `bun install tldraw`

**Step 2: Verify installation**

Run: `bun run build`
Expected: Build succeeds without errors.

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: install tldraw canvas library"
```

---

## Task 2: Add shadcn/ui components needed for filters

**Files:**
- Create: `src/components/ui/checkbox.tsx` (via shadcn)
- Create: `src/components/ui/select.tsx` (via shadcn)
- Create: `src/components/ui/label.tsx` (via shadcn)
- Create: `src/components/ui/input.tsx` (via shadcn)
- Create: `src/components/ui/popover.tsx` (via shadcn)
- Create: `src/components/ui/sheet.tsx` (via shadcn)
- Create: `src/components/ui/skeleton.tsx` (via shadcn)

**Step 1: Add components**

```bash
bunx shadcn@latest add checkbox select label input popover sheet skeleton
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/ui/ package.json bun.lock
git commit -m "chore: add shadcn checkbox, select, label, input, popover, sheet, skeleton"
```

---

## Task 3: Extend UserSettings schema for Azure DevOps connection

**Files:**
- Modify: `src/root/db/schema.ts`
- Modify: `src/root/db/database.ts`

**Step 1: Write the failing test**

Create: `src/root/db/__tests__/schema.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { userSettingsSchema } from "../schema";

describe("UserSettings schema", () => {
  it("includes azureDevOpsOrg property", () => {
    expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsOrg");
    expect(userSettingsSchema.properties.azureDevOpsOrg.type).toBe("string");
  });

  it("includes azureDevOpsPat property", () => {
    expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsPat");
    expect(userSettingsSchema.properties.azureDevOpsPat.type).toBe("string");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- src/root/db/__tests__/schema.test.ts`
Expected: FAIL — properties don't exist yet.

**Step 3: Update the schema**

In `src/root/db/schema.ts`, add to `UserSettings` interface:

```typescript
export interface UserSettings {
  id: string;
  theme: "light" | "dark";
  language: string;
  azureDevOpsOrg: string;
  azureDevOpsPat: string;
  updatedAt: string;
}
```

Add to `userSettingsSchema.properties`:

```typescript
    azureDevOpsOrg: {
      type: "string",
    },
    azureDevOpsPat: {
      type: "string",
    },
```

**Important:** Bump the schema `version` to `1` since we're changing an existing collection. Also add a migration strategy in `database.ts`:

In `src/root/db/database.ts`, update the `user_settings` collection:

```typescript
    user_settings: {
      schema: userSettingsSchema,
      migrationStrategies: {
        1: (oldDoc: any) => ({
          ...oldDoc,
          azureDevOpsOrg: "",
          azureDevOpsPat: "",
        }),
      },
    },
```

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- src/root/db/__tests__/schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/root/db/
git commit -m "feat: extend UserSettings schema with Azure DevOps connection fields"
```

---

## Task 4: Add Azure DevOps connection settings to SettingsForm

**Files:**
- Modify: `src/features/settings/components/SettingsForm.tsx`
- Modify: `src/features/settings/hooks/useSettings.ts`

**Step 1: Write the failing test**

Create: `src/features/settings/components/__tests__/SettingsForm.test.tsx`

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { SettingsForm } from "../SettingsForm";

vi.mock("@/root/hooks/useDatabase", () => ({
  useDatabase: () => ({ db: null, isLoading: false }),
}));

describe("SettingsForm", () => {
  it("renders Azure DevOps organization input", () => {
    render(<SettingsForm />);
    expect(screen.getByLabelText(/organization/i)).toBeInTheDocument();
  });

  it("renders Azure DevOps PAT input", () => {
    render(<SettingsForm />);
    expect(screen.getByLabelText(/personal access token/i)).toBeInTheDocument();
  });

  it("masks PAT input as password type", () => {
    render(<SettingsForm />);
    const patInput = screen.getByLabelText(/personal access token/i);
    expect(patInput).toHaveAttribute("type", "password");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- src/features/settings/components/__tests__/SettingsForm.test.tsx`
Expected: FAIL — inputs don't exist yet.

**Step 3: Update useSettings hook**

In `src/features/settings/hooks/useSettings.ts`, extend `SettingsState`:

```typescript
export interface SettingsState {
  theme: "light" | "dark";
  language: string;
  azureDevOpsOrg: string;
  azureDevOpsPat: string;
}

const defaultSettings: SettingsState = {
  theme: "light",
  language: "en",
  azureDevOpsOrg: "",
  azureDevOpsPat: "",
};
```

Update the `updateSettings` callback's `db.user_settings.upsert` call to include the new fields:

```typescript
        if (db) {
          await db.user_settings.upsert({
            id: "user-settings",
            theme: updated.theme,
            language: updated.language,
            azureDevOpsOrg: updated.azureDevOpsOrg,
            azureDevOpsPat: updated.azureDevOpsPat,
            updatedAt: new Date().toISOString(),
          });
        }
```

**Step 4: Update SettingsForm**

In `src/features/settings/components/SettingsForm.tsx`, add a new Card section after the existing "Data Storage" card. Import `Input` and `Label` from shadcn:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

Add this card at the end of the `<div className="space-y-6">`:

```tsx
      <Card>
        <CardHeader>
          <CardTitle>Azure DevOps</CardTitle>
          <CardDescription>
            Connect to Azure DevOps to load work items onto the board
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="azure-org">Organization URL</Label>
            <Input
              id="azure-org"
              placeholder="https://dev.azure.com/your-org"
              value={settings.azureDevOpsOrg}
              onChange={(e) => updateSettings({ azureDevOpsOrg: e.target.value })}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://dev.azure.com/contoso
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="azure-pat">Personal Access Token</Label>
            <Input
              id="azure-pat"
              type="password"
              placeholder="Enter your PAT"
              value={settings.azureDevOpsPat}
              onChange={(e) => updateSettings({ azureDevOpsPat: e.target.value })}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Needs Work Items (Read) scope. Create one at Azure DevOps → User Settings → Personal
              Access Tokens.
            </p>
          </div>
        </CardContent>
      </Card>
```

**Step 5: Run test to verify it passes**

Run: `bun run test:run -- src/features/settings/components/__tests__/SettingsForm.test.tsx`
Expected: PASS

**Step 6: Run lint**

Run: `bun run lint:fix`

**Step 7: Commit**

```bash
git add src/features/settings/ src/components/ui/
git commit -m "feat: add Azure DevOps connection settings (org URL + PAT)"
```

---

## Task 5: Create the Bun backend proxy server

**Files:**
- Create: `server/proxy.ts`
- Create: `server/package.json`

**Step 1: Create server directory and package.json**

Create `server/package.json`:

```json
{
  "name": "agile-board-proxy",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run --watch proxy.ts",
    "start": "bun run proxy.ts"
  }
}
```

**Step 2: Write the proxy server**

Create `server/proxy.ts`:

```typescript
const PROXY_PORT = 3001;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Azure-Pat, X-Azure-Org",
    "Access-Control-Max-Age": "86400",
  };
}

const server = Bun.serve({
  port: PROXY_PORT,
  async fetch(req) {
    const origin = req.headers.get("Origin");
    const cors = corsHeaders(origin);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: cors });
    }

    // Only proxy /api/devops/* paths
    if (!url.pathname.startsWith("/api/devops/")) {
      return Response.json({ error: "Not found" }, { status: 404, headers: cors });
    }

    // Extract Azure DevOps credentials from custom headers
    const pat = req.headers.get("X-Azure-Pat");
    const org = req.headers.get("X-Azure-Org");

    if (!pat || !org) {
      return Response.json(
        { error: "Missing X-Azure-Pat or X-Azure-Org headers" },
        { status: 400, headers: cors },
      );
    }

    // Build the Azure DevOps URL
    // /api/devops/{project}/_apis/... → https://dev.azure.com/{org}/{project}/_apis/...
    // /api/devops/_apis/... → https://dev.azure.com/{org}/_apis/...
    const azurePath = url.pathname.replace("/api/devops", "");
    const azureUrl = `${org}${azurePath}${url.search}`;

    try {
      const authHeader = `Basic ${btoa(`:${pat}`)}`;

      const azureResponse = await fetch(azureUrl, {
        method: req.method,
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: req.method === "POST" ? await req.text() : undefined,
      });

      const data = await azureResponse.text();

      return new Response(data, {
        status: azureResponse.status,
        headers: {
          ...cors,
          "Content-Type": azureResponse.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown proxy error";
      return Response.json({ error: `Proxy error: ${message}` }, { status: 502, headers: cors });
    }
  },
});

console.log(`🚀 Azure DevOps proxy running on http://localhost:${PROXY_PORT}`);
```

**Step 3: Test the proxy starts**

Run: `cd /workspace/miro/agile-board-devops/server && bun run proxy.ts &`
Then: `curl http://localhost:3001/health`
Expected: `{"status":"ok"}`
Kill the background process afterward.

**Step 4: Commit**

```bash
git add server/
git commit -m "feat: add standalone Bun proxy server for Azure DevOps API"
```

---

## Task 6: Create Azure DevOps API client library

**Files:**
- Create: `src/features/board/lib/azure-api.ts`
- Create: `src/features/board/lib/__tests__/azure-api.test.ts`

**Step 1: Write the failing tests**

Create `src/features/board/lib/__tests__/azure-api.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildWiqlQuery, fetchProjects, fetchWorkItems, type AzureConfig } from "../azure-api";

const mockConfig: AzureConfig = {
  org: "https://dev.azure.com/test-org",
  pat: "test-pat-token",
  proxyBaseUrl: "http://localhost:3001",
};

describe("buildWiqlQuery", () => {
  it("builds query with project only", () => {
    const query = buildWiqlQuery({ project: "MyProject" });
    expect(query).toContain("[System.TeamProject] = 'MyProject'");
  });

  it("builds query with state filters", () => {
    const query = buildWiqlQuery({
      project: "MyProject",
      states: ["Active", "New"],
    });
    expect(query).toContain("[System.State] IN ('Active','New')");
  });

  it("builds query with work item type filters", () => {
    const query = buildWiqlQuery({
      project: "MyProject",
      types: ["Bug", "User Story"],
    });
    expect(query).toContain("[System.WorkItemType] IN ('Bug','User Story')");
  });

  it("builds query with area path filter", () => {
    const query = buildWiqlQuery({
      project: "MyProject",
      areaPath: "MyProject\\Frontend",
    });
    expect(query).toContain("[System.AreaPath] UNDER 'MyProject\\Frontend'");
  });
});

describe("fetchProjects", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls proxy with correct URL and headers", async () => {
    const mockResponse = { value: [{ id: "1", name: "Project1" }] };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const projects = await fetchProjects(mockConfig);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/devops/_apis/projects?api-version=7.1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Azure-Pat": "test-pat-token",
          "X-Azure-Org": "https://dev.azure.com/test-org",
        }),
      }),
    );
    expect(projects).toEqual([{ id: "1", name: "Project1" }]);
  });
});

describe("fetchWorkItems", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs WIQL query then batch-fetches details", async () => {
    // First call: WIQL returns IDs
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ workItems: [{ id: 1 }, { id: 2 }] }),
          { status: 200 },
        ),
      )
      // Second call: batch fetch returns details
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [
              {
                id: 1,
                fields: {
                  "System.Title": "Bug 1",
                  "System.State": "Active",
                  "System.WorkItemType": "Bug",
                },
              },
              {
                id: 2,
                fields: {
                  "System.Title": "Story 1",
                  "System.State": "New",
                  "System.WorkItemType": "User Story",
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const items = await fetchWorkItems(mockConfig, "MyProject", {
      project: "MyProject",
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(2);
    expect(items[0].fields["System.Title"]).toBe("Bug 1");
  });

  it("returns empty array when WIQL returns no items", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ workItems: [] }), { status: 200 }),
    );

    const items = await fetchWorkItems(mockConfig, "MyProject", {
      project: "MyProject",
    });

    expect(items).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- src/features/board/lib/__tests__/azure-api.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement the API client**

Create `src/features/board/lib/azure-api.ts`:

```typescript
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
  const conditions: string[] = [
    `[System.TeamProject] = '${filters.project}'`,
  ];

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
  const response = await fetch(
    `${config.proxyBaseUrl}/api/devops/_apis/projects?api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.value;
}

export async function fetchAreaPaths(
  config: AzureConfig,
  project: string,
): Promise<AreaPathNode> {
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

  // Step 1: WIQL query to get IDs
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

  // Step 2: Batch fetch full details (max 200 per batch)
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
```

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- src/features/board/lib/__tests__/azure-api.test.ts`
Expected: PASS

**Step 5: Run lint**

Run: `bun run lint:fix`

**Step 6: Commit**

```bash
git add src/features/board/
git commit -m "feat: add Azure DevOps API client with WIQL query builder"
```

---

## Task 7: Create custom tldraw WorkItemCard shape

**Files:**
- Create: `src/features/board/lib/work-item-shape.ts`
- Create: `src/features/board/components/WorkItemCardShape.tsx`

**Step 1: Define the custom shape type and util**

Create `src/features/board/lib/work-item-shape.ts`:

```typescript
import type { AzureWorkItem } from "./azure-api";

export const WORK_ITEM_CARD_TYPE = "work-item-card" as const;

export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 140;

export interface WorkItemCardProps {
  w: number;
  h: number;
  workItemId: number;
  title: string;
  state: string;
  workItemType: string;
  assignedTo: string;
  priority: number;
  areaPath: string;
  azureUrl: string;
}

export const WORK_ITEM_TYPE_COLORS: Record<string, string> = {
  Bug: "#dc2626",
  "User Story": "#2563eb",
  Task: "#ca8a04",
  Epic: "#9333ea",
  Feature: "#059669",
};

export const WORK_ITEM_STATE_COLORS: Record<string, string> = {
  New: "#6b7280",
  Active: "#2563eb",
  Resolved: "#059669",
  Closed: "#9333ea",
  Removed: "#dc2626",
};

export function workItemToCardProps(item: AzureWorkItem, orgUrl: string): WorkItemCardProps {
  const fields = item.fields;
  const assignedTo = fields["System.AssignedTo"] as
    | { displayName?: string }
    | string
    | undefined;

  return {
    w: CARD_WIDTH,
    h: CARD_HEIGHT,
    workItemId: item.id,
    title: (fields["System.Title"] as string) || "Untitled",
    state: (fields["System.State"] as string) || "Unknown",
    workItemType: (fields["System.WorkItemType"] as string) || "Unknown",
    assignedTo:
      typeof assignedTo === "object"
        ? assignedTo?.displayName || "Unassigned"
        : (assignedTo as string) || "Unassigned",
    priority: (fields["Microsoft.VSTS.Common.Priority"] as number) || 0,
    areaPath: (fields["System.AreaPath"] as string) || "",
    azureUrl: `${orgUrl}/_workitems/edit/${item.id}`,
  };
}
```

**Step 2: Create the shape util component**

Create `src/features/board/components/WorkItemCardShape.tsx`:

```tsx
import { BaseBoxShapeUtil, HTMLContainer, T, type TLShape } from "tldraw";
import {
  WORK_ITEM_CARD_TYPE,
  WORK_ITEM_STATE_COLORS,
  WORK_ITEM_TYPE_COLORS,
} from "../lib/work-item-shape";

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [WORK_ITEM_CARD_TYPE]: {
      w: number;
      h: number;
      workItemId: number;
      title: string;
      state: string;
      workItemType: string;
      assignedTo: string;
      priority: number;
      areaPath: string;
      azureUrl: string;
    };
  }
}

type WorkItemCardShape = TLShape<typeof WORK_ITEM_CARD_TYPE>;

export class WorkItemCardShapeUtil extends BaseBoxShapeUtil<WorkItemCardShape> {
  static override type = WORK_ITEM_CARD_TYPE;

  static override props = {
    w: T.number,
    h: T.number,
    workItemId: T.number,
    title: T.string,
    state: T.string,
    workItemType: T.string,
    assignedTo: T.string,
    priority: T.number,
    areaPath: T.string,
    azureUrl: T.string,
  };

  getDefaultProps(): WorkItemCardShape["props"] {
    return {
      w: 280,
      h: 140,
      workItemId: 0,
      title: "Work Item",
      state: "New",
      workItemType: "Task",
      assignedTo: "Unassigned",
      priority: 2,
      areaPath: "",
      azureUrl: "",
    };
  }

  component(shape: WorkItemCardShape) {
    const { workItemId, title, state, workItemType, assignedTo, priority } = shape.props;
    const typeColor = WORK_ITEM_TYPE_COLORS[workItemType] || "#6b7280";
    const stateColor = WORK_ITEM_STATE_COLORS[state] || "#6b7280";

    return (
      <HTMLContainer
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderLeft: `4px solid ${typeColor}`,
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Header: Type badge + ID */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                backgroundColor: typeColor,
                color: "#fff",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              {workItemType}
            </span>
            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
              #{workItemId}
            </span>
            {priority > 0 && (
              <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "auto" }}>
                P{priority}
              </span>
            )}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#111827",
              lineHeight: "1.3",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title}
          </div>

          {/* Footer: State + Assigned */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: stateColor,
                backgroundColor: `${stateColor}15`,
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              {state}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#6b7280",
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {assignedTo}
            </span>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: WorkItemCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}
```

**Step 3: Run lint and build**

Run: `bun run lint:fix && bun run build`
Expected: Both pass.

**Step 4: Commit**

```bash
git add src/features/board/
git commit -m "feat: add custom tldraw WorkItemCard shape with styled rendering"
```

---

## Task 8: Create the useAzureDevOps hook

**Files:**
- Create: `src/features/board/hooks/useAzureDevOps.ts`
- Create: `src/features/board/hooks/__tests__/useAzureDevOps.test.ts`

**Step 1: Write the failing test**

Create `src/features/board/hooks/__tests__/useAzureDevOps.test.ts`:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/root/hooks/useDatabase", () => ({
  useDatabase: () => ({
    db: null,
    isLoading: false,
  }),
}));

// Must import after mocks
const { useAzureDevOps } = await import("../useAzureDevOps");

describe("useAzureDevOps", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns isConfigured false when no org/pat", () => {
    const { result } = renderHook(() => useAzureDevOps());
    expect(result.current.isConfigured).toBe(false);
  });

  it("provides loadProjects function", () => {
    const { result } = renderHook(() => useAzureDevOps());
    expect(typeof result.current.loadProjects).toBe("function");
  });

  it("provides loadWorkItems function", () => {
    const { result } = renderHook(() => useAzureDevOps());
    expect(typeof result.current.loadWorkItems).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- src/features/board/hooks/__tests__/useAzureDevOps.test.ts`
Expected: FAIL

**Step 3: Implement the hook**

Create `src/features/board/hooks/useAzureDevOps.ts`:

```typescript
import { useCallback, useMemo, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import {
  type AzureConfig,
  type AzureProject,
  type AzureWorkItem,
  type AreaPathNode,
  type WiqlFilters,
  fetchAreaPaths,
  fetchProjects,
  fetchWorkItems,
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
```

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- src/features/board/hooks/__tests__/useAzureDevOps.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/board/hooks/
git commit -m "feat: add useAzureDevOps hook for project/work item loading"
```

---

## Task 9: Create the FilterPanel component

**Files:**
- Create: `src/features/board/components/FilterPanel.tsx`
- Create: `src/features/board/components/__tests__/FilterPanel.test.tsx`

**Step 1: Write the failing test**

Create `src/features/board/components/__tests__/FilterPanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { FilterPanel } from "../FilterPanel";

const defaultProps = {
  projects: [
    { id: "1", name: "Project Alpha" },
    { id: "2", name: "Project Beta" },
  ],
  selectedProject: "",
  onProjectChange: vi.fn(),
  states: ["New", "Active", "Resolved", "Closed"],
  selectedStates: [] as string[],
  onStatesChange: vi.fn(),
  types: ["Bug", "User Story", "Task", "Epic"],
  selectedTypes: [] as string[],
  onTypesChange: vi.fn(),
  onLoad: vi.fn(),
  isLoading: false,
  isOpen: true,
  onToggle: vi.fn(),
};

describe("FilterPanel", () => {
  it("renders project select", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText(/project/i)).toBeInTheDocument();
  });

  it("renders state checkboxes", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByLabelText("New")).toBeInTheDocument();
    expect(screen.getByLabelText("Active")).toBeInTheDocument();
  });

  it("renders type checkboxes", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByLabelText("Bug")).toBeInTheDocument();
    expect(screen.getByLabelText("User Story")).toBeInTheDocument();
  });

  it("renders load button", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /load/i })).toBeInTheDocument();
  });

  it("disables load button when no project selected", () => {
    render(<FilterPanel {...defaultProps} selectedProject="" />);
    expect(screen.getByRole("button", { name: /load/i })).toBeDisabled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- src/features/board/components/__tests__/FilterPanel.test.tsx`
Expected: FAIL

**Step 3: Implement the FilterPanel**

Create `src/features/board/components/FilterPanel.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AzureProject } from "../lib/azure-api";
import { Filter, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface FilterPanelProps {
  projects: AzureProject[];
  selectedProject: string;
  onProjectChange: (project: string) => void;
  states: string[];
  selectedStates: string[];
  onStatesChange: (states: string[]) => void;
  types: string[];
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  onLoad: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterPanel({
  projects,
  selectedProject,
  onProjectChange,
  states,
  selectedStates,
  onStatesChange,
  types,
  selectedTypes,
  onTypesChange,
  onLoad,
  isLoading,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  function toggleState(state: string) {
    if (selectedStates.includes(state)) {
      onStatesChange(selectedStates.filter((s) => s !== state));
    } else {
      onStatesChange([...selectedStates, state]);
    }
  }

  function toggleType(type: string) {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  }

  if (!isOpen) {
    return (
      <div className="absolute left-3 top-3 z-50">
        <Button variant="secondary" size="icon" onClick={onToggle} title="Open filters">
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute left-3 top-3 bottom-3 z-50 w-72 rounded-lg border bg-card shadow-lg overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Filters</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Project Select */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Project</Label>
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.name}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* State Checkboxes */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">State</Label>
          <div className="space-y-2">
            {states.map((state) => (
              <div key={state} className="flex items-center gap-2">
                <Checkbox
                  id={`state-${state}`}
                  checked={selectedStates.includes(state)}
                  onCheckedChange={() => toggleState(state)}
                />
                <Label htmlFor={`state-${state}`} className="text-sm font-normal cursor-pointer">
                  {state}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Type Checkboxes */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Work Item Type</Label>
          <div className="space-y-2">
            {types.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                />
                <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Load Button */}
        <Button
          className="w-full"
          onClick={onLoad}
          disabled={!selectedProject || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Load Work Items"
          )}
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- src/features/board/components/__tests__/FilterPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/board/components/
git commit -m "feat: add FilterPanel component with project/state/type filters"
```

---

## Task 10: Create the BoardCanvas component

**Files:**
- Create: `src/features/board/components/BoardCanvas.tsx`

**Step 1: Create the canvas wrapper**

Create `src/features/board/components/BoardCanvas.tsx`:

```tsx
import { useCallback } from "react";
import { Tldraw, type Editor, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { WorkItemCardShapeUtil } from "./WorkItemCardShape";
import type { AzureWorkItem } from "../lib/azure-api";
import { CARD_WIDTH, CARD_HEIGHT, workItemToCardProps } from "../lib/work-item-shape";

const customShapeUtils = [WorkItemCardShapeUtil];

interface BoardCanvasProps {
  onEditorMount?: (editor: Editor) => void;
}

export function BoardCanvas({ onEditorMount }: BoardCanvasProps) {
  const handleMount = useCallback(
    (editor: Editor) => {
      onEditorMount?.(editor);
    },
    [onEditorMount],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw
        shapeUtils={customShapeUtils}
        onMount={handleMount}
        persistenceKey="agile-board"
      />
    </div>
  );
}

/**
 * Places work items as card shapes on the canvas in a grid layout.
 */
export function placeWorkItemsOnCanvas(
  editor: Editor,
  items: AzureWorkItem[],
  orgUrl: string,
) {
  const columns = 4;
  const gapX = 20;
  const gapY = 20;
  const startX = 100;
  const startY = 100;

  const shapes = items.map((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      type: "work-item-card" as const,
      x: startX + col * (CARD_WIDTH + gapX),
      y: startY + row * (CARD_HEIGHT + gapY),
      props: workItemToCardProps(item, orgUrl),
    };
  });

  editor.createShapes(shapes);
}
```

**Step 2: Run lint and build**

Run: `bun run lint:fix && bun run build`
Expected: Both pass.

**Step 3: Commit**

```bash
git add src/features/board/components/BoardCanvas.tsx
git commit -m "feat: add BoardCanvas component wrapping tldraw with custom shapes"
```

---

## Task 11: Create the ConnectionBanner component

**Files:**
- Create: `src/features/board/components/ConnectionBanner.tsx`

**Step 1: Create the component**

Create `src/features/board/components/ConnectionBanner.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ConnectionBannerProps {
  isConfigured: boolean;
  error: string | null;
}

export function ConnectionBanner({ isConfigured, error }: ConnectionBannerProps) {
  if (isConfigured && !error) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        {!isConfigured ? (
          <>
            <p className="text-sm text-muted-foreground">
              Azure DevOps not configured.
            </p>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                Configure in Settings
              </Button>
            </Link>
          </>
        ) : (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run lint**

Run: `bun run lint:fix`

**Step 3: Commit**

```bash
git add src/features/board/components/ConnectionBanner.tsx
git commit -m "feat: add ConnectionBanner prompting Azure DevOps setup"
```

---

## Task 12: Create the BoardPage and register the route

**Files:**
- Create: `src/features/board/routes/BoardPage.tsx`
- Create: `src/features/board/hooks/useBoardFilters.ts`
- Create: `src/features/board/index.ts`
- Modify: `src/router.tsx`
- Modify: `src/root/components/DashboardHeader.tsx`
- Modify: `src/test/test-utils.tsx`

**Step 1: Create the filter state hook**

Create `src/features/board/hooks/useBoardFilters.ts`:

```typescript
import { useCallback, useState } from "react";

const DEFAULT_STATES = ["New", "Active", "Resolved", "Closed"];
const DEFAULT_TYPES = ["Bug", "User Story", "Task", "Epic"];

export function useBoardFilters() {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const toggleFilterPanel = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

  return {
    selectedProject,
    setSelectedProject,
    selectedStates,
    setSelectedStates,
    selectedTypes,
    setSelectedTypes,
    isFilterOpen,
    toggleFilterPanel,
    availableStates: DEFAULT_STATES,
    availableTypes: DEFAULT_TYPES,
  };
}
```

**Step 2: Create the BoardPage**

Create `src/features/board/routes/BoardPage.tsx`:

```tsx
import { useCallback, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { BoardCanvas, placeWorkItemsOnCanvas } from "../components/BoardCanvas";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { FilterPanel } from "../components/FilterPanel";
import { useAzureDevOps } from "../hooks/useAzureDevOps";
import { useBoardFilters } from "../hooks/useBoardFilters";
import { useSettings } from "@/features/settings/hooks/useSettings";

export function BoardPage() {
  const editorRef = useRef<Editor | null>(null);
  const { settings } = useSettings();
  const {
    isConfigured,
    projects,
    isLoading,
    error,
    loadProjects,
    loadWorkItems,
  } = useAzureDevOps();

  const {
    selectedProject,
    setSelectedProject,
    selectedStates,
    setSelectedStates,
    selectedTypes,
    setSelectedTypes,
    isFilterOpen,
    toggleFilterPanel,
    availableStates,
    availableTypes,
  } = useBoardFilters();

  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      // Auto-load projects when editor mounts if configured
      if (isConfigured && !hasLoadedProjects) {
        loadProjects();
        setHasLoadedProjects(true);
      }
    },
    [isConfigured, hasLoadedProjects, loadProjects],
  );

  const handleProjectChange = useCallback(
    (project: string) => {
      setSelectedProject(project);
    },
    [setSelectedProject],
  );

  const handleLoadWorkItems = useCallback(async () => {
    if (!selectedProject) return;

    const items = await loadWorkItems(selectedProject, {
      project: selectedProject,
      states: selectedStates.length > 0 ? selectedStates : undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
    });

    if (editorRef.current && items && items.length > 0) {
      placeWorkItemsOnCanvas(editorRef.current, items, settings.azureDevOpsOrg);
    }
  }, [selectedProject, selectedStates, selectedTypes, loadWorkItems, settings.azureDevOpsOrg]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <BoardCanvas onEditorMount={handleEditorMount} />
      <ConnectionBanner isConfigured={isConfigured} error={error} />
      <FilterPanel
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={handleProjectChange}
        states={availableStates}
        selectedStates={selectedStates}
        onStatesChange={setSelectedStates}
        types={availableTypes}
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        onLoad={handleLoadWorkItems}
        isLoading={isLoading}
        isOpen={isFilterOpen}
        onToggle={toggleFilterPanel}
      />
    </div>
  );
}
```

**Step 3: Create barrel export**

Create `src/features/board/index.ts`:

```typescript
export { BoardPage } from "./routes/BoardPage";
```

**Step 4: Register the route**

In `src/router.tsx`, add the board route:

```typescript
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/routes/DashboardPage";
import { SettingsPage } from "@/features/settings/routes/SettingsPage";
import { BoardPage } from "@/features/board/routes/BoardPage";
import { RootLayout } from "@/root/components/RootLayout";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board",
  component: BoardPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, boardRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

**Step 5: Add nav link in DashboardHeader**

In `src/root/components/DashboardHeader.tsx`, add a Board link between Dashboard and Settings in the nav:

```tsx
          <Link
            to="/board"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-sm font-medium text-foreground" }}
          >
            Board
          </Link>
```

**Step 6: Update test-utils to include board route**

In `src/test/test-utils.tsx`, add a board route inside `renderWithRouter`:

```typescript
  const boardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/board",
    component: () => null,
  });

  const routeTree = rootRoute.addChildren([indexRoute, settingsRoute, boardRoute]);
```

**Step 7: Run lint and build**

Run: `bun run lint:fix && bun run build`
Expected: Both pass.

**Step 8: Commit**

```bash
git add src/features/board/ src/router.tsx src/root/components/DashboardHeader.tsx src/test/test-utils.tsx
git commit -m "feat: add Board page with tldraw canvas, filters, and route registration"
```

---

## Task 13: Run all tests and fix issues

**Step 1: Run full test suite**

Run: `bun run test:run`
Expected: All tests pass.

**Step 2: Run lint**

Run: `bun run lint`
Expected: No errors.

**Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds.

**Step 4: Fix any failing tests or lint issues**

Address any issues found in steps 1-3.

**Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve test and lint issues"
```

---

## Task 14: Update Docker setup for proxy server

**Files:**
- Modify: `docker-compose.yml` (if exists)
- Create: `server/Dockerfile` (if needed)

**Step 1: Check existing Docker setup**

Read `Dockerfile` and `docker-compose.yml` to understand the current setup.

**Step 2: Add proxy service**

If using docker-compose, add a `proxy` service that runs `bun run server/proxy.ts`. If single Dockerfile, add the proxy as a second stage or separate service.

**Step 3: Commit**

```bash
git add Dockerfile docker-compose.yml server/
git commit -m "chore: add Docker config for Azure DevOps proxy server"
```

---

## Summary

| Task | What | Files Changed |
|------|------|---------------|
| 1 | Install tldraw | package.json |
| 2 | Add shadcn components | src/components/ui/ |
| 3 | Extend UserSettings schema | src/root/db/ |
| 4 | Azure DevOps settings UI | src/features/settings/ |
| 5 | Bun proxy server | server/ |
| 6 | Azure DevOps API client | src/features/board/lib/ |
| 7 | Custom tldraw shape | src/features/board/lib/, components/ |
| 8 | useAzureDevOps hook | src/features/board/hooks/ |
| 9 | FilterPanel component | src/features/board/components/ |
| 10 | BoardCanvas component | src/features/board/components/ |
| 11 | ConnectionBanner component | src/features/board/components/ |
| 12 | BoardPage + route registration | src/features/board/routes/, src/router.tsx |
| 13 | Full test/lint/build validation | various |
| 14 | Docker setup for proxy | server/, docker-compose.yml |
