# Saved Query Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual filter UI with Azure DevOps Saved Query picker; sync canvas cards (update existing, add new, remove stale) instead of always creating duplicates.

**Architecture:** Frontend fetches the saved query tree from Azure DevOps, user picks a query, app executes it by GUID, then diffs the canvas shapes against the result set — updating, creating, or deleting cards to keep the canvas in sync.

**Tech Stack:** React 19, TypeScript, tldraw v4, RxDB (IndexedDB), Bun proxy server, Azure DevOps REST API v7.1, Vitest + Testing Library.

---

### Task 1: Add `fetchSavedQueries` and `executeSavedQuery` to API layer

**Files:**
- Modify: `src/features/board/lib/azure-api.ts`
- Test: `src/features/board/lib/__tests__/azure-api.test.ts`

**Step 1: Write the failing tests**

Add to `src/features/board/lib/__tests__/azure-api.test.ts`:

```typescript
import {
  type AzureConfig,
  buildWiqlQuery,
  executeSavedQuery,
  fetchProjects,
  fetchSavedQueries,
  fetchWorkItems,
} from "../azure-api";

// ... keep existing mockConfig and tests ...

describe("fetchSavedQueries", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches query tree and flattens to leaf queries", async () => {
    const mockResponse = {
      value: [
        {
          id: "folder-1",
          name: "My Queries",
          isFolder: true,
          hasChildren: true,
          children: [
            { id: "q1", name: "Active Bugs", isFolder: false, path: "My Queries/Active Bugs" },
            { id: "q2", name: "Sprint Items", isFolder: false, path: "My Queries/Sprint Items" },
          ],
        },
        {
          id: "folder-2",
          name: "Shared Queries",
          isFolder: true,
          hasChildren: true,
          children: [
            { id: "q3", name: "All Tasks", isFolder: false, path: "Shared Queries/All Tasks" },
          ],
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const queries = await fetchSavedQueries(mockConfig);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/devops/_apis/wit/queries?$depth=2&$expand=minimal&api-version=7.1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Azure-Pat": "test-pat-token",
        }),
      }),
    );
    expect(queries).toEqual([
      { id: "q1", name: "Active Bugs", path: "My Queries/Active Bugs", folder: "My Queries" },
      { id: "q2", name: "Sprint Items", path: "My Queries/Sprint Items", folder: "My Queries" },
      { id: "q3", name: "All Tasks", path: "Shared Queries/All Tasks", folder: "Shared Queries" },
    ]);
  });

  it("throws on non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Not found", { status: 404, statusText: "Not Found" }),
    );

    await expect(fetchSavedQueries(mockConfig)).rejects.toThrow("Failed to fetch saved queries: 404");
  });
});

describe("executeSavedQuery", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes query by ID then batch-fetches work items", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workItems: [{ id: 10 }, { id: 20 }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [
              { id: 10, fields: { "System.Title": "Item A" }, url: "u1" },
              { id: 20, fields: { "System.Title": "Item B" }, url: "u2" },
            ],
          }),
          { status: 200 },
        ),
      );

    const items = await executeSavedQuery(mockConfig, "query-guid-123");

    expect(fetch).toHaveBeenCalledTimes(2);
    // First call: execute saved query by ID
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "http://localhost:3001/api/devops/_apis/wit/wiql/query-guid-123?api-version=7.1",
    );
    expect(items).toHaveLength(2);
    expect(items[0].fields["System.Title"]).toBe("Item A");
  });

  it("returns empty array when query returns no items", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ workItems: [] }), { status: 200 }),
    );

    const items = await executeSavedQuery(mockConfig, "query-guid-empty");
    expect(items).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/board/lib/__tests__/azure-api.test.ts`
Expected: FAIL — `fetchSavedQueries` and `executeSavedQuery` not exported.

**Step 3: Write the implementation**

Add to `src/features/board/lib/azure-api.ts` — new interface and two new functions. Keep `fetchProjects`, `testConnection`, `proxyHeaders`, and the batch fetch logic. Remove `buildWiqlQuery`, `fetchAreaPaths`, `fetchWorkItems`, `WiqlFilters`, `AreaPathNode`.

