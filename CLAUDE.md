# LC Dashboard

## Commands

- `bun run dev` — start dev server
- `bun run build` — typecheck with `tsc` then build with Vite
- `bun run lint` — run Biome linter + formatter check
- `bun run lint:fix` — auto-fix lint and format issues
- `bun run format` — format all source files
- `bun test` — run Vitest in watch mode
- `bun run test:run` — run Vitest once
- `bun run test:coverage` — run Vitest with coverage
- `bunx shadcn@latest add <component>` — add a shadcn/ui component
- `bun install` — install dependencies (uses bun.lock)

## Tech Stack

- Bun as the package manager and script runner
- React 19, TypeScript (strict mode), Vite
- Tailwind CSS v4 (via Vite plugin, no tailwind.config — theme is in `src/index.css`)
- shadcn/ui (New York style, Lucide icons) — config in `components.json`
- TanStack Router (code-based routing, not file-based)
- RxDB with Dexie storage (IndexedDB) for local-first data persistence
- Biome for linting and formatting (replaces ESLint + Prettier) — config in `biome.json`
- Vitest + Testing Library + jsdom for tests

## Project Structure

```
src/
├── main.tsx                 # Entry point — renders RouterProvider
├── router.tsx               # Code-based route definitions (rootRoute → children)
├── index.css                # Tailwind v4 theme + shadcn CSS variables
│
├── root/                    # Shared infrastructure (layout, db, common hooks)
│   ├── components/          # RootLayout, DashboardHeader, Logo
│   ├── db/                  # RxDB database init, schemas, barrel exports
│   └── hooks/               # Shared hooks (useDatabase)
│
├── features/                # Feature modules — one per route/domain
│   ├── dashboard/           # "/" route
│   │   ├── routes/          # DashboardPage (page-level component)
│   │   ├── components/      # StatsOverview, RecentActivity, DatabaseStatus
│   │   └── hooks/           # Dashboard-specific business logic
│   └── settings/            # "/settings" route
│       ├── routes/          # SettingsPage
│       ├── components/      # SettingsForm
│       └── hooks/           # useSettings (persists to RxDB)
│
├── components/              # Shared reusable UI components
│   ├── StatsCard.tsx        # Reusable across features
│   └── ui/                  # shadcn/ui primitives (avatar, badge, button, card, separator)
│
├── lib/                     # Shared utilities
│   └── utils.ts             # cn() helper (clsx + tailwind-merge)
│
└── test/                    # Test infrastructure
    ├── setup.ts             # jest-dom matchers
    └── test-utils.tsx       # Custom render + renderWithRouter helpers
```

## Architecture Rules

### Feature-based organization

Each route/domain lives in `src/features/<name>/` with this structure:

- `routes/` — page-level components that compose feature components
- `components/` — UI components specific to this feature
- `hooks/` — business logic hooks specific to this feature
- `index.ts` — barrel exports for the feature

### Where to put things

| What | Where | Example |
|---|---|---|
| New route/page | `src/features/<name>/routes/` | `features/analytics/routes/AnalyticsPage.tsx` |
| Feature-specific component | `src/features/<name>/components/` | `features/dashboard/components/Chart.tsx` |
| Feature-specific hook | `src/features/<name>/hooks/` | `features/settings/hooks/useSettings.ts` |
| Reusable UI component | `src/components/` | `components/StatsCard.tsx` |
| shadcn/ui component | `src/components/ui/` | Added via `bunx shadcn@latest add` |
| Shared hook | `src/root/hooks/` | `root/hooks/useDatabase.ts` |
| Database schemas | `src/root/db/` | `root/db/schema.ts` |
| Layout / shell components | `src/root/components/` | `root/components/RootLayout.tsx` |
| Utilities | `src/lib/` | `lib/utils.ts` |

### Adding a new route

1. Create `src/features/<name>/` with `routes/`, `components/`, `hooks/`, `index.ts`
2. Add the route in `src/router.tsx` using `createRoute` with `getParentRoute: () => rootRoute`
3. Add a `<Link>` in `src/root/components/DashboardHeader.tsx`

### Import conventions

- Use `@/` path alias for all imports (maps to `src/`)
- Feature code imports shared UI from `@/components/` and shared hooks from `@/root/hooks/`
- Feature code should **not** import from other features — extract to shared if needed
- shadcn components are always at `@/components/ui/<name>`

### Testing conventions

- Tests live next to their components in `__tests__/` folders
- Test files use `.test.tsx` suffix
- Use `render` from `@/test/test-utils` for components without router dependencies
- Use `renderWithRouter` from `@/test/test-utils` for components that use `<Link>` or router hooks
- Mock `@/root/hooks/useDatabase` in tests to avoid async IndexedDB initialization

### shadcn/ui

Do **not** move `src/lib/utils.ts` or `src/components/ui/` — `components.json` aliases depend on these paths. When adding new shadcn components, run `bunx shadcn@latest add <component>` from the project root.
