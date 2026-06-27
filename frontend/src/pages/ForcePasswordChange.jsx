import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ShieldCheck } from "lucide-react";

export default function ForcePasswordChange() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters");
    if (newPassword !== confirm) return setError("New passwords don't match");
    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await refresh();
      navigate(user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-xl font-semibold text-blue-900">Update your password</h1>
              <p className="text-xs text-slate-500">Required before accessing the dashboard</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            You are using a default password. Please choose a new secure password to continue.
          </p>
          <form onSubmit={onSubmit} className="space-y-4" data-testid="force-change-form">
            <div>
              <Label htmlFor="cur" className="text-slate-700">Current password</Label>
              <Input
                id="cur"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="force-change-current-input"
              />
            </div>
            <div>
              <Label htmlFor="new" className="text-slate-700">New password</Label>
              <Input
                id="new"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="force-change-new-input"
              />
            </div>
            <div>
              <Label htmlFor="confirm" className="text-slate-700">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="force-change-confirm-input"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" data-testid="force-change-error">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
              data-testid="force-change-submit-button"
            >
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
