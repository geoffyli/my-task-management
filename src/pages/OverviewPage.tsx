import { useMemo, useState } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ListChecks, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useTasks } from "@/api/queries";
import { StatCard } from "@/components/cards/StatCard";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { TimeRangeSelector } from "@/components/shared/TimeRangeSelector";
import {
  getActiveTasks, getOverdueTasks, getCompletedThisWeek, getAverageAge,
  getThroughputData, getBurndownData, getPriorityCounts, getStatusCounts,
} from "@/lib/metrics";
import { STATUS_COLORS, PRIORITY_COLORS, TOOLTIP_STYLE, type TimeRange } from "@/lib/constants";

export function OverviewPage() {
  const { data: tasks, isLoading } = useTasks();
  const [range, setRange] = useState<TimeRange>("90d");

  const activeTasks = useMemo(() => (tasks ? getActiveTasks(tasks) : []), [tasks]);

  const stats = useMemo(() => {
    if (!tasks) return null;
    return {
      active: activeTasks.length,
      overdue: getOverdueTasks(tasks).length,
      completedWeek: getCompletedThisWeek(tasks).length,
      avgAge: getAverageAge(activeTasks),
    };
  }, [tasks, activeTasks]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Overview</h2>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Tasks" value={stats.active} icon={ListChecks} />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          accent={stats.overdue > 0 ? "red" : "default"}
        />
        <StatCard title="Completed This Week" value={stats.completedWeek} icon={CheckCircle} accent="green" />
        <StatCard title="Avg Age (days)" value={stats.avgAge} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer title="Throughput" description="Tasks created vs completed per week">
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
        </ChartContainer>

        <ChartContainer title="Burndown" description="Open tasks over time">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={burndown} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="open" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} name="Open Tasks" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer title="Priority Distribution" description="Active tasks by priority">
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
        </ChartContainer>

        <ChartContainer title="Status Breakdown" description="All tasks by status">
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
        </ChartContainer>
      </div>
    </div>
  );
}
