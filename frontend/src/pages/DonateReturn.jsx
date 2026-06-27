import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, fmtUSD, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { CheckCircle2, Loader2, XCircle, Heart } from "lucide-react";

export default function DonateReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get("token");
  const campaignId = params.get("campaign_id");
  const [state, setState] = useState("capturing"); // capturing | success | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!orderId) {
      setState("error");
      setError("Missing PayPal order token.");
      return;
    }
    api
      .post("/donate/capture", { order_id: orderId })
      .then((r) => {
        setResult(r.data);
        setState("success");
      })
      .catch((err) => {
        setError(formatApiError(err));
        setState("error");
      });
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 lg:p-12 text-center" data-testid="donate-return-card">
          {state === "capturing" && (
            <>
              <Loader2 className="h-12 w-12 text-blue-900 animate-spin mx-auto mb-6" />
              <h1 className="font-heading text-2xl font-bold text-blue-900 mb-2">
                Confirming your donation…
              </h1>
              <p className="text-slate-500">Please don&apos;t close this page.</p>
            </>
          )}
          {state === "success" && (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 mb-3">
                Thank you{result?.donor_name ? `, ${result.donor_name}` : ""}!
              </h1>
              <p className="text-slate-600 mb-6">
                Your donation of{" "}
                <strong className="text-blue-900">{fmtUSD(result?.amount || 0)}</strong>{" "}
                was received and credited to the campaign. A receipt is on its way from PayPal.
              </p>
              {result?.already_captured && (
                <p className="text-xs text-slate-400 mb-4">
                  (This donation was already processed — no duplicate charge.)
                </p>
              )}
              <div className="flex flex-wrap gap-3 justify-center">
                {result?.campaign_id && (
                  <Button
                    asChild
                    className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
                    data-testid="donate-success-view-campaign"
                  >
                    <Link to={`/campaigns/${result.campaign_id}`}>
                      <Heart className="h-4 w-4 mr-2" /> View campaign
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl"
                  data-testid="donate-success-discover"
                >
                  <Link to="/discover">Explore more campaigns</Link>
                </Button>
              </div>
            </>
          )}
          {state === "error" && (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-blue-900 mb-3">
                We couldn&apos;t complete your donation
              </h1>
              <p className="text-slate-600 mb-2">{error || "Something went wrong with PayPal."}</p>
              <p className="text-xs text-slate-400 mb-6">
                If you were charged, please contact admin@platform.com with PayPal order ID{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded">{orderId}</code>.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {campaignId && (
                  <Button
                    onClick={() => navigate(`/donate/${campaignId}`)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Try again
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/discover">Browse campaigns</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
