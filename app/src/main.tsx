import { StrictMode, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { App } from "./App";
import "./app.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", textAlign: "center", color: "#ccc" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => registerSW({ immediate: true }));
}
