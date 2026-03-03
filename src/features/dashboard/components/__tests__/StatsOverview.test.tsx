import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { StatsOverview } from "../StatsOverview";

describe("StatsOverview", () => {
  it("renders all four stat cards", () => {
    render(<StatsOverview />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("Subscriptions")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("Active Now")).toBeInTheDocument();
  });

  it("renders stat values", () => {
    render(<StatsOverview />);
    expect(screen.getByText("$45,231.89")).toBeInTheDocument();
    expect(screen.getByText("+2,350")).toBeInTheDocument();
    expect(screen.getByText("+12,234")).toBeInTheDocument();
    expect(screen.getByText("+573")).toBeInTheDocument();
  });
});
