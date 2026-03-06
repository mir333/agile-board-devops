import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
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
