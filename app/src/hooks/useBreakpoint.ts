import { useSyncExternalStore } from "react";

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

const BREAKPOINTS: [Breakpoint, number][] = [
  ["3xl", 1920],
  ["2xl", 1536],
  ["xl", 1280],
  ["lg", 1024],
  ["md", 768],
  ["sm", 640],
  ["base", 0],
];

function getBreakpoint(): Breakpoint {
  const width = window.innerWidth;
  for (const [name, min] of BREAKPOINTS) {
    if (width >= min) return name;
  }
  return "base";
}

let cachedBreakpoint: Breakpoint = typeof window !== "undefined" ? getBreakpoint() : "base";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    const newBreakpoint = getBreakpoint();
    if (newBreakpoint !== cachedBreakpoint) {
      cachedBreakpoint = newBreakpoint;
      listeners.forEach((l) => l());
    }
  });
}

function getSnapshot() {
  return cachedBreakpoint;
}

function getServerSnapshot(): Breakpoint {
  return "base";
}

export function useBreakpoint() {
  const breakpoint = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    breakpoint,
    isMobile: breakpoint === "base" || breakpoint === "sm",
    isTablet: breakpoint === "md",
    isDesktop: breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl" || breakpoint === "3xl",
    isWide: breakpoint === "3xl",
  };
}