```typescript
// NEW — add after existing interfaces, replacing WiqlFilters and AreaPathNode

export interface SavedQuery {
  id: string;
  name: string;
  path: string;
  folder: string;
}

// Internal helper — extract batch fetch into reusable function
async function batchFetchWorkItems(config: AzureConfig, ids: number[]): Promise<AzureWorkItem[]> {
  if (ids.length === 0) return [];

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

interface AzureQueryTreeNode {
  id: string;
  name: string;
  path?: string;
  isFolder?: boolean;
  hasChildren?: boolean;
  children?: AzureQueryTreeNode[];
}

function flattenQueryTree(nodes: AzureQueryTreeNode[]): SavedQuery[] {
  const result: SavedQuery[] = [];

  for (const node of nodes) {
    if (node.isFolder && node.children) {
      for (const child of node.children) {
        if (!child.isFolder) {
          result.push({
            id: child.id,
            name: child.name,
            path: child.path ?? `${node.name}/${child.name}`,
            folder: node.name,
          });
        }
      }
    } else if (!node.isFolder) {
      result.push({
        id: node.id,
        name: node.name,
        path: node.path ?? node.name,
        folder: "",
      });
    }
  }

  return result;
}

export async function fetchSavedQueries(config: AzureConfig): Promise<SavedQuery[]> {
  const response = await fetch(
    `${config.proxyBaseUrl}/api/devops/_apis/wit/queries?$depth=2&$expand=minimal&api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch saved queries: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return flattenQueryTree(data.value ?? []);
}

