import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { subDays } from "date-fns";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useTasks, useProjects } from "@/api/queries";
import { useHealthReport } from "@/hooks/useHealthReport";
import { computeHealthScore, getScoreColor, type HealthSeverity, type HealthRuleResult } from "@/lib/health";
import { SEVERITY_COLORS } from "@/lib/constants";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { LazyChart } from "@/components/shared/LazyChart";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskDetailPopover, taskToSummary } from "@/components/shared/TaskDetailPopover";
import { NetworkDialog } from "@/components/network";
import { useTaskPopover } from "@/hooks/useTaskPopover";

type SeverityFilter = "all" | HealthSeverity;
type EntityFilter = "all" | "tasks" | "projects";

const SEVERITY_VALUES = new Set<string>(["all", "error", "warning", "info"]);
const ENTITY_VALUES = new Set<string>(["all", "tasks", "projects"]);

const CUTOFF_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "0", label: "All time" },
];

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "error", label: "Errors" },
  { value: "warning", label: "Warnings" },
  { value: "info", label: "Info" },
];

const ENTITY_OPTIONS: { value: EntityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tasks", label: "Tasks" },
  { value: "projects", label: "Projects" },
];

function HealthScoreGauge({ score }: { score: number }) {
  const color = getScoreColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <ChartContainer title="Health Score" description="Weighted penalty score (0–100)">
      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart
            cx="50%"
            cy="60%"
            innerRadius="55%"
            outerRadius="85%"
            startAngle={180}
            endAngle={0}
            data={data}
            barSize={12}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: "var(--color-interactive-hover)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-[32px] font-[590] tracking-[-0.5px]" style={{ color }}>
            {score}
          </span>
          <span className="text-[11px] font-[510] text-foreground-quaternary">out of 100</span>
        </div>
      </div>
    </ChartContainer>
  );
}

