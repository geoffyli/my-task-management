import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { ThisWeekPage } from "./pages/ThisWeekPage";
import { LoadingState } from "./components/shared/LoadingState";
import { PageTransition } from "./components/shared/PageTransition";

const TrendsPage = lazy(() => import("./pages/TrendsPage").then((m) => ({ default: m.TrendsPage })));
const PrioritizePage = lazy(() => import("./pages/PrioritizePage").then((m) => ({ default: m.PrioritizePage })));
const ProjectsAreasPage = lazy(() => import("./pages/ProjectsAreasPage").then((m) => ({ default: m.ProjectsAreasPage })));
const HealthPage = lazy(() => import("./pages/HealthPage").then((m) => ({ default: m.HealthPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

export function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <PageTransition locationKey={location.pathname}>
        <Suspense fallback={<LoadingState variant="page" />}>
          <Routes location={location}>
            <Route path="/" element={<ThisWeekPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/prioritize" element={<PrioritizePage />} />
            <Route path="/projects" element={<ProjectsAreasPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
