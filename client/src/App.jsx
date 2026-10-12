import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";

import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { ResearchExecution } from "./pages/ResearchExecution";
import { ReportViewer } from "./pages/ReportViewer";
import { History } from "./pages/History";
import { SystemStatus } from "./pages/SystemStatus";

const AuthenticatedLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      {React.cloneElement(children, { onMenuClick: () => setIsMobileOpen(!isMobileOpen) })}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              }
            />
            <Route
              path="/research/:id"
              element={
                <AuthenticatedLayout>
                  <ResearchExecution />
                </AuthenticatedLayout>
              }
            />
            <Route
              path="/research/:id/report"
              element={
                <AuthenticatedLayout>
                  <ReportViewer />
                </AuthenticatedLayout>
              }
            />
            <Route
              path="/history"
              element={
                <AuthenticatedLayout>
                  <History />
                </AuthenticatedLayout>
              }
            />
            <Route
              path="/status"
              element={
                <AuthenticatedLayout>
                  <SystemStatus />
                </AuthenticatedLayout>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