export async function executeSavedQuery(
  config: AzureConfig,
  queryId: string,
): Promise<AzureWorkItem[]> {
  const wiqlResponse = await fetch(
    `${config.proxyBaseUrl}/api/devops/_apis/wit/wiql/${queryId}?api-version=7.1`,
    {
      method: "GET",
      headers: proxyHeaders(config),
    },
  );

  if (!wiqlResponse.ok) {
    throw new Error(`Query execution failed: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
  }

  const wiqlData = await wiqlResponse.json();
  const ids: number[] = wiqlData.workItems?.map((wi: { id: number }) => wi.id) ?? [];

  return batchFetchWorkItems(config, ids);
}
```

The full file after this change keeps: `AzureConfig`, `AzureProject`, `AzureWorkItem`, `ConnectionTestResult`, `SavedQuery`, `proxyHeaders`, `testConnection`, `fetchProjects`, `fetchSavedQueries`, `executeSavedQuery`, `batchFetchWorkItems`, `flattenQueryTree`.

Removes: `WiqlFilters`, `AreaPathNode`, `buildWiqlQuery`, `fetchAreaPaths`, `fetchWorkItems`.

**Step 4: Update the test imports**

Remove the `buildWiqlQuery` and `fetchWorkItems` tests. Update imports to remove those, keep `fetchProjects` tests as-is.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/board/lib/__tests__/azure-api.test.ts`
Expected: PASS — all tests green.

**Step 6: Commit**

```bash
git add src/features/board/lib/azure-api.ts src/features/board/lib/__tests__/azure-api.test.ts
git commit -m "feat: add fetchSavedQueries and executeSavedQuery, remove manual WIQL"
```

---

### Task 2: Add `syncWorkItemsOnCanvas` to BoardCanvas

**Files:**
- Modify: `src/features/board/components/BoardCanvas.tsx`
- Uses: `src/features/board/lib/work-item-shape.ts` (no changes needed)

**Step 1: Write the failing test**

Create `src/features/board/components/__tests__/BoardCanvas.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import type { AzureWorkItem } from "../../lib/azure-api";
import { WORK_ITEM_CARD_TYPE } from "../../lib/work-item-shape";
import { syncWorkItemsOnCanvas } from "../BoardCanvas";

function makeWorkItem(id: number, title: string, state: string): AzureWorkItem {
  return {
    id,
    fields: {
      "System.Title": title,
      "System.State": state,
      "System.WorkItemType": "Task",
      "System.AssignedTo": "Dev",
      "System.AreaPath": "Project",
      "Microsoft.VSTS.Common.Priority": 2,
    },
    url: `https://dev.azure.com/_apis/wit/workItems/${id}`,
  };
}

function makeMockEditor(existingShapes: Array<{ id: string; type: string; props: { workItemId: number } }>) {
  return {
    getCurrentPageShapes: vi.fn(() => existingShapes),
    updateShape: vi.fn(),
    createShapes: vi.fn(),
    deleteShapes: vi.fn(),
  };
}

describe("syncWorkItemsOnCanvas", () => {
  const orgUrl = "https://dev.azure.com/test-org";

  it("creates shapes when canvas is empty", () => {
    const editor = makeMockEditor([]);
    const items = [makeWorkItem(1, "Task 1", "Active"), makeWorkItem(2, "Task 2", "New")];

    syncWorkItemsOnCanvas(editor as any, items, orgUrl);

    expect(editor.createShapes).toHaveBeenCalledTimes(1);
    const createdShapes = editor.createShapes.mock.calls[0][0];
    expect(createdShapes).toHaveLength(2);
    expect(createdShapes[0].props.workItemId).toBe(1);
    expect(createdShapes[1].props.workItemId).toBe(2);
    expect(editor.updateShape).not.toHaveBeenCalled();
    expect(editor.deleteShapes).not.toHaveBeenCalled();
  });

  it("updates existing shapes without changing position", () => {
    const editor = makeMockEditor([
      { id: "shape-a", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 1 } },
    ]);
    const items = [makeWorkItem(1, "Updated Title", "Resolved")];

    syncWorkItemsOnCanvas(editor as any, items, orgUrl);

    expect(editor.updateShape).toHaveBeenCalledTimes(1);
    expect(editor.updateShape).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "shape-a",
        type: WORK_ITEM_CARD_TYPE,
        props: expect.objectContaining({
          title: "Updated Title",
          state: "Resolved",
        }),
      }),
    );
    expect(editor.createShapes).not.toHaveBeenCalled();
    expect(editor.deleteShapes).not.toHaveBeenCalled();
  });

  it("deletes shapes not present in incoming items", () => {
    const editor = makeMockEditor([
      { id: "shape-a", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 1 } },
      { id: "shape-b", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 99 } },
    ]);
    const items = [makeWorkItem(1, "Task 1", "Active")];

    syncWorkItemsOnCanvas(editor as any, items, orgUrl);

    expect(editor.deleteShapes).toHaveBeenCalledWith(["shape-b"]);
  });

  it("handles mixed create/update/delete in one sync", () => {
    const editor = makeMockEditor([
      { id: "shape-a", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 1 } },
      { id: "shape-b", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 2 } },
    ]);
    const items = [
      makeWorkItem(1, "Updated", "Active"),
      makeWorkItem(3, "Brand New", "New"),
    ];

    syncWorkItemsOnCanvas(editor as any, items, orgUrl);

    // Item 1: updated
    expect(editor.updateShape).toHaveBeenCalledTimes(1);
    expect(editor.updateShape).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shape-a" }),
    );
    // Item 2: deleted (not in incoming)
    expect(editor.deleteShapes).toHaveBeenCalledWith(["shape-b"]);
    // Item 3: created
    expect(editor.createShapes).toHaveBeenCalledTimes(1);
    const created = editor.createShapes.mock.calls[0][0];
    expect(created).toHaveLength(1);
    expect(created[0].props.workItemId).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/board/components/__tests__/BoardCanvas.test.ts`
Expected: FAIL — `syncWorkItemsOnCanvas` not exported.

**Step 3: Write the implementation**

Replace `placeWorkItemsOnCanvas` with `syncWorkItemsOnCanvas` in `src/features/board/components/BoardCanvas.tsx`:

```typescript
import type { Editor } from "@tldraw/editor";
import { useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import type { AzureWorkItem } from "../lib/azure-api";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  WORK_ITEM_CARD_TYPE,
  workItemToCardProps,
} from "../lib/work-item-shape";
import { WorkItemCardShapeUtil } from "./WorkItemCardShape";

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
      <Tldraw shapeUtils={customShapeUtils} onMount={handleMount} persistenceKey="agile-board" />
    </div>
  );
}

/**
 * Syncs work items onto the canvas:
 * - Updates existing cards (by workItemId) with new props, preserving position
 * - Creates new cards for items not yet on canvas
 * - Deletes cards whose workItemId is no longer in the result set
 */
