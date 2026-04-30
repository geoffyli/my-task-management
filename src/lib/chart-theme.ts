export const CHART_THEME = {
  axisTick: { fontSize: 11, fill: "#8a8f98", fontWeight: 510 },
  axisTickSm: { fontSize: 10, fill: "#8a8f98", fontWeight: 510 },
  axisLine: { stroke: "rgba(255,255,255,0.05)" },
  grid: { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "2 4" },
  margin: { top: 5, right: 5, left: -10, bottom: 5 },
  marginWide: { top: 5, right: 20, left: 120, bottom: 5 },
  marginArea: { top: 5, right: 20, left: 20, bottom: 5 },
  cursor: { stroke: "rgba(255,255,255,0.1)" },
  cursorFill: { fill: "rgba(255,255,255,0.03)" },
  legend: { fontSize: 12, fontWeight: 510, color: "#d0d6e0" },
  series: {
    primary: "#5e6ad2",
    secondary: "#27a644",
    tertiary: "#7170ff",
    quaternary: "#828fff",
    warning: "#d97706",
  },
} as const;
