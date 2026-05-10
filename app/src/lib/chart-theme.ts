import type { ResolvedTheme } from "@/lib/theme";

export function getChartTheme(theme: ResolvedTheme) {
  const isDark = theme === "dark";
  return {
    axisTick: { fontSize: 11, fill: isDark ? "#8a8f98" : "#6b7280", fontWeight: 510 },
    axisTickSm: { fontSize: 10, fill: isDark ? "#8a8f98" : "#6b7280", fontWeight: 510 },
    axisLine: { stroke: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" },
    grid: { stroke: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", strokeDasharray: "2 4" },
    margin: { top: 5, right: 5, left: -10, bottom: 5 },
    marginWide: { top: 5, right: 20, left: 120, bottom: 5 },
    marginArea: { top: 5, right: 20, left: 20, bottom: 5 },
    cursor: { stroke: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
    cursorFill: { fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
    legend: { fontSize: 12, fontWeight: 510, color: isDark ? "#d0d6e0" : "#3c4049" },
    series: {
      primary: "#5e6ad2",
      secondary: "#27a644",
      tertiary: "#7170ff",
      quaternary: "#828fff",
      warning: "#d97706",
    },
  } as const;
}
