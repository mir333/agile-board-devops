# Miro-Style Agile Board with Azure DevOps Integration

## Summary

A new `/board` route that embeds a tldraw infinite canvas as the main work area. Users configure their Azure DevOps connection (org URL + PAT) in Settings, then use a filter panel to load work items. Work items appear as custom tldraw shapes (styled cards) that can be freely dragged, grouped, and annotated with tldraw's built-in tools.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canvas library | tldraw | Production-ready React infinite canvas SDK, rich built-in tools, closest to Miro UX |
| Azure DevOps access | Direct REST API from browser | No backend needed; PAT stored locally in RxDB |
| Board interaction model | Cards on free-form canvas | Miro-like experience; drag, group, annotate freely |
| Filters | Project + Area Path + State + Type | Covers most common work item filtering scenarios |

## Architecture

### Feature Structure

```
src/features/board/
├── routes/
│   └── BoardPage.tsx              # Page with tldraw canvas + filter sidebar
├── components/
│   ├── BoardCanvas.tsx            # tldraw editor wrapper with custom shapes
│   ├── WorkItemCard.tsx           # Custom tldraw shape: renders a ticket card
│   ├── FilterPanel.tsx            # Sidebar with project/area/state/type filters
│   ├── ConnectionBanner.tsx       # Shows connection status / prompts setup
│   └── WorkItemDetail.tsx         # Expanded card detail popover
├── hooks/
│   ├── useAzureDevOps.ts          # REST API client (fetch work items, projects, areas)
│   ├── useBoardFilters.ts         # Filter state management
│   └── useBoardSync.ts            # Sync fetched items → tldraw shapes on canvas
├── lib/
│   ├── azure-api.ts               # Low-level Azure DevOps REST calls
│   └── work-item-shape.ts         # tldraw custom shape definition + util
└── index.ts
```

### Data Flow

```
User sets filters → useBoardFilters → useAzureDevOps (REST call)
                                           ↓
                              Work items fetched from Azure DevOps
                                           ↓
                              useBoardSync maps items → tldraw shapes
                                           ↓
                              Cards appear on canvas (draggable)
                                           ↓
                     User can also add notes, arrows, drawings (tldraw built-in)
```

### Azure DevOps REST API

- **Base URL:** `https://dev.azure.com/{organization}/{project}/_apis/wit/wiql?api-version=7.1`
- **Auth:** Basic auth header with PAT (`Authorization: Basic base64(:PAT)`)
- **Flow:** WIQL query → get work item IDs → batch fetch work item details
- **Filters build a WIQL query** like:
  ```sql
  SELECT [System.Id] FROM WorkItems
  WHERE [System.TeamProject] = @project
    AND [System.AreaPath] UNDER 'Project\Area'
    AND [System.State] IN ('New', 'Active')
    AND [System.WorkItemType] IN ('User Story', 'Bug')
  ```

### Work Item Card Shape

Each card on the canvas shows:
- Title (truncated)
- ID badge (e.g., `#1234`)
- Type icon + color (Bug=red, Story=blue, Task=yellow, Epic=purple)
- State badge
- Assigned To avatar
- Click to expand → detail popover with full description + link to Azure DevOps

### Filter Panel

A collapsible sidebar overlay on the left of the canvas:
- Project dropdown (fetched from Azure DevOps)
- Area Path tree/dropdown (fetched per project)
- State multi-select checkboxes (New, Active, Resolved, Closed)
- Work Item Type multi-select checkboxes (Epic, User Story, Bug, Task)
- Load / Refresh button

### Board Persistence

- tldraw store holds card positions, drawings, notes
- Save/restore tldraw snapshots to RxDB so the board survives page reloads
- Work item data cached in RxDB; re-fetched on explicit refresh

### Settings Extension

Add to existing Settings feature and UserSettings RxDB schema:
- `azureDevOpsOrg`: string — organization URL
- `azureDevOpsPat`: string — Personal Access Token

### Testing Strategy

- Unit tests for `azure-api.ts` (mock fetch)
- Unit tests for filter logic and WIQL query building
- Component tests for FilterPanel, WorkItemCard
- Integration test for BoardPage with mocked API responses
