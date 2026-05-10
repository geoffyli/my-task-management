import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getChartTheme } from "@/lib/chart-theme";
import { getTooltipStyle } from "@/lib/constants";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => getChartTheme(resolvedTheme), [resolvedTheme]);
  const tooltipStyle = useMemo(() => getTooltipStyle(resolvedTheme), [resolvedTheme]);
  return { chartTheme, tooltipStyle };
}
