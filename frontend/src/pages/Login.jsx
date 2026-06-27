import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Heart } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.user.requires_password_change) {
      navigate("/force-password-change");
    } else if (res.user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="login-logo-link">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
            <Heart className="h-5 w-5 text-emerald-300" strokeWidth={2.5} />
          </span>
          <div className="font-heading font-bold text-2xl text-blue-900">Alyssia&apos;s Angels</div>
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-blue-900 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Log in to manage your campaigns.</p>
          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="login-password-input"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
              data-testid="login-submit-button"
            >
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <p className="text-sm text-slate-500 text-center mt-6">
            New here?{" "}
            <Link to="/register" className="text-blue-900 font-semibold hover:text-emerald-600" data-testid="login-register-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
