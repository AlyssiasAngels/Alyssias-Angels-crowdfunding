import React from "react";
import { Link } from "react-router-dom";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { fmtUSD, imageUrl, CATEGORY_IMAGES } from "../lib/api";
import { ArrowUpRight } from "lucide-react";

export default function CampaignCard({ campaign, index = 0 }) {
  const pct = Math.min(
    100,
    (Number(campaign.current_balance_gross || 0) / Number(campaign.goal_amount || 1)) * 100
  );
  const img = imageUrl(campaign.image_url) || CATEGORY_IMAGES[campaign.category];

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      data-testid={`campaign-card-${campaign.id}`}
      className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="aspect-[16/10] bg-slate-100 overflow-hidden relative">
        {img ? (
          <img
            src={img}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100" />
        )}
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/90 text-blue-900 hover:bg-white border-0 rounded-full px-3 py-1 font-medium">
            {campaign.category}
          </Badge>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading font-semibold text-lg text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-900 transition-colors">
            {campaign.title}
          </h3>
          <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors mt-1 shrink-0" />
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{campaign.description}</p>
        <div className="space-y-2 pt-1">
          <Progress
            value={pct}
            className="h-2 bg-slate-100 [&>div]:bg-emerald-500"
            data-testid={`campaign-progress-${campaign.id}`}
          />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-900">
              {fmtUSD(campaign.current_balance_gross)}
            </span>
            <span className="text-xs text-slate-500">
              of {fmtUSD(campaign.goal_amount)} · {pct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
