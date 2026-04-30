import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ThisWeekPage } from "./pages/ThisWeekPage";
import { TrendsPage } from "./pages/TrendsPage";
import { ProjectsAreasPage } from "./pages/ProjectsAreasPage";
import { AdminPage } from "./pages/AdminPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ThisWeekPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/projects" element={<ProjectsAreasPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
