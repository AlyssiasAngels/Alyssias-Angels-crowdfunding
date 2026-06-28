import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, fmtUSD, formatApiError, imageUrl, CATEGORY_IMAGES } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Plus, DollarSign, Wallet, TrendingUp, Send, ShieldCheck, ShieldAlert, Clock as ClockIcon, Mail, MailCheck, Pencil, Share2, Landmark } from "lucide-react";
import { toast } from "sonner";
import ShareDialog from "../components/ShareDialog";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCampaign, setShareCampaign] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, p, b] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/campaigns", { params: { mine: true } }),
        api.get("/payouts/mine"),
        api.get("/users/me/bank-details").catch(() => ({ data: {} })),
      ]);
      setSummary(s.data);
      setCampaigns(c.data);
      setPayouts(p.data);
      setBankDetails(b.data && Object.keys(b.data).length ? b.data : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPayout = (c) => {
    if (!bankDetails || !bankDetails.account_holder_name) {
      toast.error("Please save your bank details first");
      // We don't navigate; the BankDetailsBanner above already has the CTA.
      return;
    }
    setSelected(c);
    setAmount(String(c.available_for_payout || 0));
    setPayoutOpen(true);
  };

  const openShare = (c) => {
    setShareCampaign(c);
    setShareOpen(true);
  };

  const submitPayout = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post("/payouts/request", {
        campaign_id: selected.id,
        amount_requested: Number(amount),
        payout_method: "bank",
      });
      toast.success("Payout request submitted â€” admin will process in 2â€“5 business days");
      setPayoutOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
              Fundraiser dashboard
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight">
              Your campaigns
            </h1>
          </div>
          <Button
            asChild
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="dashboard-create-campaign-button"
          >
            <Link to="/campaigns/new">
              <Plus className="h-4 w-4 mr-1.5" /> New campaign
            </Link>
          </Button>
        </div>

        <EmailVerifyBanner user={user} />
        <KycBanner user={user} />
        <BankDetailsBanner bankDetails={bankDetails} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Stat
            icon={<DollarSign className="h-4 w-4" />}
            label="Amount raised"
            sublabel="Total donated (gross)"
            value={fmtUSD(summary?.gross_total)}
            testid="stat-gross"
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Net earned"
            sublabel="After 13% fee"
            value={fmtUSD(summary?.net_total)}
            testid="stat-net"
          />
          <Stat
            icon={<Wallet className="h-4 w-4" />}
            label="Available to withdraw"
            sublabel="Since last payout"
            value={fmtUSD(summary?.available_for_payout)}
            accent
            testid="stat-available"
          />
          <Stat
            icon={<Send className="h-4 w-4" />}
            label="Pending payouts"
            value={summary?.pending_payouts ?? 0}
            testid="stat-pending"
          />
        </div>

        {/* Campaigns list */}
        <h2 className="font-heading text-xl font-semibold text-blue-900 mb-4">Campaigns</h2>
        {loading ? (
          <div className="text-slate-500">Loadingâ€¦</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center" data-testid="dashboard-empty">
            <p className="text-slate-600 mb-4">You haven&apos;t created any campaigns yet.</p>
            <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link to="/campaigns/new">Start your first campaign</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {campaigns.map((c) => {
              const pct = Math.min(
                100,
                (Number(c.current_balance_gross || 0) / Number(c.goal_amount || 1)) * 100
              );
              const img = imageUrl(c.image_url) || CATEGORY_IMAGES[c.category];
              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                  data-testid={`my-campaign-${c.id}`}
                >
                  <div className="flex">
                    <div className="w-32 h-32 bg-slate-100 shrink-0">
                      <img src={img} alt={c.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/campaigns/${c.id}`}
                          className="font-heading font-semibold text-slate-900 hover:text-blue-900 line-clamp-1"
                        >
                          {c.title}
                        </Link>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{c.category}</p>
                      <Progress
                        value={pct}
                        className="h-2 mt-3 bg-slate-100 [&>div]:bg-emerald-500"
                      />
                      <div className="flex justify-between text-xs text-slate-600 mt-1.5">
                        <span>{fmtUSD(c.current_balance_gross)}</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/50">
                    <div className="text-xs">
                      <p className="text-slate-500">Available for payout</p>
                      <p className="font-heading font-bold text-emerald-700 text-base">
                        {fmtUSD(c.available_for_payout)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/campaigns/${c.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-900 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-950 rounded-lg px-3 py-2 transition-colors"
                        data-testid={`edit-campaign-${c.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => openShare(c)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-lg px-3 py-2 transition-colors"
                        data-testid={`share-campaign-${c.id}`}
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </button>
                      <Button
                        size="sm"
                        onClick={() => openPayout(c)}
                        disabled={(c.available_for_payout || 0) <= 0}
                        className="rounded-lg bg-blue-900 hover:bg-blue-950 text-white"
                        data-testid={`request-payout-${c.id}`}
                      >
                        Request payout
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Payouts */}
        <h2 className="font-heading text-xl font-semibold text-blue-900 mb-4 mt-12">Payout history</h2>
        {payouts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500" data-testid="payouts-empty">
            No payout requests yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-96">
              <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Campaign</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" data-testid="payouts-table-body">
                {payouts.map((p) => (
                  <tr key={p.payout_id}>
                    <td className="px-4 py-3 text-slate-900">{p.campaign_title}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {p.payout_method === "paypal" ? (
                        <span>PayPal Â· {p.payout_paypal_email}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Landmark className="h-3.5 w-3.5 text-blue-700" />
                          Bank transfer
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtUSD(p.amount_requested)}</td>
                    <td className="px-4 py-3"><PayoutStatusBadge status={p.payout_status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(p.requested_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>

      {/* Payout Dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="rounded-2xl" data-testid="payout-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-blue-900">Request payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <p className="text-slate-500 text-xs">Available</p>
              <p className="font-heading font-bold text-emerald-700 text-lg">
                {fmtUSD(selected?.available_for_payout)}
              </p>
            </div>
            <div>
              <Label htmlFor="amount">Amount to withdraw</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="payout-amount-input"
              />
            </div>
            {bankDetails && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm" data-testid="payout-bank-summary">
                <p className="font-semibold text-blue-900 inline-flex items-center gap-1.5">
                  <Landmark className="h-4 w-4" /> Sending to your bank
                </p>
                <p className="text-blue-900/90 mt-1">
                  {bankDetails.bank_name} â€” {bankDetails.bank_country}
                </p>
                <p className="text-xs text-blue-900/70 mt-0.5">
                  {bankDetails.iban
                    ? `IBAN ending ${bankDetails.iban.replace(/\s/g, "").slice(-4)}`
                    : bankDetails.account_number
                    ? `Acct ending ${bankDetails.account_number.slice(-4)}`
                    : "Account on file"}
                </p>
                <Link
                  to="/payout-method"
                  className="text-xs font-medium text-blue-900 hover:text-emerald-700 underline mt-2 inline-block"
                  data-testid="payout-bank-edit-link"
                >
                  Edit bank details
                </Link>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Approved payouts settle in <span className="font-semibold">2â€“5 business days</span>.
              International transfers may take 1â€“2 days longer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutOpen(false)}
              className="rounded-xl"
              data-testid="payout-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={submitPayout}
              disabled={submitting || !amount}
              className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
              data-testid="payout-submit-button"
            >
              {submitting ? "Submittingâ€¦" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        campaign={shareCampaign}
      />
    </div>
  );
}

function BankDetailsBanner({ bankDetails }) {
  if (bankDetails && bankDetails.account_holder_name) {
    return (
      <div
        className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-start gap-3"
        data-testid="dashboard-bank-saved-banner"
      >
        <Landmark className="h-5 w-5 text-emerald-700 mt-0.5" />
        <div className="flex-1 text-sm min-w-0">
          <p className="font-semibold text-emerald-900">
            Bank payouts set up
          </p>
          <p className="text-emerald-900/80 truncate">
            {bankDetails.bank_name} Â· {bankDetails.bank_country} Â·{" "}
            {bankDetails.iban
              ? `IBAN ending ${bankDetails.iban.replace(/\s/g, "").slice(-4)}`
              : `Acct ending ${(bankDetails.account_number || "").slice(-4)}`}
          </p>
        </div>
        <Link
          to="/payout-method"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 shrink-0"
          data-testid="dashboard-bank-edit-link"
        >
          Edit
        </Link>
      </div>
    );
  }
  return (
    <div
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4"
      data-testid="dashboard-bank-missing-banner"
    >
      <Landmark className="h-5 w-5 text-amber-700 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-amber-900">
          Add your bank details to receive payouts
        </p>
        <p className="text-sm mt-1 text-amber-800">
          We send international bank transfers â€” settles in 2â€“5 business days.
          Saved once, attached automatically to every payout request.
        </p>
      </div>
      <Button
        asChild
        className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white shrink-0"
        data-testid="dashboard-bank-add-button"
      >
        <Link to="/payout-method">Set up bank</Link>
      </Button>
    </div>
  );
}

function Stat({ icon, label, sublabel, value, accent, testid }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-200"
      }`}
      data-testid={testid}
    >
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${accent ? "text-emerald-700" : "text-slate-500"} mb-2`}>
        {icon}
        {label}
      </div>
      <p className="font-heading text-2xl font-bold text-blue-900">{value}</p>
      {sublabel && (
        <p className={`text-[11px] mt-1 ${accent ? "text-emerald-700/80" : "text-slate-500"}`}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Pending: "bg-amber-50 text-amber-700 border-amber-100",
    Paused: "bg-slate-100 text-slate-700 border-slate-200",
    Completed: "bg-blue-50 text-blue-700 border-blue-100",
  };
  return (
    <Badge className={`${map[status] || map.Pending} border rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider`}>
      {status}
    </Badge>
  );
}

function PayoutStatusBadge({ status }) {
  const map = {
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-blue-50 text-blue-700",
    Paid: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

function EmailVerifyBanner({ user }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.role !== "fundraiser") return null;
  if (user.email_verified) return null;
  const onResend = async () => {
    setSending(true);
    try {
      await api.post("/auth/resend-verification", { email: user.email });
      setSent(true);
      toast.success("Verification email sent");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(false);
    }
  };
  return (
    <div
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4"
      data-testid="email-verify-banner"
    >
      <div className="mt-0.5">
        {sent ? <MailCheck className="h-5 w-5 text-emerald-600" /> : <Mail className="h-5 w-5 text-amber-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-amber-900">
          Confirm your email address
        </p>
        <p className="text-sm mt-1 text-amber-800">
          We sent a verification link to <strong>{user.email}</strong>. You can&apos;t create campaigns,
          post updates, or request payouts until your email is verified.
        </p>
        {sent && (
          <p className="text-xs mt-2 text-emerald-700" data-testid="email-verify-resent-msg">
            New verification email sent. Please check your inbox and spam folder.
          </p>
        )}
      </div>
      <Button
        onClick={onResend}
        disabled={sending}
        className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white shrink-0"
        data-testid="email-verify-resend-button"
      >
        {sending ? "Sendingâ€¦" : "Resend email"}
      </Button>
    </div>
  );
}

function KycBanner({ user }) {
  if (!user) return null;
  // Hide KYC banner until email is verified to avoid noise
  if (user.email_verified === false) return null;
  const s = user.kyc_status || "none";
  if (s === "verified") return null;
  const cfg = {
    none: {
      icon: <ShieldAlert className="h-5 w-5 text-amber-600" />,
      title: "Verify your identity to enable payouts",
      body: "Upload a government-issued ID and your legal name. We review submissions within 1â€“2 business days.",
      cta: "Verify identity",
      tone: "bg-amber-50 border-amber-200",
      titleColor: "text-amber-900",
      bodyColor: "text-amber-800",
    },
    pending: {
      icon: <ClockIcon className="h-5 w-5 text-blue-700" />,
      title: "Identity verification under review",
      body: "We'll notify you by email once review is complete. You can still create campaigns and request payouts in the meantime â€” approvals require verification.",
      cta: "View status",
      tone: "bg-blue-50 border-blue-200",
      titleColor: "text-blue-900",
      bodyColor: "text-blue-800",
    },
    rejected: {
      icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
      title: "Identity verification needs attention",
      body: user.kyc_rejection_reason || "Please resubmit with a clearer document.",
      cta: "Resubmit",
      tone: "bg-red-50 border-red-200",
      titleColor: "text-red-900",
      bodyColor: "text-red-800",
    },
  };
  const c = cfg[s] || cfg.none;
  return (
    <div className={`mb-8 rounded-2xl border p-5 flex items-start gap-4 ${c.tone}`} data-testid="dashboard-kyc-banner">
      <div className="mt-0.5">{c.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-heading font-semibold ${c.titleColor}`}>{c.title}</p>
        <p className={`text-sm mt-1 ${c.bodyColor}`}>{c.body}</p>
      </div>
      <Button asChild className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white shrink-0" data-testid="dashboard-kyc-cta">
        <Link to="/kyc">{c.cta}</Link>
      </Button>
    </div>
  );
}



