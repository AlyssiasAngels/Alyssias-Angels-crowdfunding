import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Landmark, ShieldCheck, ArrowLeft, Save } from "lucide-react";

const REQUIRED_FIELDS = ["account_holder_name", "bank_name", "bank_country"];

export default function PayoutMethod() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    account_holder_name: "",
    bank_name: "",
    bank_country: "",
    account_number: "",
    iban: "",
    swift_bic: "",
    routing_number: "",
    bank_address: "",
    reference: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/users/me/bank-details");
        if (data && Object.keys(data).length) {
          setForm((f) => ({ ...f, ...data }));
        }
      } catch {
        /* not fatal */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    for (const k of REQUIRED_FIELDS) {
      if (!form[k]?.trim()) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    if (!form.iban?.trim() && !form.account_number?.trim()) {
      toast.error("Provide at least an IBAN or an account number");
      return;
    }
    setSaving(true);
    try {
      await api.put("/users/me/bank-details", form);
      toast.success("Bank details saved");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12 text-slate-500">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-blue-900 hover:text-emerald-600 inline-flex items-center gap-1 mb-4"
          data-testid="payout-method-back"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
          Payout method
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-2">
          Your bank account
        </h1>
        <p className="text-slate-600 mb-6">
          We use these details every time you request a payout. Saved once,
          attached automatically to each request that lands on the admin desk.
        </p>

        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 flex items-start gap-4" data-testid="payout-info-banner">
          <ShieldCheck className="h-5 w-5 text-blue-700 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Payouts settle in 2–5 business days.</p>
            <p className="text-blue-900/80 mt-1">
              International transfers may take an extra 1–2 business days
              depending on your country and the receiving bank.
            </p>
          </div>
        </div>

        <form
          onSubmit={onSave}
          className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8"
          data-testid="payout-method-form"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Account holder name *"
              testid="bank-holder-name"
              value={form.account_holder_name}
              onChange={set("account_holder_name")}
              placeholder="As it appears on your bank statement"
            />
            <Field
              label="Bank name *"
              testid="bank-name"
              value={form.bank_name}
              onChange={set("bank_name")}
              placeholder="e.g. Wells Fargo, Barclays, ANZ"
            />
            <Field
              label="Bank country *"
              testid="bank-country"
              value={form.bank_country}
              onChange={set("bank_country")}
              placeholder="e.g. United States, United Kingdom"
            />
            <Field
              label="SWIFT / BIC code"
              testid="bank-swift"
              value={form.swift_bic}
              onChange={set("swift_bic")}
              placeholder="e.g. CHASUS33 (required for most international transfers)"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Provide at least one of these
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="IBAN"
                testid="bank-iban"
                value={form.iban}
                onChange={set("iban")}
                placeholder="GB29 NWBK 6016 1331 9268 19"
              />
              <Field
                label="Account number"
                testid="bank-account"
                value={form.account_number}
                onChange={set("account_number")}
                placeholder="Local account number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Routing / sort code"
              testid="bank-routing"
              value={form.routing_number}
              onChange={set("routing_number")}
              placeholder="US ACH routing or UK sort code"
            />
            <Field
              label="Reference (optional)"
              testid="bank-reference"
              value={form.reference}
              onChange={set("reference")}
              placeholder="Any internal reference"
            />
          </div>

          <div>
            <Label htmlFor="bank-address">Bank branch address (optional)</Label>
            <Textarea
              id="bank-address"
              value={form.bank_address}
              onChange={set("bank_address")}
              rows={2}
              placeholder="Street, City, Postal code, Country"
              className="mt-1 rounded-xl"
              data-testid="bank-address-input"
            />
          </div>

          <div className="flex items-center justify-between pt-2 gap-3">
            <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              We never share your bank details with donors — only the admin who
              processes your payout.
            </p>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="bank-save-button"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving…" : "Save bank details"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, testid, value, onChange, placeholder }) {
  return (
    <div>
      <Label htmlFor={testid}>{label}</Label>
      <Input
        id={testid}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 rounded-xl"
        data-testid={`${testid}-input`}
      />
    </div>
  );
}
