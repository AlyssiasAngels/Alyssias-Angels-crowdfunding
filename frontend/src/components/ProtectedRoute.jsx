import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500" data-testid="auth-loading">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.requires_password_change && window.location.pathname !== "/force-password-change") {
    return <Navigate to="/force-password-change" replace />;
  }
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}
