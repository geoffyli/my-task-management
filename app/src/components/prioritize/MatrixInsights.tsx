import { AlertTriangle, Target, TrendingUp, ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import type { MatrixInsightData } from "@/lib/prioritize";

interface Props {
  insights: MatrixInsightData & { driftCount: number };
}

export function MatrixInsights({ insights }: Props) {
  const q2Accent =
    insights.q2RatioStatus === "red"
      ? "red"
      : insights.q2RatioStatus === "amber"
        ? "red"
        : "green";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        title="Q1 — Do First"
        value={insights.doFirstCount}
        icon={AlertTriangle}
        accent={insights.doFirstCount > 5 ? "red" : "default"}
      />
      <StatCard
        title="Q2 — Schedule"
        value={insights.scheduleCount}
        icon={Target}
        accent="green"
      />
      <StatCard
        title="Q2 Ratio"
        value={`${insights.q2Ratio}%`}
        icon={TrendingUp}
        accent={q2Accent}
        trend={
          insights.q2RatioStatus === "red"
            ? "Below 20% — reactive mode"
            : insights.q2RatioStatus === "amber"
              ? "Below 40% — room to improve"
              : "Healthy strategic balance"
        }
      />
      <StatCard
        title="Drift Alert"
        value={insights.driftCount}
        icon={ArrowUpRight}
        accent={insights.driftCount > 0 ? "red" : "default"}
        trend={insights.driftCount > 0 ? "Likely drifted Q2 → Q1" : "No drift detected"}
      />
    </div>
  );
}
