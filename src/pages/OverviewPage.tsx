import { useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ListChecks, AlertTriangle, CheckCircle, Clock, Ban } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "@/api/queries";
import { StatCard } from "@/components/cards/StatCard";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { TimeRangeSelector } from "@/components/shared/TimeRangeSelector";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  getActiveTasks, getOverviewStats, getBlockedTasksSummary,
  getThroughputData, getBurndownData, getPriorityCounts, getStatusCounts,
} from "@/lib/metrics";
import { downloadCSV } from "@/lib/csv-export";
import { STATUS_COLORS, PRIORITY_COLORS, TOOLTIP_STYLE, TIME_RANGES, type TimeRange } from "@/lib/constants";

function formatTrend(current: number, previous: number): string | undefined {
  if (current > previous) return `↑ ${current - previous} vs last week`;
  if (current < previous) return `↓ ${previous - current} vs last week`;
  return undefined;
}

export function OverviewPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRange = searchParams.get("range");
  const range: TimeRange = TIME_RANGES.some((r) => r.value === rawRange) ? (rawRange as TimeRange) : "90d";
  const setRange = (v: TimeRange) => setSearchParams((p) => { p.set("range", v); return p; });

  const activeTasks = useMemo(() => (tasks ? getActiveTasks(tasks) : []), [tasks]);

  const stats = useMemo(() => (tasks ? getOverviewStats(tasks) : null), [tasks]);
  const blocked = useMemo(() => (tasks ? getBlockedTasksSummary(tasks) : null), [tasks]);

  const throughput = useMemo(
    () => (tasks ? getThroughputData(tasks, range) : []),
    [tasks, range]
  );

  const burndown = useMemo(
    () => (tasks ? getBurndownData(tasks, range) : []),
    [tasks, range]
  );

  const priorities = useMemo(
    () => getPriorityCounts(activeTasks),
    [activeTasks]
  );

  const statuses = useMemo(
    () => (tasks ? getStatusCounts(tasks) : []),
    [tasks]
  );

  if (isLoading || !stats) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (isError) {
    return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Overview</h2>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Active Tasks" value={stats.active} icon={ListChecks} />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          accent={stats.overdue > 0 ? "red" : "default"}
        />
        <StatCard title="Completed This Week" value={stats.completedWeek} icon={CheckCircle} accent="green" trend={formatTrend(stats.completedWeek, stats.completedPrevWeek)} />
        <StatCard title="Avg Age (days)" value={stats.avgAge} icon={Clock} />
        <StatCard title="Blocked" value={blocked?.blockedCount ?? 0} icon={Ban} accent={blocked && blocked.blockedCount > 0 ? "red" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer title="Throughput" description="Tasks created vs completed per week" onExport={() => downloadCSV("throughput.csv", ["Week", "Created", "Completed"], throughput.map((d) => [d.week, d.created, d.completed]))}>
          {throughput.length === 0 ? <EmptyState message="No throughput data for this time range" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={throughput} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
          )}
        </ChartContainer>

        <ChartContainer title="Burndown" description="Open tasks over time">
          {burndown.length === 0 ? <EmptyState message="No burndown data for this time range" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={burndown} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="open" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} name="Open Tasks" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer title="Priority Distribution" description="Active tasks by priority">
          {priorities.length === 0 ? <EmptyState message="No active tasks" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={priorities}
                dataKey="count"
                nameKey="priority"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {priorities.map((entry) => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
          )}
        </ChartContainer>

        <ChartContainer title="Status Breakdown" description="All tasks by status">
          {statuses.length === 0 ? <EmptyState message="No tasks found" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statuses} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Tasks">
                {statuses.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] ?? "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
