import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, formatApiError, imageUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Upload, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Kyc() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [legalName, setLegalName] = useState("");
  const [docPath, setDocPath] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.kyc_legal_name) setLegalName(user.kyc_legal_name);
  }, [user]);

  const status = user?.kyc_status || "none";

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocPath(data.path);
      setDocPreview(imageUrl(data.url));
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!docPath) return setError("Please upload your ID document");
    if (!legalName.trim()) return setError("Please enter your legal name");
    setSubmitting(true);
    try {
      await api.post("/kyc/submit", { legal_name: legalName, document_path: docPath });
      toast.success("Identity verification submitted");
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
            Identity verification
          </p>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-3">
          Verify your identity
        </h1>
        <p className="text-slate-600 mb-8 max-w-2xl">
          Required before your first payout can be approved. We collect a government-issued
          ID and your legal name. Your information is reviewed by our team and never shared
          publicly.
        </p>

        <KycStatusBanner status={status} reason={user?.kyc_rejection_reason} />

        <form onSubmit={onSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 mt-6" data-testid="kyc-form">
          <div>
            <Label htmlFor="legal">Full legal name</Label>
            <Input
              id="legal"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="As it appears on your ID"
              className="mt-1 rounded-xl"
              required
              data-testid="kyc-legal-name-input"
            />
          </div>

          <div>
            <Label>Government-issued ID (image)</Label>
            <div className="mt-1 flex items-start gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer border border-slate-200 hover:border-emerald-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 bg-white">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : docPath ? "Replace document" : "Upload document"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  className="hidden"
                  data-testid="kyc-document-upload"
                />
              </label>
              {docPreview && (
                <img
                  src={docPreview}
                  alt="ID preview"
                  className="h-20 w-20 rounded-xl object-cover border border-slate-200"
                />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG, or WEBP up to 8MB. Driver&apos;s license, passport, or national ID.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" data-testid="kyc-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
              data-testid="kyc-submit-button"
            >
              {submitting ? "Submitting…" : status === "pending" ? "Resubmit" : "Submit for review"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function KycStatusBanner({ status, reason }) {
  if (status === "verified")
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3" data-testid="kyc-banner-verified">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-800">Verified</p>
          <p className="text-sm text-emerald-700">Your identity has been confirmed. You can now request payouts.</p>
        </div>
      </div>
    );
  if (status === "pending")
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3" data-testid="kyc-banner-pending">
        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800">Under review</p>
          <p className="text-sm text-amber-700">Our team is reviewing your submission. Typically within 1–2 business days.</p>
        </div>
      </div>
    );
  if (status === "rejected")
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3" data-testid="kyc-banner-rejected">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800">Resubmission required</p>
          <p className="text-sm text-red-700">{reason || "Please resubmit with a clearer document."}</p>
        </div>
      </div>
    );
  return null;
}

export { KycStatusBanner };
