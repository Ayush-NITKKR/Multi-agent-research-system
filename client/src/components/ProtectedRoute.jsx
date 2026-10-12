import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Authenticating ResearchAI session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
