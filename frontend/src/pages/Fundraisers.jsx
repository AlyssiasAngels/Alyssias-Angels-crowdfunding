import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, fmtUSD, imageUrl, CATEGORY_IMAGES } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Users, TrendingUp, ArrowUpRight } from "lucide-react";

export default function Fundraisers() {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/fundraisers")
      .then((r) => setFundraisers(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
            People raising funds
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-blue-900 tracking-tight">
            Meet our fundraisers
          </h1>
          <p className="text-slate-600 mt-3 max-w-2xl">
            Real people running real campaigns. Each name below is leading a community effort —
            explore their stories and support whichever one moves you.
          </p>
        </div>

        {loading ? (
          <div className="text-slate-500" data-testid="fundraisers-loading">
            Loading…
          </div>
        ) : fundraisers.length === 0 ? (
          <div
            className="bg-white border border-slate-200 rounded-2xl p-12 text-center"
            data-testid="fundraisers-empty"
          >
            <p className="text-slate-600 mb-4">No active fundraisers yet.</p>
            <Link
              to="/register"
              className="text-blue-900 font-semibold hover:text-emerald-600"
            >
              Be the first to start a campaign →
            </Link>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="fundraisers-grid"
          >
            {fundraisers.map((f, i) => (
              <FundraiserCard key={f.user_id} f={f} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FundraiserCard({ f, index }) {
  const cat = f.categories?.[0];
  const img = imageUrl(f.first_image) || (cat ? CATEGORY_IMAGES[cat] : null);
  const initials = (f.creator_name || "A").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <Link
      to={`/fundraisers/${f.user_id}`}
      data-testid={`fundraiser-card-${f.user_id}`}
      className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[16/9] bg-slate-100 overflow-hidden relative">
        {img ? (
          <img
            src={img}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-emerald-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/70 via-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
          <div className="h-12 w-12 rounded-full bg-white text-blue-900 flex items-center justify-center font-heading font-bold text-lg shadow-lg">
            {initials.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-heading font-semibold text-lg leading-tight truncate drop-shadow">
              {f.creator_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {(f.categories || []).slice(0, 2).map((c) => (
                <Badge
                  key={c}
                  className="bg-white/90 text-blue-900 hover:bg-white border-0 rounded-full px-2 py-0 text-[10px] font-semibold"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <ul className="space-y-1.5 text-sm text-slate-700">
          {(f.campaign_titles || []).slice(0, 2).map((t, idx) => (
            <li key={idx} className="line-clamp-1">
              <span className="text-emerald-600 mr-1.5">•</span>
              {t}
            </li>
          ))}
          {f.campaigns_count > 2 && (
            <li className="text-xs text-slate-500 pl-3.5">
              + {f.campaigns_count - 2} more
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {f.campaigns_count} campaign
              {f.campaigns_count === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> {fmtUSD(f.total_raised)}
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
