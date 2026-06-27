import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Info } from "lucide-react";

export default function DonateCancel() {
  const [params] = useSearchParams();
  const campaignId = params.get("campaign_id");
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 lg:p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
            <Info className="h-8 w-8 text-slate-500" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-blue-900 mb-3">
            Donation cancelled
          </h1>
          <p className="text-slate-600 mb-6">
            No charges were made. Whenever you&apos;re ready, you can try again.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {campaignId && (
              <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link to={`/donate/${campaignId}`}>Back to donate page</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/discover">Browse campaigns</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
