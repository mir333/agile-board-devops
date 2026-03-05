import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { SettingsProvider } from "@/root/hooks/useSettingsContext";
import { SettingsForm } from "../SettingsForm";

// Mock the database hook to avoid async state updates in tests
vi.mock("@/root/hooks/useDatabase", () => ({
  useDatabase: () => ({ db: null, isLoading: false, error: null }),
}));

function renderWithSettings() {
  return render(
    <SettingsProvider>
      <SettingsForm />
    </SettingsProvider>,
  );
}

describe("SettingsForm", () => {
  it("renders the Appearance card", async () => {
    renderWithSettings();
    await waitFor(() => {
      expect(screen.getByText("Appearance")).toBeInTheDocument();
    });
  });

  it("renders theme toggle buttons", async () => {
    renderWithSettings();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /light/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
    });
  });

  it("renders the Data Storage card", async () => {
    renderWithSettings();
    await waitFor(() => {
      expect(screen.getByText("Data Storage")).toBeInTheDocument();
    });
  });

  it("renders the language badge", async () => {
    renderWithSettings();
    await waitFor(() => {
      expect(screen.getByText("EN")).toBeInTheDocument();
    });
  });

  it("renders Azure DevOps organization input", () => {
    renderWithSettings();
    expect(screen.getByLabelText(/organization/i)).toBeInTheDocument();
  });

  it("renders Azure DevOps PAT input", () => {
    renderWithSettings();
    expect(screen.getByLabelText(/personal access token/i)).toBeInTheDocument();
  });

  it("masks PAT input as password type", () => {
    renderWithSettings();
    const patInput = screen.getByLabelText(/personal access token/i);
    expect(patInput).toHaveAttribute("type", "password");
  });
});
