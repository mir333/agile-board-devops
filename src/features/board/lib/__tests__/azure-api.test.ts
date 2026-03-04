import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AzureConfig, buildWiqlQuery, fetchProjects, fetchWorkItems } from "../azure-api";

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
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workItems: [{ id: 1 }, { id: 2 }] }), { status: 200 }),
      )
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
