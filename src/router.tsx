import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/routes/DashboardPage";
import { SettingsPage } from "@/features/settings/routes/SettingsPage";
import { RootLayout } from "@/root/components/RootLayout";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
