import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Heart } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    const res = await register(fullName, email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate("/dashboard?welcome=1");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="register-logo-link">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
            <Heart className="h-5 w-5 text-emerald-300" strokeWidth={2.5} />
          </span>
          <div className="font-heading font-bold text-2xl text-blue-900">Alyssia&apos;s Angels</div>
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-blue-900 mb-1">Start a campaign</h1>
          <p className="text-sm text-slate-500 mb-6">Create a free account to launch your fundraiser.</p>
          <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
            <div>
              <Label htmlFor="name" className="text-slate-700">Full name</Label>
              <Input
                id="name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="register-name-input"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="register-email-input"
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
                data-testid="register-password-input"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" data-testid="register-error">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="register-submit-button"
            >
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-slate-500 text-center mt-6">
            Already a member?{" "}
            <Link to="/login" className="text-blue-900 font-semibold hover:text-emerald-600" data-testid="register-login-link">
              Log in
            </Link>
          </p>
          <p className="text-xs text-slate-400 text-center mt-3">
            By creating an account, you agree to our{" "}
            <Link
              to="/terms-of-service"
              className="text-blue-900 hover:text-emerald-600 underline"
              data-testid="register-terms-link"
            >
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
