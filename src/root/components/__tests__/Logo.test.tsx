import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Logo } from "../Logo";

describe("Logo", () => {
  it("renders the SVG with LC text", () => {
    render(<Logo />);
    expect(screen.getByText("LC")).toBeInTheDocument();
  });

  it("applies default className", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-8", "w-8");
  });

  it("applies custom className", () => {
    const { container } = render(<Logo className="h-12 w-12" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-12", "w-12");
  });
});
