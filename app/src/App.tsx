import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { ThisWeekPage } from "./pages/ThisWeekPage";
import { TrendsPage } from "./pages/TrendsPage";
import { ProjectsAreasPage } from "./pages/ProjectsAreasPage";
import { HealthPage } from "./pages/HealthPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PrioritizePage } from "./pages/PrioritizePage";

export function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ThisWeekPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/prioritize" element={<PrioritizePage />} />
        <Route path="/projects" element={<ProjectsAreasPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
