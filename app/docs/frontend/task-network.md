---
parent: "[[frontend-moc]]"
tags:
  - frontend
  - feature
  - visualization
  - react-flow
related:
  - "[[component-architecture]]"
  - "[[pages]]"
  - "[[state-management]]"
  - "[[api-routes]]"
---

# Task Network

A graph visualization of task dependency and relationship chains, rendered in a dialog overlay using React Flow.

## Purpose

Provides a visual map of the full connected component around any task — showing what it depends on, what it prepares for, and what's related — regardless of task status. Data is always fetched live from the Notion API to reflect current state.

## User Flow

```
Click any task item → Unified popover opens
  → Click "View Network" → Network dialog opens
    → Graph renders progressively as levels are fetched
    → Click a node → Tooltip with name, status, Notion link
    → Escape or X → Dialog closes
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Client                                               │
│                                                      │
│  useTaskNetwork(taskId)                              │
│    → fetch(/api/tasks/:id/network) with auth         │
│    → ReadableStream SSE parser                       │
│    → Progressive state updates (nodes[], edges[])    │
│                                                      │
│  NetworkDialog                                       │
│    → NetworkGraph (React Flow canvas)                │
│    → NetworkNode (custom node component)             │
│    → NodeTooltip (click tooltip)                     │
│    → NetworkLegend (edge type key)                   │
└──────────────────────────┬──────────────────────────┘
                           │ SSE stream
┌──────────────────────────▼──────────────────────────┐
│ Server                                               │
│                                                      │
│  GET /api/tasks/:id/network                          │
│    → streamSSE (Hono streaming helper)               │
│    → traverseNetwork() async generator               │
│      → BFS level-by-level                            │
│      → fetchPage() per node (Notion API)             │
│      → Extract: Depends on, Prepares for, Related    │
│      → Yield { nodes, edges, level } per level       │
└─────────────────────────────────────────────────────┘
```

## Server Endpoint

**`GET /api/tasks/:id/network`** — Server-Sent Events stream

Traverses the full connected component starting from the focal task. Fetches each task's page from Notion to extract relation properties.

### SSE Events

| Event | Data | Description |
|-------|------|-------------|
| `level` | `{ nodes: NetworkNode[], edges: NetworkEdge[], level: number }` | One BFS level discovered |
| `done` | `{}` | Traversal complete |
| `error` | `{ error: string }` | Traversal failed |

### Traversal Details

- **Algorithm:** Breadth-first search from focal task
- **Relations extracted:** `Depends on`, `Prepares for`, `Related Tasks`
- **Concurrency:** Max 3 parallel page fetches per batch, 350ms inter-batch delay
- **Rate limiting:** Uses existing `fetchWithRetry` from `notion-client.ts`
- **Deduplication:** Visited set prevents cycles; edge set prevents duplicate edges

## Frontend Components

**Source:** `src/components/network/`

| Component | Purpose |
|-----------|---------|
| `NetworkDialog` | Portal-based modal container (85vw desktop, fullscreen mobile) |
| `NetworkGraph` | React Flow canvas with DAG layout and progressive rendering |
| `NetworkNode` | Custom node: status dot + truncated name (30 chars) |
| `NodeTooltip` | Click tooltip: full name, status badge, Notion link |
| `NetworkLegend` | Corner legend explaining edge types |

### Layout Algorithm

- **Desktop/tablet:** Left-to-right DAG (x = level × 260px, y distributed within level)
- **Mobile (<768px):** Top-to-bottom DAG (y = level × 100px, x distributed within level)
- **Related Tasks:** Positioned at the same level as their connected dependency-chain node

### Visual Encoding

| Element | Meaning |
|---------|---------|
| Solid line + arrowhead | Dependency edge (prerequisite → downstream) |
| Dashed line, no arrow | Related Tasks edge (undirected) |
| Accent ring on node | Focal task (the one you asked about) |
| Status colored dot | Task status (uses `STATUS_COLORS`) |

### Interaction

- **Pan/zoom:** Enabled (mouse drag, scroll wheel, pinch on mobile)
- **Auto-fit:** `fitView` called on each new level arriving (with 300ms animation)
- **Node click:** Shows `NodeTooltip` with full task name + "Open in Notion" link
- **Dismiss:** Escape key or X button only (no backdrop dismiss)

## Unified TaskDetailPopover

**Source:** `src/components/shared/TaskDetailPopover/`

Replaces the old page-specific `TaskPopover`. Used across Dashboard, Prioritize, and Health pages as the standard task interaction layer.

### Content

- Task name (bold)
- Status + Importance + Urgency badges
- Project name(s)
- Deadline (if set)
- Dependency count (if > 0)
- Action buttons: "View Network" + "Open in Notion"

### Behavior

- **Desktop:** Fixed-position card (280px) anchored to clicked element
- **Mobile:** Falls back to `BottomSheet` component
- **Dismiss:** Escape, click outside, window resize

### Hook: `useTaskPopover`

**Source:** `src/hooks/useTaskPopover.ts`

Manages the popover and network dialog state for any page:

```typescript
const popover = useTaskPopover();
// popover.open(taskSummary, anchorRect)  — show popover
// popover.close()                        — dismiss popover
// popover.openNetwork(taskId)            — open network dialog
// popover.closeNetwork()                 — dismiss network dialog
// popover.selectedTask                   — current task (or null)
// popover.networkTaskId                  — network target ID (or null)
// popover.networkTaskName                — network target name
```

### Hook: `useTaskNetwork`

**Source:** `src/hooks/useTaskNetwork.ts`

SSE client that streams network data from the server:

```typescript
const { nodes, edges, status, error } = useTaskNetwork(taskId);
// status: "idle" | "loading" | "done" | "error"
```

Uses `fetch()` + `ReadableStream` (not `EventSource`) to support Bearer auth headers. Aborts on unmount or taskId change.

## Data Types

```typescript
interface NetworkNode {
  id: string;
  label: string;      // Truncated to 30 chars
  fullName: string;   // Complete name for tooltips
  status: string;
  level: number;      // BFS distance from focal node
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency" | "related";
}
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Task has no relations | Dialog shows "No connections found" message |
| Notion API error mid-traversal | Error state shown in dialog |
| Large graph (15+ nodes) | Pan/zoom enables exploration |
| Long task name | Truncated in node, full in tooltip |
