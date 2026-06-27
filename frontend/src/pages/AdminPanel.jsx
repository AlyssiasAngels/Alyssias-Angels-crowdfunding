import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { api, fmtUSD, formatApiError, BACKEND_URL, imageUrl } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { DollarSign, ShieldCheck, Users, Send, Building2, Activity, FileDown, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [kyc, setKyc] = useState([]);
  const [loading, setLoading] = useState(true);

  // Log donation form
  const [donationCampaign, setDonationCampaign] = useState("");
  const [donorName, setDonorName] = useState("");
  const [grossAmount, setGrossAmount] = useState("");

  // PayPal URL dialog
  const [pyDialogOpen, setPyDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [paypalUrl, setPaypalUrl] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("Active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, p, t, k] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/campaigns"),
        api.get("/admin/payouts"),
        api.get("/admin/transactions"),
        api.get("/admin/kyc"),
      ]);
      setStats(s.data);
      setCampaigns(c.data);
      setPayouts(p.data);
      setTxs(t.data);
      setKyc(k.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logDonation = async (e) => {
    e.preventDefault();
    if (!donationCampaign) return toast.error("Choose a campaign");
    try {
      await api.post("/admin/donations/log", {
        campaign_id: donationCampaign,
        donor_name: donorName || "Anonymous",
        gross_amount: Number(grossAmount),
      });
      toast.success("Donation logged");
      setDonorName("");
      setGrossAmount("");
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const openPayPalDialog = (c) => {
    setSelectedCampaign(c);
    setPaypalUrl(c.paypal_button_url || "");
    setCampaignStatus(c.status === "Pending" ? "Active" : c.status);
    setPyDialogOpen(true);
  };

  const savePayPal = async () => {
    try {
      await api.post(`/admin/campaigns/${selectedCampaign.id}/paypal`, {
        paypal_button_url: paypalUrl,
        status: campaignStatus,
      });
      toast.success("Campaign updated");
      setPyDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const decidePayout = async (payout_id, decision) => {
    try {
      await api.post("/admin/payouts/decision", { payout_id, decision });
      toast.success(`Payout ${decision}`);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const reviewKyc = async (user_id, decision, rejection_reason = null) => {
    try {
      await api.post("/admin/kyc/review", { user_id, decision, rejection_reason });
      toast.success(`Identity ${decision}`);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const downloadCsv = async (kind) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/admin/export/${kind}.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${kind}.csv downloaded`);
    } catch (e) {
      toast.error(e.message || "Export failed");
    }
  };

  const pendingKyc = kyc.filter((u) => u.kyc_status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
            Admin control room
          </p>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-8">
          Platform overview
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={<DollarSign />} label="Gross donations" value={fmtUSD(stats?.gross)} testid="admin-stat-gross" />
          <StatCard icon={<Activity />} label="Platform fees (13%)" value={fmtUSD(stats?.platform_profit)} accent testid="admin-stat-profit" />
          <StatCard icon={<Building2 />} label="Active campaigns" value={stats?.campaigns_count ?? 0} testid="admin-stat-campaigns" />
          <StatCard icon={<Users />} label="Users" value={stats?.users_count ?? 0} testid="admin-stat-users" />
        </div>

        <Tabs defaultValue="log" className="w-full">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1" data-testid="admin-tabs">
            <TabsTrigger value="log" className="rounded-lg" data-testid="tab-log">Log donation</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-lg" data-testid="tab-campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-lg" data-testid="tab-payouts">
              Payouts{stats?.pending_payouts ? ` (${stats.pending_payouts})` : ""}
            </TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-lg" data-testid="tab-kyc">
              KYC{pendingKyc ? ` (${pendingKyc})` : ""}
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-lg" data-testid="tab-ledger">Ledger</TabsTrigger>
          </TabsList>

          {/* Log donation */}
          <TabsContent value="log" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 max-w-2xl">
              <h2 className="font-heading text-xl font-semibold text-blue-900 mb-4">
                Log a PayPal donation
              </h2>
              <form onSubmit={logDonation} className="space-y-4" data-testid="log-donation-form">
                <div>
                  <Label>Campaign</Label>
                  <Select value={donationCampaign} onValueChange={setDonationCampaign}>
                    <SelectTrigger className="mt-1 rounded-xl" data-testid="log-campaign-select">
                      <SelectValue placeholder="— Select campaign —" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} · {c.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="donor">Donor name (optional)</Label>
                    <Input
                      id="donor"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Anonymous"
                      className="mt-1 rounded-xl"
                      data-testid="log-donor-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gross">Gross amount (USD)</Label>
                    <Input
                      id="gross"
                      type="number"
                      step="0.01"
                      min="5"
                      required
                      value={grossAmount}
                      onChange={(e) => setGrossAmount(e.target.value)}
                      placeholder="100.00"
                      className="mt-1 rounded-xl"
                      data-testid="log-gross-amount-input"
                    />
                    <p className="text-xs text-slate-500 mt-1">Minimum $5</p>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="log-submit-button"
                >
                  Log donation
                </Button>
              </form>

              {grossAmount && Number(grossAmount) >= 5 && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
                  <FeePreview gross={Number(grossAmount)} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Campaigns */}
          <TabsContent value="campaigns" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Owner</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-right px-4 py-3">Raised</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">PayPal</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" data-testid="admin-campaigns-table">
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                      <td className="px-4 py-3 text-slate-600">{c.creator_name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.category}</td>
                      <td className="px-4 py-3 text-right">{fmtUSD(c.current_balance_gross)}</td>
                      <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                      <td className="px-4 py-3 text-xs">
                        {c.paypal_button_url ? (
                          <a href={c.paypal_button_url} target="_blank" rel="noreferrer" className="text-blue-700 underline truncate inline-block max-w-[200px]">
                            {c.paypal_button_url}
                          </a>
                        ) : (
                          <span className="text-amber-600">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPayPalDialog(c)}
                          className="rounded-lg"
                          data-testid={`assign-paypal-${c.id}`}
                        >
                          {c.paypal_button_url ? "Edit" : "Assign PayPal"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && !loading && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No campaigns yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts" className="mt-6">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv("payouts")}
                className="rounded-xl"
                data-testid="export-payouts-button"
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Campaign</th>
                    <th className="text-left px-4 py-3">Destination</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" data-testid="admin-payouts-table">
                  {payouts.map((p) => {
                    const userKyc = kyc.find((u) => u.id === p.user_id);
                    const verified = userKyc?.identity_verified;
                    return (
                    <tr key={p.payout_id} className="align-top">
                      <td className="px-4 py-3 text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{p.user_name || p.user_email}</span>
                          {verified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded" data-testid={`payout-verified-${p.payout_id}`}>
                              <ShieldCheck className="h-2.5 w-2.5" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" data-testid={`payout-unverified-${p.payout_id}`}>
                              <ShieldAlert className="h-2.5 w-2.5" /> Not verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{p.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.campaign_title}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs" data-testid={`payout-destination-${p.payout_id}`}>
                        <PayoutDestination payout={p} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtUSD(p.amount_requested)}</td>
                      <td className="px-4 py-3"><PayoutStatusPill status={p.payout_status} /></td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {p.payout_status === "Pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => decidePayout(p.payout_id, "Approved")}
                              className="rounded-lg bg-blue-900 hover:bg-blue-950 text-white"
                              data-testid={`approve-payout-${p.payout_id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => decidePayout(p.payout_id, "Rejected")}
                              className="rounded-lg"
                              data-testid={`reject-payout-${p.payout_id}`}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {p.payout_status === "Approved" && (
                          <Button
                            size="sm"
                            onClick={() => decidePayout(p.payout_id, "Paid")}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            data-testid={`mark-paid-${p.payout_id}`}
                          >
                            <Send className="h-3 w-3 mr-1" /> Mark paid
                          </Button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {payouts.length === 0 && !loading && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No payout requests.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* KYC */}
          <TabsContent value="kyc" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Legal name</th>
                    <th className="text-left px-4 py-3">Document</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" data-testid="admin-kyc-table">
                  {kyc.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{u.kyc_legal_name || "—"}</td>
                      <td className="px-4 py-3">
                        {u.kyc_document_path ? (
                          <a
                            href={imageUrl(u.kyc_document_path)}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`kyc-doc-link-${u.id}`}
                          >
                            <img
                              src={imageUrl(u.kyc_document_path)}
                              alt="ID"
                              className="h-12 w-16 object-cover rounded-lg border border-slate-200"
                            />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">No document</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <KycStatusPill status={u.kyc_status} />
                        {u.kyc_status === "rejected" && u.kyc_rejection_reason && (
                          <p className="text-[11px] text-red-600 mt-1 max-w-[200px]">{u.kyc_rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {u.kyc_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => reviewKyc(u.id, "verified")}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                              data-testid={`kyc-verify-${u.id}`}
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = window.prompt("Reason for rejection (shared with user):");
                                if (reason !== null) reviewKyc(u.id, "rejected", reason || "Document unclear. Please resubmit.");
                              }}
                              className="rounded-lg"
                              data-testid={`kyc-reject-${u.id}`}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {u.kyc_status === "verified" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm("Revoke verification?")) {
                                reviewKyc(u.id, "rejected", "Verification revoked by admin");
                              }
                            }}
                            className="rounded-lg"
                            data-testid={`kyc-revoke-${u.id}`}
                          >
                            Revoke
                          </Button>
                        )}
                        {u.kyc_status === "rejected" && (
                          <Button
                            size="sm"
                            onClick={() => reviewKyc(u.id, "verified")}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            data-testid={`kyc-reverify-${u.id}`}
                          >
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {kyc.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No KYC submissions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>


          {/* Ledger */}
          <TabsContent value="ledger" className="mt-6">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv("ledger")}
                className="rounded-xl"
                data-testid="export-ledger-button"
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Donor</th>
                    <th className="text-left px-4 py-3">Campaign</th>
                    <th className="text-right px-4 py-3">Gross</th>
                    <th className="text-right px-4 py-3">Fee (13%)</th>
                    <th className="text-right px-4 py-3">Net (87%)</th>
                    <th className="text-left px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" data-testid="admin-ledger-table">
                  {txs.map((t) => {
                    const c = campaigns.find((cc) => cc.id === t.campaign_id);
                    return (
                      <tr key={t.transaction_id}>
                        <td className="px-4 py-3">{t.donor_name}</td>
                        <td className="px-4 py-3 text-slate-600">{c?.title || t.campaign_id}</td>
                        <td className="px-4 py-3 text-right font-semibold">{fmtUSD(t.gross_amount)}</td>
                        <td className="px-4 py-3 text-right text-rose-600">−{fmtUSD(t.platform_fee_deducted)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{fmtUSD(t.fundraiser_share)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.timestamp).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {txs.length === 0 && !loading && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No donations logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Assign PayPal Dialog */}
      <Dialog open={pyDialogOpen} onOpenChange={setPyDialogOpen}>
        <DialogContent className="rounded-2xl" data-testid="paypal-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-blue-900">Assign PayPal link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Campaign: <span className="font-semibold text-slate-900">{selectedCampaign?.title}</span>
            </div>
            <div>
              <Label>PayPal button URL</Label>
              <Input
                value={paypalUrl}
                onChange={(e) => setPaypalUrl(e.target.value)}
                placeholder="https://www.paypal.com/donate/?hosted_button_id=XXXXX"
                className="mt-1 rounded-xl"
                data-testid="paypal-url-input"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={campaignStatus} onValueChange={setCampaignStatus}>
                <SelectTrigger className="mt-1 rounded-xl" data-testid="paypal-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPyDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={savePayPal}
              disabled={!paypalUrl}
              className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
              data-testid="paypal-save-button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, accent, testid }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-200"}`} data-testid={testid}>
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-2 ${accent ? "text-emerald-700" : "text-slate-500"}`}>
        <span className="h-4 w-4 inline-flex items-center justify-center">{icon}</span>
        {label}
      </div>
      <p className="font-heading text-2xl font-bold text-blue-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    Active: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    Paused: "bg-slate-100 text-slate-700",
    Completed: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${map[status] || map.Pending}`}>
      {status}
    </span>
  );
}

function PayoutDestination({ payout }) {
  const m = payout.payout_method || (payout.payout_paypal_email ? "paypal" : "bank");
  if (m === "paypal") {
    return (
      <div data-testid={`destination-paypal-${payout.payout_id}`}>
        <p className="font-semibold text-slate-900">PayPal</p>
        <p className="text-slate-600 break-all">
          {payout.payout_paypal_email || payout.payout_destination?.paypal_email || "—"}
        </p>
      </div>
    );
  }
  const b = payout.payout_destination?.bank_details || {};
  if (!b.account_holder_name) {
    return <span className="text-slate-400 italic">No bank details on file</span>;
  }
  return (
    <div className="space-y-0.5 leading-tight max-w-xs" data-testid={`destination-bank-${payout.payout_id}`}>
      <p className="font-semibold text-slate-900">Bank transfer</p>
      <p>{b.account_holder_name}</p>
      <p className="text-slate-600">{b.bank_name} — {b.bank_country}</p>
      {b.iban && <p className="font-mono text-slate-700 break-all">IBAN: {b.iban}</p>}
      {b.account_number && <p className="font-mono text-slate-700">Acct: {b.account_number}</p>}
      {b.swift_bic && <p className="font-mono text-slate-700">SWIFT: {b.swift_bic}</p>}
      {b.routing_number && <p className="font-mono text-slate-700">Routing: {b.routing_number}</p>}
      {b.bank_address && <p className="text-slate-500 whitespace-pre-wrap">{b.bank_address}</p>}
      {b.reference && <p className="text-slate-500">Ref: {b.reference}</p>}
    </div>
  );
}


function PayoutStatusPill({ status }) {
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

function FeePreview({ gross }) {
  const fee = gross * 0.13;
  const fundraiserShare = gross - fee;
  const fmt = (v) => `$${v.toFixed(2)}`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div className="flex justify-between"><span className="text-slate-500">Gross donation</span><span className="font-semibold">{fmt(gross)}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">Processing &amp; banking fee (13%)</span><span className="font-semibold text-rose-600">−{fmt(fee)}</span></div>
      <div className="flex justify-between sm:col-span-2 border-t border-slate-100 pt-2 mt-1">
        <span className="text-slate-700 font-medium">Fundraiser net earned</span>
        <span className="font-heading font-bold text-emerald-700">{fmt(fundraiserShare)}</span>
      </div>
    </div>
  );
}


function KycStatusPill({ status }) {
  const map = {
    pending: "bg-amber-50 text-amber-700",
    verified: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
    none: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || map.none}`}>
      {status || "none"}
    </span>
  );
}
