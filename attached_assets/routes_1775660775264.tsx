import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { AuthPage } from "./components/AuthPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomeDashboard } from "./components/HomeDashboard";
import { KnowledgeCapture } from "./components/KnowledgeCapture";
import { CaptureOverview } from "./components/CaptureOverview";
import { Dashboard } from "./components/Dashboard";
import { AIAssistant } from "./components/AIAssistant";
import { MemoryTimeline } from "./components/MemoryTimeline";
import { KnowledgeGraph } from "./components/KnowledgeGraph";
import { ProjectWorkspace } from "./components/ProjectWorkspace";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { Settings } from "./components/Settings";

function NotFound() {
  return <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  // Public routes
  { path: "/",     Component: LandingPage },
  { path: "/auth", Component: AuthPage },

  // Protected app routes
  {
    path: "/app",
    Component: ProtectedRoute,
    children: [
      {
        Component: Layout,
        children: [
          { index: true,       Component: HomeDashboard },
          { path: "capture",   Component: KnowledgeCapture },
          { path: "captures",  Component: CaptureOverview },
          { path: "assistant", Component: AIAssistant },
          { path: "insights",  Component: Dashboard },
          { path: "timeline",  Component: MemoryTimeline },
          { path: "graph",     Component: KnowledgeGraph },
          { path: "workspace", Component: ProjectWorkspace },
          { path: "privacy",   Component: PrivacyPanel },
          { path: "settings",  Component: Settings },
        ],
      },
    ],
  },

  // Catch-all
  { path: "*", Component: NotFound },
]);
