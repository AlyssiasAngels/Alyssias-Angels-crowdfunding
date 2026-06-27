import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import CampaignCard from "../components/CampaignCard";
import { api, CATEGORIES } from "../lib/api";

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const initialCat = params.get("category") || "All";
  const [category, setCategory] = useState(initialCat);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/campaigns", { params: category && category !== "All" ? { category } : {} })
      .then((r) => setCampaigns(r.data))
      .finally(() => setLoading(false));
    if (category === "All") {
      params.delete("category");
      setParams(params, { replace: true });
    } else {
      setParams({ category }, { replace: true });
    }
  }, [category]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
            Browse campaigns
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-blue-900 tracking-tight">
            Discover causes
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-testid={`filter-category-${c.toLowerCase()}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                category === c
                  ? "bg-blue-900 text-white border-blue-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-slate-500" data-testid="discover-loading">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" data-testid="discover-empty">
            <p className="text-slate-600">No campaigns found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
