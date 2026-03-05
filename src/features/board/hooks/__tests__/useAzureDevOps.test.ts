import { renderHook } from "@testing-library/react";
import { type ReactNode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/root/hooks/useDatabase", () => ({
  useDatabase: () => ({
    db: null,
    isLoading: false,
  }),
}));

// Must import after mocks
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

  it("provides loadProjects function", () => {
    const { result } = renderHook(() => useAzureDevOps(), { wrapper });
    expect(typeof result.current.loadProjects).toBe("function");
  });

  it("provides loadWorkItems function", () => {
    const { result } = renderHook(() => useAzureDevOps(), { wrapper });
    expect(typeof result.current.loadWorkItems).toBe("function");
  });
});