export function syncWorkItemsOnCanvas(editor: Editor, items: AzureWorkItem[], orgUrl: string) {
  const columns = 4;
  const gapX = 20;
  const gapY = 20;
  const startX = 100;
  const startY = 100;

  // Build map of existing work-item-card shapes: workItemId → shapeId
  const existingShapes = editor.getCurrentPageShapes();
  const shapeByWorkItemId = new Map<number, string>();
  for (const shape of existingShapes) {
    if (shape.type === WORK_ITEM_CARD_TYPE) {
      const props = shape.props as { workItemId: number };
      shapeByWorkItemId.set(props.workItemId, shape.id);
    }
  }

  // Build set of incoming work item IDs
  const incomingIds = new Set(items.map((item) => item.id));

  // UPDATE existing shapes
  for (const item of items) {
    const existingShapeId = shapeByWorkItemId.get(item.id);
    if (existingShapeId) {
      editor.updateShape({
        id: existingShapeId,
        type: WORK_ITEM_CARD_TYPE,
        props: workItemToCardProps(item, orgUrl),
      });
    }
  }

  // CREATE new shapes for items not on canvas
  const newItems = items.filter((item) => !shapeByWorkItemId.has(item.id));
  if (newItems.length > 0) {
    // Find the next available grid position after existing cards
    const existingCount = shapeByWorkItemId.size - /* deleted below */ 0;
    // Use total existing card count as starting index for new cards
    let nextIndex = shapeByWorkItemId.size;

    const newShapes = newItems.map((item) => {
      const col = nextIndex % columns;
      const row = Math.floor(nextIndex / columns);
      nextIndex++;

      return {
        type: WORK_ITEM_CARD_TYPE as const,
        x: startX + col * (CARD_WIDTH + gapX),
        y: startY + row * (CARD_HEIGHT + gapY),
        props: workItemToCardProps(item, orgUrl),
      };
    });

    editor.createShapes(newShapes);
  }

  // DELETE shapes whose workItemId is no longer in the result set
  const toDelete: string[] = [];
  for (const [workItemId, shapeId] of shapeByWorkItemId) {
    if (!incomingIds.has(workItemId)) {
      toDelete.push(shapeId);
    }
  }
  if (toDelete.length > 0) {
    editor.deleteShapes(toDelete);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/board/components/__tests__/BoardCanvas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/board/components/BoardCanvas.tsx src/features/board/components/__tests__/BoardCanvas.test.ts
git commit -m "feat: add syncWorkItemsOnCanvas with update/create/delete diffing"
```

---

### Task 3: Add query fields to RxDB schema and settings context

**Files:**
- Modify: `src/root/db/schema.ts`
- Modify: `src/root/db/database.ts`
- Modify: `src/root/hooks/useSettingsContext.tsx`
- Test: `src/root/db/__tests__/schema.test.ts`

**Step 1: Write the failing test**

Add to `src/root/db/__tests__/schema.test.ts`:

```typescript
it("includes azureDevOpsQueryId property", () => {
  expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsQueryId");
  expect(userSettingsSchema.properties.azureDevOpsQueryId.type).toBe("string");
});

it("includes azureDevOpsQueryName property", () => {
  expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsQueryName");
  expect(userSettingsSchema.properties.azureDevOpsQueryName.type).toBe("string");
});

it("has schema version 2", () => {
  expect(userSettingsSchema.version).toBe(2);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/root/db/__tests__/schema.test.ts`
Expected: FAIL

**Step 3: Update schema**

In `src/root/db/schema.ts`, update `UserSettings` interface and schema:

```typescript
export interface UserSettings {
  id: string;
  theme: "light" | "dark";
  language: string;
  azureDevOpsOrg: string;
  azureDevOpsPat: string;
  azureDevOpsQueryId: string;
  azureDevOpsQueryName: string;
  updatedAt: string;
}
```

In the schema object, change `version: 1` to `version: 2` and add the two new properties:

```typescript
azureDevOpsQueryId: {
  type: "string",
},
azureDevOpsQueryName: {
  type: "string",
},
```

**Step 4: Update migration strategy**

In `src/root/db/database.ts`, add migration for version 2:

```typescript
migrationStrategies: {
  1: (oldDoc: any) => ({
    ...oldDoc,
    azureDevOpsOrg: "",
    azureDevOpsPat: "",
  }),
  2: (oldDoc: any) => ({
    ...oldDoc,
    azureDevOpsQueryId: "",
    azureDevOpsQueryName: "",
  }),
},
```

**Step 5: Update settings context**

In `src/root/hooks/useSettingsContext.tsx`:

Add to `SettingsState` interface:
```typescript
azureDevOpsQueryId: string;
azureDevOpsQueryName: string;
```

Add to `defaultSettings`:
```typescript
azureDevOpsQueryId: "",
azureDevOpsQueryName: "",
```

Add to `loadSettings` function (inside `setSettings`):
```typescript
azureDevOpsQueryId: doc.azureDevOpsQueryId ?? "",
azureDevOpsQueryName: doc.azureDevOpsQueryName ?? "",
```

Add to `updateSettings` upsert call:
```typescript
azureDevOpsQueryId: updated.azureDevOpsQueryId,
azureDevOpsQueryName: updated.azureDevOpsQueryName,
```

**Step 6: Run tests**

Run: `npx vitest run src/root/db/__tests__/schema.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/root/db/schema.ts src/root/db/database.ts src/root/hooks/useSettingsContext.tsx src/root/db/__tests__/schema.test.ts
git commit -m "feat: add azureDevOpsQueryId/Name to settings schema (v2)"
```

---

### Task 4: Rewrite `useAzureDevOps` hook for saved queries

**Files:**
- Modify: `src/features/board/hooks/useAzureDevOps.ts`
- Modify: `src/features/board/hooks/__tests__/useAzureDevOps.test.ts`

**Step 1: Write the failing test**

Rewrite `src/features/board/hooks/__tests__/useAzureDevOps.test.ts`:

```typescript
import { renderHook } from "@testing-library/react";
import { type ReactNode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/root/hooks/useDatabase", () => ({
  useDatabase: () => ({
    db: null,
    isLoading: false,
  }),
}));

const { SettingsProvider } = await import("@/root/hooks/useSettingsContext");
const { useAzureDevOps } = await import("../useAzureDevOps");

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SettingsProvider, null, children);
}

