import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { BoardPage } from "@/features/board/routes/BoardPage";
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

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board",
  component: BoardPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, boardRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
