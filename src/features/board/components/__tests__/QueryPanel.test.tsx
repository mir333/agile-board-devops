import { render, screen } from "@testing-library/react";
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
