---
parent: "[[App]]"
tags:
related:
  - "[[API Client]]"
  - "[[Auth System]]"
  - "[[Pages]]"
---

# State Management

The application uses three complementary state management approaches, avoiding external state libraries.

## Architecture

| State Type | Technology | Scope |
|-----------|------------|-------|
| Server data | TanStack React Query | Global (tasks, projects, areas, sync status) |
| Authentication | React Context API | Global (token, login/logout) |
| URL state | React Router `useSearchParams` | Per-page (time range filter) |
| Component state | React `useState` | Local (forms, pagination, UI) |

## TanStack React Query

**The primary data layer.** All server data is fetched, cached, and automatically refetched through React Query hooks.

### Configuration

```typescript
// app/src/main.tsx
const queryClient = new QueryClient();
```

Uses default settings — React Query's built-in retry, background refetching, and garbage collection.

### Data Flow Pattern

```
Page component
  -> useQuery hook (e.g., useTasks())
    -> api.getTasks() (fetch with auth header)
      -> GET /api/tasks (server)
    <- cached Task[]
  -> useMemo(() => computeMetrics(tasks), [tasks])
  -> render charts/cards with computed data
```

All analytics are computed client-side from the full dataset. The server provides raw data; the frontend transforms it.

### Cache Invalidation

After a manual sync (`POST /api/sync`), the Settings page calls `queryClient.invalidateQueries()` to force refetching of all data.

## AuthContext

**Source:** `app/src/contexts/AuthContext.tsx`

Provides authentication state and methods to all components:

```typescript
interface AuthContextValue {
  token: string;                                      // Current token value
  isAuthenticated: boolean;                           // Whether user is logged in
  login: (token: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}
```

### Usage Pattern

```typescript
// In components
const { isAuthenticated, login, logout } = useAuth();

// In App.tsx routing
isAuthenticated ? <AppShell><Outlet /></AppShell> : <LoginPage />
```

See [[Auth System]] for storage details.

## URL State

The Trends page stores the active time range in URL search params:

```typescript
const [params, setParams] = useSearchParams();
const range = (params.get("range") as TimeRange) || "90d";
```

This enables:
- Shareable URLs with pre-selected time range
- Browser back/forward navigation between ranges
- Page refresh preserves the selection

## Derived State (useMemo)

Pages compute analytics metrics using `useMemo` from the raw task/project data:

```typescript
const stats = useMemo(() => getOverviewStats(tasks), [tasks]);
const throughput = useMemo(() => getThroughputData(tasks, range), [tasks, range]);
```

This runs in the browser and re-computes only when dependencies change.
