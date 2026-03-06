# Saved Query Sync — Design

## Problem

The current board uses manual UI filters (project, state, type checkboxes) to build WIQL queries on the fly. This is limited — users already maintain sophisticated saved queries in Azure DevOps. Additionally, every "Load Work Items" call creates duplicate cards on the canvas instead of updating existing ones.

## Solution

Replace the FilterPanel with a **query picker** that lists Azure DevOps Saved Queries. Run the selected query, then **sync** the canvas — updating existing cards, adding new ones, and removing stale ones.

## API Layer

### New Functions

1. **`fetchSavedQueries(config)`**
   - Endpoint: `GET _apis/wit/queries?$depth=2&$expand=minimal&api-version=7.1`
   - Returns the query tree (My Queries / Shared Queries folders with flat query children)
   - Flatten into: `{ id: string; name: string; path: string; folder: string }[]`
   - Only include leaf queries (not folders), only flat-list type queries (not tree/one-hop)

2. **`executeSavedQuery(config, queryId)`**
   - Endpoint: `GET _apis/wit/wiql/{queryId}?api-version=7.1`
   - Returns work item IDs, then batch-fetches full details using existing batch logic
   - Returns `AzureWorkItem[]`

### Removed Functions

- `buildWiqlQuery()` — no longer needed (queries live in Azure DevOps)
- `fetchAreaPaths()` — no longer needed (no area path filter in UI)
- `fetchWorkItems()` with custom WIQL — replaced by `executeSavedQuery`

### Kept Functions

- `fetchProjects()` — still used for connection validation
- `testConnection()` — unchanged
- Batch fetch logic — reused internally by `executeSavedQuery`

## Sync Logic

**`syncWorkItemsOnCanvas(editor, items, orgUrl)`** replaces `placeWorkItemsOnCanvas`:

1. Get all existing `work-item-card` shapes from `editor.getCurrentPageShapes()`
2. Build `Map<workItemId, shapeId>` from existing shapes
3. Build `Set<workItemId>` from incoming items
4. **Update**: For items where `workItemId` exists on canvas → `editor.updateShape()` with new props. Position unchanged (user may have rearranged).
5. **Create**: For items not on canvas → `editor.createShape()` at next available grid position after existing shapes.
6. **Delete**: For canvas shapes whose `workItemId` is not in the incoming set → `editor.deleteShapes()`.

New card positions are calculated by finding the max occupied row/col and continuing the grid from there.

## UI Changes

### QueryPanel (replaces FilterPanel)

- **Query dropdown**: grouped select with "My Queries" and "Shared Queries" sections
- **"Sync" button**: executes the selected query and syncs the canvas
- **Last synced timestamp**: displayed below the sync button
- **Loading/error states**: spinner during sync, error message on failure
- Panel toggle button preserved (collapse/expand)

### Settings Persistence

Add to RxDB `user_settings` schema (version bump to 2):
- `azureDevOpsQueryId: string` — GUID of the selected saved query
- `azureDevOpsQueryName: string` — display name (for showing without re-fetching)

Migration from v1 → v2: add empty strings for both fields.

## Hook Changes

### `useAzureDevOps` (modified)

- Remove: `loadAreaPaths`, `loadWorkItems`, `areaPaths` state, `workItems` state
- Add: `savedQueries` state, `loadSavedQueries()`, `executeSavedQuery(queryId)` returning `AzureWorkItem[]`
- Keep: `loadProjects`, `isConfigured`, `isLoading`, `error`

### `useBoardFilters` (deleted)

No longer needed. Selected query state managed via settings context.

## Files Affected

| Action | File |
|--------|------|
| Modify | `src/features/board/lib/azure-api.ts` |
| Modify | `src/features/board/components/BoardCanvas.tsx` |
| Rewrite | `src/features/board/components/FilterPanel.tsx` → `QueryPanel.tsx` |
| Modify | `src/features/board/hooks/useAzureDevOps.ts` |
| Delete | `src/features/board/hooks/useBoardFilters.ts` |
| Modify | `src/features/board/routes/BoardPage.tsx` |
| Modify | `src/root/db/schema.ts` |
| Modify | `src/root/db/database.ts` |
| Modify | `src/root/hooks/useSettingsContext.tsx` |
| Delete | `src/features/board/components/__tests__/FilterPanel.test.tsx` |
| Update | All affected test files |

## Error Handling

- Query list fetch fails → error message in QueryPanel with retry
- Query execution fails → error in ConnectionBanner (existing pattern)
- Stale query ID in settings (query deleted in Azure DevOps) → show "Query not found" error, prompt re-selection
- PAT lacks query read permissions → 401/403 → specific error message
