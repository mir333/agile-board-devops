import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options });
}

/**
 * Renders a component wrapped in a TanStack Router context.
 * Use this for components that use <Link>, useNavigate, etc.
 */
function renderWithRouter(
  ui: ReactElement,
  { route = "/", ...options }: { route?: string } & Omit<RenderOptions, "wrapper"> = {},
) {
  const rootRoute = createRootRoute({
    component: () => ui,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => null,
  });

  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/settings",
    component: () => null,
  });

  const routeTree = rootRoute.addChildren([indexRoute, settingsRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [route] }),
  });

  return render(<RouterProvider router={router} />, { ...options });
}

export { customRender as render, renderWithRouter };
export { screen, waitFor, within } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
