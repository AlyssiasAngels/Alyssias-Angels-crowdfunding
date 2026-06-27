import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, fmtUSD, imageUrl, CATEGORY_IMAGES, formatApiError } from "../lib/api";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Heart, Loader2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

export default function Donate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("25");
  const [donorName, setDonorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/campaigns/${id}`)
      .then((r) => setCampaign(r.data))
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }, [id]);

  const onPay = async (e) => {
    e?.preventDefault();
    setError("");
    const amt = Number(amount);
    if (isNaN(amt) || amt < 5) {
      setError("Minimum donation is $5.00");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/donate/create", {
        campaign_id: id,
        amount: amt,
        donor_name: donorName || "Anonymous",
      });
      // Redirect to PayPal approval URL
      window.location.href = data.approval_url;
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20 text-slate-500">Loading…</div>
      </div>
    );
  if (!campaign)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-md mx-auto py-20 text-center">
          <p className="text-slate-600 mb-4">Campaign not found.</p>
          <Button asChild className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white">
            <Link to="/discover">Browse campaigns</Link>
          </Button>
        </div>
      </div>
    );

  const pct = Math.min(
    100,
    (Number(campaign.current_balance_gross || 0) / Number(campaign.goal_amount || 1)) * 100
  );
  const img = imageUrl(campaign.image_url) || CATEGORY_IMAGES[campaign.category];
  const isOpen = campaign.status === "Active";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Campaign summary */}
          <aside className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-slate-100 relative">
                {img && <img src={img} alt={campaign.title} className="w-full h-full object-cover" />}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/90 text-blue-900 hover:bg-white border-0 rounded-full px-3 py-1 font-medium">
                    {campaign.category}
                  </Badge>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h2 className="font-heading text-xl font-semibold text-slate-900 leading-snug">
                  {campaign.title}
                </h2>
                <p className="text-sm text-slate-500 line-clamp-3">{campaign.description}</p>
                <div className="space-y-1.5 pt-2">
                  <Progress value={pct} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {fmtUSD(campaign.current_balance_gross)}
                    </span>
                    <span className="text-slate-500">
                      of {fmtUSD(campaign.goal_amount)}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/campaigns/${id}`}
                  className="text-xs text-blue-900 font-medium hover:text-emerald-600 inline-block pt-2"
                  data-testid="donate-view-campaign-link"
                >
                  Read full story →
                </Link>
              </div>
            </div>
          </aside>

          {/* Donate form */}
          <section className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
              Make a donation
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-3">
              Support {campaign.creator_name}&apos;s campaign
            </h1>
            <p className="text-slate-600 mb-8 max-w-xl">
              Choose an amount and complete your donation securely on PayPal. Every dollar is
              tracked transparently in our ledger and credited to this campaign within seconds.
            </p>

            <form
              onSubmit={onPay}
              className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 space-y-6"
              data-testid="donate-form"
            >
              <div>
                <Label className="text-slate-700">Amount (USD)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmount(String(q))}
                      data-testid={`donate-quick-${q}`}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                        Number(amount) === q
                          ? "bg-blue-900 border-blue-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      ${q}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    data-testid="donate-quick-other"
                    className="px-4 py-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-blue-300"
                  >
                    Other
                  </button>
                </div>
                <div className="mt-4 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    $
                  </span>
                  <Input
                    type="number"
                    min="5"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-xl text-2xl font-heading font-bold h-16 pl-8 text-blue-900"
                    placeholder="0.00"
                    data-testid="donate-amount-input"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Minimum donation: $5.00</p>
              </div>

              <div>
                <Label htmlFor="donor" className="text-slate-700">
                  Your name <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="donor"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Anonymous"
                  className="mt-1 rounded-xl"
                  maxLength={80}
                  data-testid="donate-donor-name-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Shown on the donations wall. Leave blank to remain anonymous.
                </p>
              </div>

              {error && (
                <div
                  className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
                  data-testid="donate-error"
                >
                  {error}
                </div>
              )}

              {!isOpen && (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  This campaign is not currently accepting donations.
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !isOpen}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold h-14"
                data-testid="donate-pay-button"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting to PayPal…
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" /> Pay {amount ? fmtUSD(amount) : ""} with PayPal
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Trust icon={<Lock className="h-3.5 w-3.5" />} text="PayPal secure checkout" />
                <Trust icon={<ShieldCheck className="h-3.5 w-3.5" />} text="Tracked in our ledger" />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                A flat <strong>13% processing fee</strong> covers payment processing, banking charges, and platform maintenance — applied once per donation, no other deductions.{" "}
                <button
                  type="button"
                  onClick={() => navigate("/terms-of-service")}
                  className="underline hover:text-blue-900"
                >
                  See full terms
                </button>
                .
              </p>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function Trust({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
      <span className="text-emerald-600">{icon}</span>
      <span className="font-medium">{text}</span>
    </div>
  );
}
