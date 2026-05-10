import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { isPushSupported } from "@/lib/push";
import { Sidebar } from "./Sidebar";
import { IconRail } from "./IconRail";
import { BottomTabBar } from "./BottomTabBar";
import { MobileSidebar } from "./MobileSidebar";
import { Header } from "./Header";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { Button } from "@/components/ui/Button";

const PUSH_PROMPT_KEY = "push-prompt-dismissed";

function PushPromptCard({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />
      <div className="relative mx-4 mb-4 sm:mb-0 w-full max-w-[360px] rounded-[8px] border border-border bg-surface-panel p-5 shadow-lg">
        <p className="text-[14px] font-[510] text-foreground mb-1">Enable Notifications</p>
        <p className="text-[13px] text-foreground-secondary mb-4">
          Enable notifications for deadline reminders and sync alerts?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Not now
          </Button>
          <Button variant="primary" size="sm" onClick={onEnable}>
            Enable
          </Button>
        </div>
      </div>
    </div>
  );
}

function PushOnboardingPrompt() {
  const { isMobile } = useBreakpoint();
  const { subscribe } = usePushNotifications();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      isPushSupported() &&
      Notification.permission === "default" &&
      !localStorage.getItem(PUSH_PROMPT_KEY)
    ) {
      setShow(true);
    }
  }, []);

  const handleEnable = useCallback(async () => {
    setShow(false);
    localStorage.setItem(PUSH_PROMPT_KEY, "1");
    await subscribe();
  }, [subscribe]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(PUSH_PROMPT_KEY, "1");
  }, []);

  if (!show) return null;

  if (isMobile) {
    return (
      <BottomSheet open={show} onClose={handleDismiss} title="Enable Notifications">
        <p className="text-[13px] text-foreground-secondary mb-4">
          Enable notifications for deadline reminders and sync alerts?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button variant="primary" size="sm" onClick={handleEnable}>
            Enable
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return <PushPromptCard onEnable={handleEnable} onDismiss={handleDismiss} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Desktop: full sidebar */}
      {isDesktop && <Sidebar />}

      {/* Tablet: icon rail */}
      {isTablet && <IconRail />}

      {/* Mobile: overlay sidebar */}
      {isMobile && (
        <MobileSidebar open={sidebarOpen} onClose={closeSidebar} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          showMenu={isMobile}
          onMenuClick={openSidebar}
        />
        <main
          className={
            "flex-1 overflow-y-auto " +
            (isMobile
              ? "px-4 py-4 pb-[var(--tab-bar-height)]"
              : isTablet
                ? "px-6 py-6"
                : "px-8 py-8")
          }
        >
          <div className="mx-auto max-w-[1200px] 3xl:max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile: bottom tab bar */}
      {isMobile && <BottomTabBar />}

      {/* Push notification onboarding prompt */}
      <PushOnboardingPrompt />
    </div>
  );
}
