import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { StatsCard } from "../StatsCard";

describe("StatsCard", () => {
  const defaultProps = {
    title: "Total Revenue",
    value: "$45,231.89",
    description: "from last month",
    icon: "$",
  };

  it("renders title, value, description, and icon", () => {
    render(<StatsCard {...defaultProps} />);

    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$45,231.89")).toBeInTheDocument();
    expect(screen.getByText("from last month")).toBeInTheDocument();
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("renders positive trend with green color and plus sign", () => {
    render(<StatsCard {...defaultProps} trend={{ value: "20.1%", positive: true }} />);

    const trendEl = screen.getByText("+20.1%");
    expect(trendEl).toBeInTheDocument();
    expect(trendEl).toHaveClass("text-green-600");
  });

  it("renders negative trend with red color and no plus sign", () => {
    render(<StatsCard {...defaultProps} trend={{ value: "5.2%", positive: false }} />);

    const trendEl = screen.getByText("5.2%");
    expect(trendEl).toBeInTheDocument();
    expect(trendEl).toHaveClass("text-red-600");
  });

  it("renders without trend when not provided", () => {
    const { container } = render(<StatsCard {...defaultProps} />);
    expect(container.querySelector(".text-green-600")).toBeNull();
    expect(container.querySelector(".text-red-600")).toBeNull();
  });
});
