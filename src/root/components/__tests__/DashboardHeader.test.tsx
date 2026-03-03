import { describe, expect, it } from "vitest";
import { renderWithRouter, screen } from "@/test/test-utils";
import { DashboardHeader } from "../DashboardHeader";

describe("DashboardHeader", () => {
  it("renders the dashboard title", async () => {
    renderWithRouter(<DashboardHeader />);
    expect(await screen.findByText("LC Dashboard")).toBeInTheDocument();
  });

  it("renders the version badge", async () => {
    renderWithRouter(<DashboardHeader />);
    expect(await screen.findByText("v1.0")).toBeInTheDocument();
  });

  it("renders navigation links for Dashboard and Settings", async () => {
    renderWithRouter(<DashboardHeader />);
    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders inside a header element", async () => {
    renderWithRouter(<DashboardHeader />);
    expect(await screen.findByRole("banner")).toBeInTheDocument();
  });
});
