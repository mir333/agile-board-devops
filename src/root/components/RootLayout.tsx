import { Outlet } from "@tanstack/react-router";
import { DashboardHeader } from "./DashboardHeader";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
