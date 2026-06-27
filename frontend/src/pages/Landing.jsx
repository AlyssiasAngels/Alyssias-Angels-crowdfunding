import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import CampaignCard from "../components/CampaignCard";
import { api, HERO_IMAGE, CATEGORIES, CATEGORY_IMAGES } from "../lib/api";
import { Button } from "../components/ui/button";
import { ArrowRight, Heart, ShieldCheck, Sparkles } from "lucide-react";

export default function Landing() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/campaigns")
      .then((r) => setCampaigns(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20 pb-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700">
                  Community-Powered Fundraising
                </span>
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-blue-900 leading-[1.05]">
                Alyssia&apos;s Angels
                <br />
                <span className="text-emerald-600">Fund what matters.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Community-powered fundraising inspired by NICU families. Start a campaign for
                medical bills, memorials, education, or creative projects — every donation is
                tracked transparently from PayPal to your payout.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-6 text-base"
                  data-testid="hero-start-campaign-button"
                >
                  <Link to="/register">
                    Start a campaign <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-slate-200 text-slate-700 px-6 py-6 text-base"
                  data-testid="hero-discover-button"
                >
                  <Link to="/discover">Browse campaigns</Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-6 pt-6 max-w-md">
                <Trust icon={<ShieldCheck className="h-4 w-4" />} label="Verified ledger" />
                <Trust icon={<Heart className="h-4 w-4" />} label="Direct payouts" />
                <Trust icon={<Sparkles className="h-4 w-4" />} label="Transparent fees" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-2xl shadow-blue-900/5">
                <img
                  src={HERO_IMAGE}
                  alt="Diverse community"
                  className="w-full h-[420px] lg:h-[520px] object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-heading font-bold">
                      $
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Built on a transparent ledger
                      </p>
                      <p className="text-xs text-slate-500">
                        Donors via PayPal · Funds tracked per campaign
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
                Choose a cause
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-blue-900">
                Browse by category
              </h2>
            </div>
            <Link
              to="/discover"
              className="hidden sm:inline-flex items-center text-sm font-medium text-blue-900 hover:text-emerald-600"
              data-testid="discover-all-link"
            >
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/discover?category=${cat}`}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-slate-200"
                data-testid={`category-card-${cat.toLowerCase()}`}
              >
                <img
                  src={CATEGORY_IMAGES[cat]}
                  alt={cat}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-heading text-xl font-semibold text-white">{cat}</h3>
                  <p className="text-xs text-emerald-200 mt-1">Support {cat.toLowerCase()} causes</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CAMPAIGNS */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
                Live campaigns
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-blue-900">
                Make a difference today
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-500" data-testid="campaigns-loading">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" data-testid="no-campaigns-state">
              <p className="text-slate-600 mb-4">No active campaigns yet.</p>
              <Button
                asChild
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link to="/register">Be the first to start a campaign</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.slice(0, 6).map((c, i) => (
                <CampaignCard key={c.id} campaign={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
              How it works
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-blue-900 max-w-2xl mx-auto">
              Three simple steps to fund what matters
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Step
              n="01"
              title="Create your campaign"
              text="Tell your story, set a goal, and upload an image. Our admin assigns a unique PayPal link to your campaign."
            />
            <Step
              n="02"
              title="Share & collect"
              text="Donors give directly through PayPal. Every donation is logged in your campaign's transparent ledger."
            />
            <Step
              n="03"
              title="Request your payout"
              text="Track your net balance in your dashboard and request a payout to your personal PayPal anytime."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="text-slate-500 text-center sm:text-left">
            <p>© {new Date().getFullYear()} Alyssia&apos;s Angels · Community-powered fundraising</p>
            <p className="text-xs text-slate-400 mt-1">Inspired by NICU families. Built on transparent finance.</p>
          </div>
          <nav className="flex items-center gap-5 flex-wrap justify-center">
            <Link to="/discover" className="text-slate-600 hover:text-emerald-600 font-medium">
              Discover
            </Link>
            <Link to="/fundraisers" className="text-slate-600 hover:text-emerald-600 font-medium">
              Fundraisers
            </Link>
            <Link
              to="/terms-of-service"
              className="text-slate-600 hover:text-emerald-600 font-medium"
              data-testid="footer-terms-link"
            >
              Terms
            </Link>
            <Link
              to="/login"
              className="text-slate-500 hover:text-blue-900 text-xs"
              data-testid="footer-admin-login"
            >
              Admin sign-in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Trust({ icon, label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="text-emerald-600">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function Step({ n, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8">
      <div className="text-xs font-bold tracking-[0.3em] text-emerald-600 mb-3">{n}</div>
      <h3 className="font-heading text-xl font-semibold text-blue-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}
