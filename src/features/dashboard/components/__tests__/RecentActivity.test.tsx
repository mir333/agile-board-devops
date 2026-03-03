import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { RecentActivity } from "../RecentActivity";

describe("RecentActivity", () => {
  it("renders the section title", () => {
    render(<RecentActivity />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("renders all activity items", () => {
    render(<RecentActivity />);
    expect(screen.getByText("New user registered")).toBeInTheDocument();
    expect(screen.getByText("Order #1234 completed")).toBeInTheDocument();
    expect(screen.getByText("Payment received - $250.00")).toBeInTheDocument();
    expect(screen.getByText("New product added")).toBeInTheDocument();
    expect(screen.getByText("System backup completed")).toBeInTheDocument();
  });

  it("renders category badges", () => {
    render(<RecentActivity />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });
});
