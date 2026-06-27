import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import CampaignCard from "../components/CampaignCard";
import { api, fmtUSD } from "../lib/api";

export default function FundraiserDetail() {
  const { id } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/fundraisers/${id}/campaigns`)
      .then((r) => setCampaigns(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20 text-slate-500">Loading…</div>
      </div>
    );

  if (campaigns.length === 0)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-slate-600 mb-4">This fundraiser has no active campaigns.</p>
          <Link to="/fundraisers" className="text-blue-900 font-semibold hover:text-emerald-600">
            ← Back to fundraisers
          </Link>
        </main>
      </div>
    );

  const creatorName = campaigns[0]?.creator_name || "Fundraiser";
  const totalRaised = campaigns.reduce((sum, c) => sum + Number(c.current_balance_gross || 0), 0);
  const initials = creatorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center gap-5 mb-10">
          <div className="h-20 w-20 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-heading font-bold text-3xl">
            {initials}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-1">
              Fundraiser
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight">
              {creatorName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} ·{" "}
              {fmtUSD(totalRaised)} raised in total
            </p>
          </div>
        </div>

        <h2 className="font-heading text-xl font-semibold text-blue-900 mb-5">
          Active campaigns
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="fundraiser-campaigns-grid">
          {campaigns.map((c, i) => (
            <CampaignCard key={c.id} campaign={c} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
