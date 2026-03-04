import { renderHook } from "@testing-library/react";
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
