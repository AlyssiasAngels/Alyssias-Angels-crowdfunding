import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, fmtUSD, imageUrl, CATEGORY_IMAGES, formatApiError } from "../lib/api";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Heart, Loader2, ShieldCheck, Lock, CreditCard } from "lucide-react";
import { toast } from "sonner";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID;

function loadPayPalScript(clientId, clientToken) {
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(window.paypal); return; }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=hosted-fields,buttons&intent=capture`;
    script.setAttribute("data-client-token", clientToken);
    script.onload = () => resolve(window.paypal);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function Donate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("25");
  const [donorName, setDonorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const [sdkReady, setSdkReady] = useState(false);
  const [clientToken, setClientToken] = useState(null);
  const hostedFieldsRef = useRef(null);

  useEffect(() => {
    api.get(`/campaigns/${id}`)
      .then((r) => setCampaign(r.data))
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.post("/donate/client-token")
      .then((r) => setClientToken(r.data.client_token))
      .catch(() => setClientToken(null));
  }, []);

  useEffect(() => {
    if (!PAYPAL_CLIENT_ID || !clientToken) return;
    loadPayPalScript(PAYPAL_CLIENT_ID, clientToken)
      .then(() => setSdkReady(true))
      .catch(() => toast.error("Could not load payment SDK"));
  }, [clientToken]);

  useEffect(() => {
    if (!sdkReady || payMethod !== "card") return;
    if (!window.paypal?.HostedFields?.isEligible()) {
      toast.error("Card payments not available, please use PayPal");
      return;
    }
    if (hostedFieldsRef.current) return;
    window.paypal.HostedFields.render({
      createOrder: async () => {
        const amt = Number(amount);
        const { data } = await api.post("/donate/create", {
          campaign_id: id,
          amount: amt,
          donor_name: donorName || "Anonymous",
        });
        return data.order_id;
      },
      styles: {
        input: { "font-size": "16px", "font-family": "inherit", color: "#1e3a8a" },
        ".valid": { color: "#059669" },
        ".invalid": { color: "#dc2626" },
      },
      fields: {
        number: { selector: "#card-number", placeholder: "Card number" },
        cvv: { selector: "#cvv", placeholder: "CVV" },
        expirationDate: { selector: "#expiry", placeholder: "MM/YYYY" },
      },
    }).then((hf) => { hostedFieldsRef.current = hf; })
      .catch(() => toast.error("Card fields could not load"));
  }, [sdkReady, payMethod]);

  const onCardPay = async () => {
    setError("");
    const amt = Number(amount);
    if (isNaN(amt) || amt < 5) { setError("Minimum donation is $5.00"); return; }
    if (!hostedFieldsRef.current) { setError("Card fields not ready, please wait"); return; }
    setSubmitting(true);
    try {
      const result = await hostedFieldsRef.current.submit({ cardholderName: donorName || "Anonymous" });
      await api.post("/donate/capture", { order_id: result.orderId });
      toast.success("Thank you for your donation!");
      navigate(`/campaigns/${id}?donated=1`);
    } catch (err) {
      setError(formatApiError(err) || "Payment failed, please try again");
      toast.error("Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onPayPal = async () => {
    setError("");
    const amt = Number(amount);
    if (isNaN(amt) || amt < 5) { setError("Minimum donation is $5.00"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/donate/create", {
        campaign_id: id,
        amount: amt,
        donor_name: donorName || "Anonymous",
      });
      window.location.href = data.approval_url;
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
      setSubmitting(false);
    }
  };

  if (loading) return (<div className="min-h-screen bg-background"><Navbar /><div className="text-center py-20 text-slate-500">Loading...</div></div>);
  if (!campaign) return (<div className="min-h-screen bg-background"><Navbar /><div className="max-w-md mx-auto py-20 text-center"><p className="text-slate-600 mb-4">Campaign not found.</p><Button asChild className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"><Link to="/discover">Browse campaigns</Link></Button></div></div>);

  const pct = Math.min(100, (Number(campaign.current_balance_gross || 0) / Number(campaign.goal_amount || 1)) * 100);
  const img = imageUrl(campaign.image_url) || CATEGORY_IMAGES[campaign.category];
  const isOpen = campaign.status === "Active";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <aside className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-slate-100 relative">
                {img && <img src={img} alt={campaign.title} className="w-full h-full object-cover" />}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/90 text-blue-900 hover:bg-white border-0 rounded-full px-3 py-1 font-medium">{campaign.category}</Badge>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h2 className="font-heading text-xl font-semibold text-slate-900 leading-snug">{campaign.title}</h2>
                <p className="text-sm text-slate-500 line-clamp-3">{campaign.description}</p>
                <div className="space-y-1.5 pt-2">
                  <Progress value={pct} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-900">{fmtUSD(campaign.current_balance_gross)}</span>
                    <span className="text-slate-500">of {fmtUSD(campaign.goal_amount)}</span>
                  </div>
                </div>
                <Link to={`/campaigns/${id}`} className="text-xs text-blue-900 font-medium hover:text-emerald-600 inline-block pt-2">Read full story →</Link>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">Make a donation</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-3">Support {campaign.creator_name}'s campaign</h1>
            <p className="text-slate-600 mb-8 max-w-xl">Choose an amount and pay securely by card or PayPal. Every dollar is tracked transparently in our ledger.</p>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 space-y-6">
              <div>
                <Label className="text-slate-700">Amount (USD)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((q) => (
                    <button key={q} type="button" onClick={() => setAmount(String(q))}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${Number(amount) === q ? "bg-blue-900 border-blue-900 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`}>
                      ${q}
                    </button>
                  ))}
                  <button type="button" onClick={() => setAmount("")}
                    className="px-4 py-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-blue-300">Other</button>
                </div>
                <div className="mt-4 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <Input type="number" min="5" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="rounded-xl text-2xl font-heading font-bold h-16 pl-8 text-blue-900" placeholder="0.00" />
                </div>
                <p className="text-xs text-slate-500 mt-2">Minimum donation: $5.00</p>
              </div>

              <div>
                <Label htmlFor="donor" className="text-slate-700">Your name <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input id="donor" value={donorName} onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Anonymous" className="mt-1 rounded-xl" maxLength={80} />
                <p className="text-xs text-slate-500 mt-1">Shown on the donations wall. Leave blank to remain anonymous.</p>
              </div>

              <div>
                <Label className="text-slate-700 mb-2 block">Payment method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPayMethod("card")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors ${payMethod === "card" ? "bg-blue-900 border-blue-900 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`}>
                    <CreditCard className="h-4 w-4" /> Pay by Card
                  </button>
                  <button type="button" onClick={() => setPayMethod("paypal")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors ${payMethod === "paypal" ? "bg-blue-900 border-blue-900 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`}>
                    <Heart className="h-4 w-4" /> Pay with PayPal
                  </button>
                </div>
              </div>

              {payMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-slate-700 text-xs mb-1 block">Card number</Label>
                    <div id="card-number" className="border border-slate-200 rounded-xl px-4 h-12 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-700 text-xs mb-1 block">Expiry</Label>
                      <div id="expiry" className="border border-slate-200 rounded-xl px-4 h-12 bg-white" />
                    </div>
                    <div>
                      <Label className="text-slate-700 text-xs mb-1 block">CVV</Label>
                      <div id="cvv" className="border border-slate-200 rounded-xl px-4 h-12 bg-white" />
                    </div>
                  </div>
                  {!sdkReady && <p className="text-xs text-slate-400">Loading card fields...</p>}
                </div>
              )}

              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
              {!isOpen && <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">This campaign is not currently accepting donations.</div>}

              {payMethod === "card" ? (
                <Button onClick={onCardPay} disabled={submitting || !isOpen || !sdkReady}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold h-14">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><CreditCard className="h-4 w-4 mr-2" />Pay {amount ? fmtUSD(amount) : ""} by Card</>}
                </Button>
              ) : (
                <Button onClick={onPayPal} disabled={submitting || !isOpen}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold h-14">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting to PayPal...</> : <><Heart className="h-4 w-4 mr-2" />Pay {amount ? fmtUSD(amount) : ""} with PayPal</>}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <span className="text-emerald-600"><Lock className="h-3.5 w-3.5" /></span>
                  <span className="font-medium">Secure checkout</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <span className="text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /></span>
                  <span className="font-medium">Tracked in our ledger</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                A flat <strong>13% processing fee</strong> covers payment processing, banking charges, and platform maintenance — applied once per donation, no other deductions.{" "}
                <button type="button" onClick={() => navigate("/terms-of-service")} className="underline hover:text-blue-900">See full terms</button>.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
