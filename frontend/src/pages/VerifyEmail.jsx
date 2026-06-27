import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Heart, CheckCircle2, AlertCircle, MailCheck, Loader2 } from "lucide-react";

// Module-level cache of tokens we've already started verifying. This makes the
// verify call truly fire-once even across React StrictMode double-mounts or
// repeated navigations to the same URL within one session.
const processedTokens = new Set();

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [status, setStatus] = useState(token ? "verifying" : "manual"); // verifying | success | error | manual
  const [error, setError] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (calledRef.current) return;
    if (processedTokens.has(token)) {
      // Another mount already kicked off verification; the success/error state
      // will be reflected when the in-flight promise resolves. Just wait.
      return;
    }
    calledRef.current = true;
    processedTokens.add(token);
    api
      .post(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async () => {
        setStatus("success");
        try { await refresh(); } catch { /* ignore */ }
      })
      .catch((e) => {
        setStatus("error");
        setError(formatApiError(e));
      });
  }, [token, refresh]);

  const submitResend = async (e) => {
    e.preventDefault();
    setResendSubmitting(true);
    try {
      await api.post("/auth/resend-verification", { email: resendEmail });
      setResendDone(true);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setResendSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="verify-logo-link">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
            <Heart className="h-5 w-5 text-emerald-300" strokeWidth={2.5} />
          </span>
          <div className="font-heading font-bold text-2xl text-blue-900">Alyssia&apos;s Angels</div>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm" data-testid="verify-card">
          {status === "verifying" && (
            <div className="text-center py-6" data-testid="verify-loading">
              <Loader2 className="h-10 w-10 mx-auto text-blue-900 animate-spin" />
              <h1 className="font-heading text-2xl font-semibold text-blue-900 mt-4">Verifying your email…</h1>
              <p className="text-sm text-slate-500 mt-2">Hang tight, this only takes a moment.</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-4" data-testid="verify-success">
              <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="font-heading text-2xl font-semibold text-blue-900 mt-4">Email verified</h1>
              <p className="text-sm text-slate-600 mt-2">
                Your fundraiser account is now fully activated. You can create campaigns,
                post updates with photos, and request payouts.
              </p>
              <div className="mt-6 grid gap-2">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="verify-go-dashboard"
                >
                  Go to dashboard
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl"
                  data-testid="verify-explore"
                >
                  <Link to="/discover">Browse campaigns</Link>
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4" data-testid="verify-error">
              <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <h1 className="font-heading text-2xl font-semibold text-blue-900 mt-4">Verification failed</h1>
              <p className="text-sm text-slate-600 mt-2" data-testid="verify-error-msg">
                {error || "This verification link is invalid or has expired."}
              </p>
              <p className="text-sm text-slate-500 mt-4">Request a new verification email below.</p>
            </div>
          )}

          {(status === "manual" || status === "error") && !resendDone && (
            <form onSubmit={submitResend} className="mt-6 space-y-4" data-testid="resend-form">
              <div>
                <Label htmlFor="resend-email" className="text-slate-700">Your email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 rounded-xl"
                  data-testid="resend-email-input"
                />
              </div>
              <Button
                type="submit"
                disabled={resendSubmitting}
                className="w-full rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
                data-testid="resend-submit-button"
              >
                {resendSubmitting ? "Sending…" : "Resend verification email"}
              </Button>
            </form>
          )}

          {resendDone && (
            <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3" data-testid="resend-success">
              <MailCheck className="h-5 w-5 text-emerald-700 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Email sent</p>
                <p className="text-xs text-emerald-800 mt-1">
                  If an account exists for {resendEmail}, a fresh verification link has been sent.
                  Check your inbox (and spam folder).
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-500 text-center mt-6">
            <Link to="/login" className="text-blue-900 font-semibold hover:text-emerald-600" data-testid="verify-login-link">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
