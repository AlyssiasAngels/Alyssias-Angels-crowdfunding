import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import CommentsSection from "../components/CommentsSection";
import CampaignUpdates from "../components/CampaignUpdates";
import ShareDialog from "../components/ShareDialog";
import { api, fmtUSD, imageUrl, CATEGORY_IMAGES } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Heart, Clock, ShieldCheck, Pencil, Share2 } from "lucide-react";

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/campaigns/${id}`), api.get(`/campaigns/${id}/donations`)])
      .then(([c, d]) => {
        setCampaign(c.data);
        setDonations(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20 text-slate-500" data-testid="detail-loading">Loading…</div>
      </div>
    );
  if (!campaign)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20 text-slate-500">Campaign not found.</div>
      </div>
    );

  const pct = Math.min(
    100,
    (Number(campaign.current_balance_gross || 0) / Number(campaign.goal_amount || 1)) * 100
  );
  const img = imageUrl(campaign.image_url) || CATEGORY_IMAGES[campaign.category];
  const isActive = campaign.status === "Active";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl overflow-hidden border border-slate-200">
              <img src={img} alt={campaign.title} className="w-full h-[300px] sm:h-[420px] object-cover" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-900 border-0 rounded-full px-3">
                  {campaign.category}
                </Badge>
                {campaign.status === "Pending" && (
                  <Badge className="bg-amber-50 text-amber-800 border-0 rounded-full px-3">
                    <Clock className="h-3 w-3 mr-1" /> Awaiting PayPal setup
                  </Badge>
                )}
              </div>
              <h1
                className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-900 tracking-tight"
                data-testid="campaign-title"
              >
                {campaign.title}
              </h1>
              <p className="text-sm text-slate-500">
                Organized by <span className="text-slate-700 font-medium">{campaign.creator_name}</span>
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
                  data-testid="campaign-share-button"
                >
                  <Share2 className="h-4 w-4" /> Share campaign
                </button>
                {user && (user.id === campaign.user_id || user.role === "admin") && (
                  <Link
                    to={`/campaigns/${campaign.id}/edit`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                    data-testid="campaign-edit-link"
                  >
                    <Pencil className="h-4 w-4" /> Edit campaign
                  </Link>
                )}
              </div>
            </div>
            <div className="prose prose-slate max-w-none">
              <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap" data-testid="campaign-description">
                {campaign.description}
              </p>
            </div>

            {/* Donations wall */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8">
              <h2 className="font-heading text-xl font-semibold text-blue-900 mb-4">
                Recent supporters ({donations.length})
              </h2>
              {donations.length === 0 ? (
                <p className="text-slate-500 text-sm" data-testid="no-donations">
                  Be the first to donate.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100" data-testid="donations-list">
                  {donations.map((d) => (
                    <li key={d.transaction_id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-heading font-semibold">
                          {(d.donor_name || "A").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{d.donor_name}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(d.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700">{fmtUSD(d.gross_amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <CampaignUpdates campaignId={id} ownerId={campaign.user_id} />

            <CommentsSection campaignId={id} />
          </div>

          {/* Right Sticky */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm">
                <p className="text-4xl font-heading font-bold text-blue-900" data-testid="campaign-raised">
                  {fmtUSD(campaign.current_balance_gross)}
                </p>
                <p className="text-sm text-slate-500">
                  raised of {fmtUSD(campaign.goal_amount)} goal
                </p>
                <div className="mt-4 progress-animate">
                  <Progress
                    value={pct}
                    className="h-3 bg-slate-100 [&>div]:bg-emerald-500"
                    data-testid="campaign-progress-bar"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {pct.toFixed(0)}% funded · {donations.length} donation{donations.length === 1 ? "" : "s"}
                </p>

                <div className="mt-6 space-y-3">
                  {isActive ? (
                    <Link
                      to={`/donate/${campaign.id}`}
                      data-testid="donate-paypal-button"
                      className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-6 py-4 transition-colors"
                    >
                      <Heart className="h-4 w-4" /> Donate via PayPal
                    </Link>
                  ) : (
                    <Button
                      disabled
                      className="w-full rounded-xl bg-slate-200 text-slate-500 cursor-not-allowed"
                      data-testid="donate-disabled-button"
                    >
                      Donations not yet open
                    </Button>
                  )}
                  <p className="text-xs text-slate-500 text-center">
                    Minimum donation: <span className="font-semibold">$5</span>
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Secure</p>
                      <p className="text-slate-500">PayPal-protected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Tracked</p>
                      <p className="text-slate-500">Transparent ledger</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold mb-1">How donations are tracked</p>
                <p className="text-blue-900/80">
                  Donations are sent to our central PayPal. Admin matches the transaction
                  to your campaign and logs it here so the progress bar updates within
                  minutes.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} campaign={campaign} />
    </div>
  );
}