describe("useAzureDevOps", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns isConfigured false when no org/pat", () => {
    const { result } = renderHook(() => useAzureDevOps(), { wrapper });
    expect(result.current.isConfigured).toBe(false);
  });

  it("provides loadSavedQueries function", () => {
    const { result } = renderHook(() => useAzureDevOps(), { wrapper });
    expect(typeof result.current.loadSavedQueries).toBe("function");
  });

  it("provides executeSavedQuery function", () => {
    const { result } = renderHook(() => useAzureDevOps(), { wrapper });
    expect(typeof result.current.executeSavedQuery).toBe("function");
  });

  it("initializes with empty savedQueries array", () => {
    const { result } = renderHook(() => useAzureDevOps(), { wrapper });
    expect(result.current.savedQueries).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/board/hooks/__tests__/useAzureDevOps.test.ts`
Expected: FAIL — `loadSavedQueries`, `executeSavedQuery`, `savedQueries` don't exist.

**Step 3: Rewrite the hook**

Replace contents of `src/features/board/hooks/useAzureDevOps.ts`:

```typescript
import { useCallback, useMemo, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import {
  type AzureConfig,
  type AzureWorkItem,
  type SavedQuery,
  executeSavedQuery as apiExecuteSavedQuery,
  fetchSavedQueries as apiFetchSavedQueries,
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
```

**Step 4: Run tests**

Run: `npx vitest run src/features/board/hooks/__tests__/useAzureDevOps.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/board/hooks/useAzureDevOps.ts src/features/board/hooks/__tests__/useAzureDevOps.test.ts
git commit -m "feat: rewrite useAzureDevOps for saved query support"
```

---

### Task 5: Create QueryPanel component (replaces FilterPanel)

**Files:**
- Create: `src/features/board/components/QueryPanel.tsx`
- Create: `src/features/board/components/__tests__/QueryPanel.test.tsx`
- Delete: `src/features/board/components/FilterPanel.tsx`
- Delete: `src/features/board/components/__tests__/FilterPanel.test.tsx`
- Delete: `src/features/board/hooks/useBoardFilters.ts`

**Step 1: Write the failing test**

Create `src/features/board/components/__tests__/QueryPanel.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SavedQuery } from "../../lib/azure-api";
import { QueryPanel } from "../QueryPanel";

const mockQueries: SavedQuery[] = [
  { id: "q1", name: "Active Bugs", path: "My Queries/Active Bugs", folder: "My Queries" },
  { id: "q2", name: "Sprint Items", path: "My Queries/Sprint Items", folder: "My Queries" },
  { id: "q3", name: "All Tasks", path: "Shared Queries/All Tasks", folder: "Shared Queries" },
];

describe("QueryPanel", () => {
  it("renders collapsed toggle button when closed", () => {
    render(
      <QueryPanel
        queries={[]}
        selectedQueryId=""
        onQueryChange={vi.fn()}
        onSync={vi.fn()}
        isLoading={false}
        isOpen={false}
        onToggle={vi.fn()}
        lastSynced={null}
      />,
    );

    expect(screen.getByTitle("Open query panel")).toBeInTheDocument();
  });

  it("renders query panel with sync button when open", () => {
    render(
      <QueryPanel
        queries={mockQueries}
        selectedQueryId=""
        onQueryChange={vi.fn()}
        onSync={vi.fn()}
        isLoading={false}
        isOpen={true}
        onToggle={vi.fn()}
        lastSynced={null}
      />,
    );

    expect(screen.getByText("Saved Query")).toBeInTheDocument();
    expect(screen.getByText("Sync")).toBeInTheDocument();
  });

  it("disables sync button when no query is selected", () => {
    render(
      <QueryPanel
        queries={mockQueries}
        selectedQueryId=""
        onQueryChange={vi.fn()}
        onSync={vi.fn()}
        isLoading={false}
        isOpen={true}
        onToggle={vi.fn()}
        lastSynced={null}
      />,
    );

    expect(screen.getByText("Sync")).toBeDisabled();
  });

  it("enables sync button when a query is selected", () => {
    render(
      <QueryPanel
        queries={mockQueries}
        selectedQueryId="q1"
        onQueryChange={vi.fn()}
        onSync={vi.fn()}
        isLoading={false}
        isOpen={true}
        onToggle={vi.fn()}
        lastSynced={null}
      />,
    );

    expect(screen.getByText("Sync")).toBeEnabled();
  });

  it("shows last synced timestamp when provided", () => {
    render(
      <QueryPanel
        queries={mockQueries}
        selectedQueryId="q1"
        onQueryChange={vi.fn()}
        onSync={vi.fn()}
        isLoading={false}
        isOpen={true}
        onToggle={vi.fn()}
        lastSynced={new Date("2026-03-06T12:00:00Z")}
      />,
    );

    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/board/components/__tests__/QueryPanel.test.tsx`
Expected: FAIL — `QueryPanel` module not found.

**Step 3: Write the QueryPanel component**

Create `src/features/board/components/QueryPanel.tsx`:

```typescript
import { Loader2, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { SavedQuery } from "../lib/azure-api";

interface QueryPanelProps {
  queries: SavedQuery[];
  selectedQueryId: string;
  onQueryChange: (queryId: string) => void;
  onSync: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  lastSynced: Date | null;
}

export function QueryPanel({
  queries,
  selectedQueryId,
  onQueryChange,
  onSync,
  isLoading,
  isOpen,
  onToggle,
  lastSynced,
}: QueryPanelProps) {
  if (!isOpen) {
    return (
      <div className="absolute left-3 top-3 z-50">
        <Button variant="secondary" size="icon" onClick={onToggle} title="Open query panel">
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Group queries by folder
  const grouped = new Map<string, SavedQuery[]>();
  for (const query of queries) {
    const folder = query.folder || "Other";
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder)!.push(query);
  }

  return (
    <div className="absolute left-3 top-3 bottom-3 z-50 w-72 rounded-lg border bg-card shadow-lg overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Saved Query</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium">Query</Label>
          <Select value={selectedQueryId} onValueChange={onQueryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a saved query" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(grouped.entries()).map(([folder, folderQueries]) => (
                <SelectGroup key={folder}>
                  <SelectLabel>{folder}</SelectLabel>
                  {folderQueries.map((query) => (
                    <SelectItem key={query.id} value={query.id}>
                      {query.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <Button className="w-full" onClick={onSync} disabled={!selectedQueryId || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync"
          )}
        </Button>

        {lastSynced && (
          <p className="text-xs text-muted-foreground text-center">
            Last synced: {lastSynced.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Delete old files**

```bash
rm src/features/board/components/FilterPanel.tsx
rm src/features/board/components/__tests__/FilterPanel.test.tsx
rm src/features/board/hooks/useBoardFilters.ts
```

**Step 5: Run tests**

Run: `npx vitest run src/features/board/components/__tests__/QueryPanel.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/board/components/QueryPanel.tsx src/features/board/components/__tests__/QueryPanel.test.tsx
git rm src/features/board/components/FilterPanel.tsx src/features/board/components/__tests__/FilterPanel.test.tsx src/features/board/hooks/useBoardFilters.ts
git commit -m "feat: replace FilterPanel with QueryPanel for saved queries"
```

---

### Task 6: Wire everything together in BoardPage

**Files:**
- Modify: `src/features/board/routes/BoardPage.tsx`

**Step 1: Rewrite BoardPage**

```typescript
import type { Editor } from "@tldraw/editor";
import { useCallback, useRef, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { BoardCanvas, syncWorkItemsOnCanvas } from "../components/BoardCanvas";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { QueryPanel } from "../components/QueryPanel";
import { useAzureDevOps } from "../hooks/useAzureDevOps";

export function BoardPage() {
  const editorRef = useRef<Editor | null>(null);
  const { settings, updateSettings } = useSettings();
  const { isConfigured, savedQueries, isLoading, error, loadSavedQueries, executeSavedQuery } =
    useAzureDevOps();

  const [hasLoadedQueries, setHasLoadedQueries] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      if (isConfigured && !hasLoadedQueries) {
        loadSavedQueries();
        setHasLoadedQueries(true);
      }
    },
    [isConfigured, hasLoadedQueries, loadSavedQueries],
  );

  const handleQueryChange = useCallback(
    (queryId: string) => {
      const query = savedQueries.find((q) => q.id === queryId);
      updateSettings({
        azureDevOpsQueryId: queryId,
        azureDevOpsQueryName: query?.name ?? "",
      });
    },
    [savedQueries, updateSettings],
  );

  const handleSync = useCallback(async () => {
    if (!settings.azureDevOpsQueryId) return;

    const items = await executeSavedQuery(settings.azureDevOpsQueryId);

    if (editorRef.current && items.length > 0) {
      syncWorkItemsOnCanvas(editorRef.current, items, settings.azureDevOpsOrg);
    } else if (editorRef.current && items.length === 0) {
      // If query returns nothing, still sync (removes all existing cards)
      syncWorkItemsOnCanvas(editorRef.current, [], settings.azureDevOpsOrg);
    }

    setLastSynced(new Date());
  }, [settings.azureDevOpsQueryId, settings.azureDevOpsOrg, executeSavedQuery]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <BoardCanvas onEditorMount={handleEditorMount} />
      <ConnectionBanner isConfigured={isConfigured} error={error} />
      <QueryPanel
        queries={savedQueries}
        selectedQueryId={settings.azureDevOpsQueryId}
        onQueryChange={handleQueryChange}
        onSync={handleSync}
        isLoading={isLoading}
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen((prev) => !prev)}
        lastSynced={lastSynced}
      />
    </div>
  );
}
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS — no broken imports, no missing modules.

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/features/board/routes/BoardPage.tsx
git commit -m "feat: wire BoardPage to QueryPanel and syncWorkItemsOnCanvas"
```

---

### Task 7: Full integration check and cleanup

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run linter**

Run: `npx @biomejs/biome check src/`
Expected: No errors (or run `npx @biomejs/biome check --write src/` to auto-fix)

**Step 4: Verify no dead imports**

Check that no file still imports from deleted modules (`FilterPanel`, `useBoardFilters`, `buildWiqlQuery`, `fetchAreaPaths`, `fetchWorkItems`, `WiqlFilters`, `AreaPathNode`).

Run: `grep -r "FilterPanel\|useBoardFilters\|buildWiqlQuery\|fetchAreaPaths\|fetchWorkItems\|WiqlFilters\|AreaPathNode" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches.

**Step 5: Final commit if any lint fixes were needed**

```bash
git add -A && git commit -m "chore: lint fixes and cleanup"
```
