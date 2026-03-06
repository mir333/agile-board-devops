import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AzureConfig,
  executeSavedQuery,
  fetchProjects,
  fetchSavedQueries,
} from "../azure-api";

const mockConfig: AzureConfig = {
  org: "https://dev.azure.com/test-org",
  pat: "test-pat-token",
  proxyBaseUrl: "http://localhost:3001",
};

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
            {
              id: "q1",
              name: "Active Bugs",
              isFolder: false,
              path: "My Queries/Active Bugs",
            },
            {
              id: "q2",
              name: "Sprint Items",
              isFolder: false,
              path: "My Queries/Sprint Items",
            },
          ],
        },
        {
          id: "folder-2",
          name: "Shared Queries",
          isFolder: true,
          hasChildren: true,
          children: [
            {
              id: "q3",
              name: "All Tasks",
              isFolder: false,
              path: "Shared Queries/All Tasks",
            },
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
      {
        id: "q1",
        name: "Active Bugs",
        path: "My Queries/Active Bugs",
        folder: "My Queries",
      },
      {
        id: "q2",
        name: "Sprint Items",
        path: "My Queries/Sprint Items",
        folder: "My Queries",
      },
      {
        id: "q3",
        name: "All Tasks",
        path: "Shared Queries/All Tasks",
        folder: "Shared Queries",
      },
    ]);
  });

  it("throws on non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Not found", { status: 404, statusText: "Not Found" }),
    );

    await expect(fetchSavedQueries(mockConfig)).rejects.toThrow(
      "Failed to fetch saved queries: 404",
    );
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
              {
                id: 10,
                fields: { "System.Title": "Item A" },
                url: "u1",
              },
              {
                id: 20,
                fields: { "System.Title": "Item B" },
                url: "u2",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const items = await executeSavedQuery(mockConfig, "query-guid-123");

    expect(fetch).toHaveBeenCalledTimes(2);
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
