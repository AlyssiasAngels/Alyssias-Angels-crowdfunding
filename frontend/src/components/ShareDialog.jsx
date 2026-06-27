import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Copy,
  CheckCheck,
  Mail,
  Facebook,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function ShareDialog({ open, onOpenChange, campaign }) {
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    if (!campaign) return "";
    // Prefer the configured public share base URL (e.g. "https://alyssiasangels.online")
    // so links never contain the preview host. Falls back to current origin in dev.
    const explicit = (process.env.REACT_APP_SHARE_BASE_URL || "").replace(/\/$/, "");
    const base =
      explicit ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return campaign.share_code
      ? `${base}/c/${campaign.share_code}`
      : `${base}/campaigns/${campaign.id}`;
  }, [campaign]);

  const shareText = campaign
    ? `Support "${campaign.title}" on Alyssia's Angels — every donation helps.`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the field and copy manually.");
    }
  };

  const openExternal = (target) => {
    const encUrl = encodeURIComponent(url);
    const encText = encodeURIComponent(shareText);
    const map = {
      whatsapp: `https://wa.me/?text=${encText}%20${encUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}`,
      email: `mailto:?subject=${encodeURIComponent("Please donate: " + (campaign?.title || ""))}&body=${encText}%0A%0A${encUrl}`,
    };
    const link = map[target];
    if (target === "email") {
      window.location.href = link;
    } else {
      window.open(link, "_blank", "noopener,noreferrer,width=600,height=600");
    }
  };

  const tryNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: campaign?.title,
          text: shareText,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md" data-testid="share-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-blue-900">
            Share this campaign
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <p className="text-sm text-slate-600">
            Send this link to friends and family. They&apos;ll land straight on
            the campaign with the Donate button ready.
          </p>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Share link
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="rounded-xl font-mono text-sm"
                data-testid="share-link-input"
              />
              <Button
                onClick={copy}
                className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white shrink-0"
                data-testid="share-copy-button"
              >
                {copied ? (
                  <>
                    <CheckCheck className="h-4 w-4 mr-1.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            {campaign?.share_code && (
              <p className="text-xs text-slate-500 mt-2">
                Share code:{" "}
                <span className="font-mono font-semibold text-blue-900">
                  {campaign.share_code}
                </span>
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Share to
            </p>
            <div className="grid grid-cols-4 gap-3">
              <ShareButton
                onClick={() => openExternal("whatsapp")}
                color="#25D366"
                icon={<MessageCircle className="h-5 w-5" />}
                label="WhatsApp"
                testid="share-whatsapp-button"
              />
              <ShareButton
                onClick={() => openExternal("facebook")}
                color="#1877F2"
                icon={<Facebook className="h-5 w-5" />}
                label="Facebook"
                testid="share-facebook-button"
              />
              <ShareButton
                onClick={() => openExternal("x")}
                color="#0F1419"
                icon={<Twitter className="h-5 w-5" />}
                label="X / Twitter"
                testid="share-x-button"
              />
              <ShareButton
                onClick={() => openExternal("email")}
                color="#475569"
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                testid="share-email-button"
              />
            </div>
          </div>

          <Button
            onClick={tryNativeShare}
            variant="outline"
            className="w-full rounded-xl"
            data-testid="share-native-button"
          >
            More sharing options…
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareButton({ onClick, color, icon, label, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
      data-testid={testid}
    >
      <span
        className="h-10 w-10 rounded-full flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-slate-700 group-hover:text-blue-900">
        {label}
      </span>
    </button>
  );
}
