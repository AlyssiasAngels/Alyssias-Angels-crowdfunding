import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";

export default function ShareCodeRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/c/${encodeURIComponent(code)}`);
        navigate(`/campaigns/${data.id}`, { replace: true });
      } catch (err) {
        // Fallback: bounce to discover if share code doesn't resolve
        console.warn("Share code resolve failed:", formatApiError(err));
        navigate("/discover", { replace: true });
      }
    })();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500" data-testid="share-redirect">
      Loading campaign…
    </div>
  );
}
