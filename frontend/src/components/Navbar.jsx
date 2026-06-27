import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Heart, LogOut, Plus, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-home-link">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white">
            <Heart className="h-5 w-5 text-emerald-300" strokeWidth={2.5} />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-bold text-lg text-blue-900 tracking-tight">
              Alyssia&apos;s Angels
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-600 font-semibold">
              Community fundraising
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/discover"
            className="hidden md:inline-flex text-sm font-medium text-slate-700 hover:text-blue-900 px-3 py-2 rounded-lg"
            data-testid="nav-discover-link"
          >
            Discover
          </Link>
          <Link
            to="/fundraisers"
            className="hidden md:inline-flex text-sm font-medium text-slate-700 hover:text-blue-900 px-3 py-2 rounded-lg"
            data-testid="nav-fundraisers-link"
          >
            Fundraisers
          </Link>
          {user ? (
            <>
              {user.role === "admin" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  className="rounded-xl border-slate-200"
                  data-testid="nav-admin-button"
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" /> Admin
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl border-slate-200"
                data-testid="nav-dashboard-button"
              >
                My fundraisers
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/campaigns/new")}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="nav-create-campaign-button"
              >
                <Plus className="h-4 w-4 mr-1.5" /> New
              </Button>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="text-slate-500 hover:text-slate-900 p-2 rounded-lg"
                title="Logout"
                data-testid="nav-logout-button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/login")}
                className="rounded-xl border-slate-200"
                data-testid="nav-login-button"
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/register")}
                className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
                data-testid="nav-register-button"
              >
                Start a campaign
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