function SeverityDonut({ errors, warnings, info }: { errors: number; warnings: number; info: number }) {
  const { tooltipStyle } = useChartTheme();
  const total = errors + warnings + info;
  const segments = [
    { name: "Errors", value: errors, color: SEVERITY_COLORS.error },
    { name: "Warnings", value: warnings, color: SEVERITY_COLORS.warning },
    { name: "Info", value: info, color: SEVERITY_COLORS.info },
  ].filter((s) => s.value > 0);

  return (
    <ChartContainer title="Severity Breakdown" description="Proportion of issue types">
      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        {total === 0 ? (
          <span className="text-[13px] text-foreground-quaternary">No issues</span>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={segments}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {segments.map((s, i) => (
                    <Cell key={i} fill={s.color} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [`${value} items`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-[590] text-foreground">{total}</span>
              <span className="text-[11px] font-[510] text-foreground-quaternary">total</span>
            </div>
          </>
        )}
      </div>
    </ChartContainer>
  );
}

function ViolationsByRuleChart({ results }: { results: HealthRuleResult[] }) {
  const { chartTheme, tooltipStyle } = useChartTheme();
  const data = useMemo(() =>
    results
      .map((r) => ({
        name: r.rule.name,
        count: r.violations.length,
        severity: r.rule.severity,
      }))
      .sort((a, b) => b.count - a.count),
    [results]
  );

  if (data.length === 0) return null;

  const chartHeight = Math.max(200, data.length * 40);

  return (
    <ChartContainer title="Violations by Rule" description="Which rules have the most issues">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={chartTheme.marginWide}>
          <CartesianGrid horizontal={false} stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} />
          <XAxis type="number" tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={chartTheme.axisTickSm}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursorFill} formatter={(value) => [`${value} items`, "Violations"]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={SEVERITY_COLORS[entry.severity]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function RuleGroup({
  result,
  isExpanded,
  onToggle,
  onViolationClick,
}: {
  result: HealthRuleResult;
  isExpanded: boolean;
  onToggle: () => void;
  onViolationClick: (entityId: string, e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="rounded-[8px] border border-border-subtle bg-surface-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-input"
      >
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className={cn("text-foreground-tertiary transition-transform duration-150", isExpanded && "rotate-90")}
        />
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: SEVERITY_COLORS[result.rule.severity] }}
        />
        <span className="text-[13px] font-[510] text-foreground flex-1">
          {result.rule.name}
        </span>
        <span className="text-[12px] font-[510] text-foreground-tertiary">
          {result.violations.length} {result.violations.length === 1 ? "item" : "items"}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-border-subtle px-4 py-2">
          <p className="mb-2 text-[11px] text-foreground-quaternary">{result.rule.description}</p>
          <div className="space-y-1">
            {result.violations.map((v) => (
              <button
                key={v.entityId}
                type="button"
                onClick={(e) => onViolationClick(v.entityId, e)}
                className="flex w-full items-center gap-3 rounded-[6px] px-3 py-2 transition-colors duration-150 hover:bg-surface-input text-left"
              >
                <span className="text-[12px] font-[510] text-foreground flex-1 truncate">
                  {v.entityName}
                </span>
                <span className="text-[11px] text-foreground-quaternary shrink-0">
                  {v.context}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function HealthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const popover = useTaskPopover();

  const rawSeverity = searchParams.get("severity") ?? "all";
  const severityFilter: SeverityFilter = SEVERITY_VALUES.has(rawSeverity) ? (rawSeverity as SeverityFilter) : "all";
  const rawEntity = searchParams.get("entity") ?? "all";
  const entityFilter: EntityFilter = ENTITY_VALUES.has(rawEntity) ? (rawEntity as EntityFilter) : "all";
  const cutoffDays = searchParams.get("cutoff") ?? "90";

  const cutoffDate = useMemo(() => {
    const days = parseInt(cutoffDays, 10);
    if (days === 0 || isNaN(days)) return null;
    return subDays(new Date(), days).toISOString();
  }, [cutoffDays]);

  const { report, isLoading } = useHealthReport(cutoffDate);

  const score = report ? computeHealthScore(report) : 100;

  const filteredResults = useMemo(() => {
    if (!report) return [];
    return report.results.filter((r) => {
      if (severityFilter !== "all" && r.rule.severity !== severityFilter) return false;
      if (entityFilter === "tasks" && r.rule.entityType !== "task") return false;
      if (entityFilter === "projects" && r.rule.entityType !== "project") return false;
      return true;
    });
  }, [report, severityFilter, entityFilter]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!report) return;
    const errorIds = new Set(
      report.results
        .filter((r) => r.rule.severity === "error" && r.violations.length > 0)
        .map((r) => r.rule.id)
    );
    setExpanded(errorIds);
  }, [report]);

  const setFilter = (key: string, value: string) => {
    setSearchParams((p) => {
      if ((key === "severity" && value === "all") || (key === "entity" && value === "all") || (key === "cutoff" && value === "90")) {
        p.delete(key);
      } else {
        p.set(key, value);
      }
      return p;
    });
  };

  const toggleExpanded = (ruleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  };

  function handleViolationClick(entityId: string, e: MouseEvent<HTMLButtonElement>) {
    const task = tasks?.find((t) => t.id === entityId);
    if (!task) return;
    const rect = e.currentTarget.getBoundingClientRect();
    popover.open(taskToSummary(task, projects ?? []), rect);
  }

  if (isLoading) return <LoadingState variant="page" />;

  return (
    <div className="space-y-6">
      <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Health</h2>

      {report && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HealthScoreGauge score={score} />
            <SeverityDonut errors={report.errors} warnings={report.warnings} info={report.info} />
          </div>

          <LazyChart>
            <ViolationsByRuleChart results={filteredResults} />
          </LazyChart>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl options={SEVERITY_OPTIONS} value={severityFilter} onChange={(v) => setFilter("severity", v)} />
        <SegmentedControl options={ENTITY_OPTIONS} value={entityFilter} onChange={(v) => setFilter("entity", v)} />
        <SegmentedControl options={CUTOFF_OPTIONS} value={cutoffDays} onChange={(v) => setFilter("cutoff", v)} />
      </div>

      {filteredResults.length === 0 ? (
        <EmptyState message="No health issues found" />
      ) : (
        <div className="space-y-2">
          {filteredResults.map((result) => (
            <RuleGroup
              key={result.rule.id}
              result={result}
              isExpanded={expanded.has(result.rule.id)}
              onToggle={() => toggleExpanded(result.rule.id)}
              onViolationClick={handleViolationClick}
            />
          ))}
        </div>
      )}

      {popover.selectedTask && popover.anchorRect && (
        <TaskDetailPopover
          task={popover.selectedTask}
          anchorRect={popover.anchorRect}
          onClose={popover.close}
          onViewNetwork={popover.openNetwork}
        />
      )}

      <NetworkDialog
        taskId={popover.networkTaskId}
        taskName={popover.networkTaskName}
        onClose={popover.closeNetwork}
      />
    </div>
  );
}
