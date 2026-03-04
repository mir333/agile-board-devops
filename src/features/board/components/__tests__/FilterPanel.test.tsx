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
    expect(screen.getByText("Project")).toBeInTheDocument();
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
