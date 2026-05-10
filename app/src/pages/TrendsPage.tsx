import { useMemo, memo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from "recharts";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "@/api/queries";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { LazyChart } from "@/components/shared/LazyChart";
import { TimeRangeSelector } from "@/components/shared/TimeRangeSelector";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  getActiveTasks, getThroughputData, getVelocityData, getAgingDistribution,
  getRescheduleDistribution, getCalendarHeatmapData,
} from "@/lib/metrics";
import { IMPORTANCE_COLORS, TIME_RANGES, type TimeRange } from "@/lib/constants";
import { useChartTheme } from "@/hooks/useChartTheme";
import { subDays, format, eachDayOfInterval, startOfWeek } from "date-fns";

export function TrendsPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const { chartTheme, tooltipStyle } = useChartTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRange = searchParams.get("range");
  const range: TimeRange = TIME_RANGES.some((r) => r.value === rawRange) ? (rawRange as TimeRange) : "90d";
  const setRange = (v: TimeRange) => setSearchParams((p) => { p.set("range", v); return p; });

  const activeTasks = useMemo(() => (tasks ? getActiveTasks(tasks) : []), [tasks]);

  const throughput = useMemo(
    () => (tasks ? getThroughputData(tasks, range) : []),
    [tasks, range]
  );

  const velocity = useMemo(
    () => (tasks ? getVelocityData(tasks, range) : []),
    [tasks, range]
  );

  const aging = useMemo(
    () => getAgingDistribution(activeTasks),
    [activeTasks]
  );

  const reschedule = useMemo(
    () => (tasks ? getRescheduleDistribution(tasks) : []),
    [tasks]
  );

  const heatmap = useMemo(
    () => (tasks ? getCalendarHeatmapData(tasks, range) : []),
    [tasks, range]
  );

  if (isLoading) {
    return <LoadingState variant="page" />;
  }

  if (isError) {
    return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Trends</h2>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <ChartContainer title="Throughput" description="Tasks created vs completed per week">
        {throughput.length === 0 ? <EmptyState message="No throughput data for this time range" /> : (
          <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
            <LineChart data={throughput} margin={chartTheme.margin}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis dataKey="week" tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} tickLine={false} />
              <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursor} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={chartTheme.legend} />
              <Line type="monotone" dataKey="created" stroke="#5e6ad2" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#27a644" strokeWidth={2} dot={false} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer title="Completion Velocity" description="Weekly completions with 4-week rolling average">
        {velocity.length === 0 ? <EmptyState message="No velocity data" /> : (
          <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
            <ComposedChart data={velocity} margin={chartTheme.margin}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis dataKey="week" tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} tickLine={false} />
              <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursor} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={chartTheme.legend} />
              <Bar dataKey="completed" fill="#27a644" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Completed" />
              <Line type="monotone" dataKey="average" stroke="#d97706" strokeWidth={2} dot={false} name="4-wk avg" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <LazyChart>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 3xl:grid-cols-2">
        <ChartContainer title="Task Aging Distribution" description="How long active tasks have been open, by importance">
          {aging.length === 0 ? <EmptyState message="No active tasks" /> : (
            <ResponsiveContainer width="100%" height={220} className="md:!h-[280px]">
              <BarChart data={aging} margin={chartTheme.margin}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="bucket" tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursorFill} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={chartTheme.legend} />
                <Bar dataKey="high" stackId="age" fill={IMPORTANCE_COLORS.High} radius={[3, 3, 0, 0]} name="High" />
                <Bar dataKey="medium" stackId="age" fill={IMPORTANCE_COLORS.Medium} name="Medium" />
                <Bar dataKey="low" stackId="age" fill={IMPORTANCE_COLORS.Low} name="Low" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>

        <ChartContainer title="Reschedule Patterns" description="How often tasks get pushed back">
          {reschedule.length === 0 ? <EmptyState message="No rescheduled tasks" /> : (
            <ResponsiveContainer width="100%" height={220} className="md:!h-[280px]">
              <BarChart data={reschedule} margin={chartTheme.margin}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="bucket" tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursorFill} />
                <Bar dataKey="count" fill="#7170ff" radius={[3, 3, 0, 0]} name="Tasks Rescheduled" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>
      </LazyChart>

      <LazyChart>
        <ChartContainer title="Activity Calendar" description="Daily task creation and completion events">
          <CalendarHeatmap data={heatmap} range={range} />
        </ChartContainer>
      </LazyChart>
    </div>
  );
}

const CalendarHeatmap = memo(function CalendarHeatmap({ data, range }: { data: { date: string; count: number }[]; range: TimeRange }) {
  const end = new Date();
  const daysBack = range === "30d" ? 30 : range === "90d" ? 90 : range === "6m" ? 182 : 365;
  const start = subDays(end, daysBack);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const countMap = new Map(data.map((d) => [d.date, d.count]));

  const firstDay = startOfWeek(start, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: firstDay, end });

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  for (const day of allDays) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  function getColor(count: number): string {
    if (count === 0) return "var(--color-surface-input)";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "#3d3f8f";
    if (intensity < 0.5) return "#5e6ad2";
    if (intensity < 0.75) return "#7170ff";
    return "#828fff";
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const count = countMap.get(dateStr) ?? 0;
              return (
                <div
                  key={di}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ backgroundColor: getColor(count) }}
                  title={`${dateStr}: ${count} events`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] font-[510] text-foreground-quaternary">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
          <div
            key={intensity}
            className="h-3 w-3 rounded-[2px]"
            style={{ backgroundColor: getColor(Math.ceil(intensity * maxCount)) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
});
