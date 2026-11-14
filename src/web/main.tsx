import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { WorkspaceProvider } from "./api/use-workspace";
import { Layout } from "./components/Layout";
import { CompaniesPage } from "./features/companies/CompaniesPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { NotesPage } from "./features/notes/NotesPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TasksPage } from "./features/tasks/TasksPage";
import "./globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
