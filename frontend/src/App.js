import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Discover from "./pages/Discover";
import CampaignDetail from "./pages/CampaignDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import Dashboard from "./pages/Dashboard";
import CreateCampaign from "./pages/CreateCampaign";
import AdminPanel from "./pages/AdminPanel";
import Kyc from "./pages/Kyc";
import Terms from "./pages/Terms";
import Donate from "./pages/Donate";
import DonateReturn from "./pages/DonateReturn";
import DonateCancel from "./pages/DonateCancel";
import Fundraisers from "./pages/Fundraisers";
import FundraiserDetail from "./pages/FundraiserDetail";
import VerifyEmail from "./pages/VerifyEmail";
import EditCampaign from "./pages/EditCampaign";
import ShareCodeRedirect from "./pages/ShareCodeRedirect";
import PayoutMethod from "./pages/PayoutMethod";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/donate/return" element={<DonateReturn />} />
            <Route path="/donate/cancel" element={<DonateCancel />} />
            <Route path="/donate/:id" element={<Donate />} />
            <Route path="/fundraisers" element={<Fundraisers />} />
            <Route path="/fundraisers/:id" element={<FundraiserDetail />} />
            <Route path="/terms-of-service" element={<Terms />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/c/:code" element={<ShareCodeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/force-password-change"
              element={
                <ProtectedRoute>
                  <ForcePasswordChange />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/new"
              element={
                <ProtectedRoute>
                  <CreateCampaign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/edit"
              element={
                <ProtectedRoute>
                  <EditCampaign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payout-method"
              element={
                <ProtectedRoute>
                  <PayoutMethod />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kyc"
              element={
                <ProtectedRoute>
                  <Kyc />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
