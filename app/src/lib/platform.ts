export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

export type IOSPushState = "not-ios" | "needs-install" | "ready" | "unsupported";

export function getIOSPushState(): IOSPushState {
  if (!isIOSDevice()) return "not-ios";
  if (!isStandaloneMode()) return "needs-install";
  if ("PushManager" in window) return "ready";
  return "unsupported";
}
