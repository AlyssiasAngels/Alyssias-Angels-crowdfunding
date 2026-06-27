import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError, imageUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Megaphone, Trash2, Plus, Upload, X } from "lucide-react";

export default function CampaignUpdates({ campaignId, ownerId }) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [updateImageUrl, setUpdateImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = user?.id === ownerId || user?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/updates`);
      setUpdates(data);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUpdateImageUrl(data.url);
      toast.success("Image attached");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/campaigns/${campaignId}/updates`, {
        title: title.trim(),
        body: body.trim(),
        image_url: updateImageUrl,
      });
      toast.success("Update posted");
      setTitle("");
      setBody("");
      setUpdateImageUrl(null);
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (update_id) => {
    if (!window.confirm("Delete this update?")) return;
    try {
      await api.delete(`/campaigns/${campaignId}/updates/${update_id}`);
      toast.success("Update removed");
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8" data-testid="updates-section">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-900" />
          <h2 className="font-heading text-xl font-semibold text-blue-900">
            Updates ({updates.length})
          </h2>
        </div>
        {isOwner && !showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
            data-testid="updates-new-button"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Post update
          </Button>
        )}
      </div>

      {isOwner && showForm && (
        <form
          onSubmit={submit}
          className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 mb-6"
          data-testid="updates-form"
        >
          <div>
            <Label htmlFor="update-title">Title</Label>
            <Input
              id="update-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 2: Surgery scheduled"
              maxLength={120}
              required
              className="mt-1 rounded-xl bg-white"
              data-testid="updates-title-input"
            />
          </div>
          <div>
            <Label htmlFor="update-body">Your update</Label>
            <Textarea
              id="update-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share progress, milestones, photos, or a thank-you to donors…"
              rows={5}
              maxLength={5000}
              required
              className="mt-1 rounded-xl bg-white"
              data-testid="updates-body-input"
            />
            <p className="text-xs text-slate-500 mt-1">{body.length}/5000</p>
          </div>
          <div>
            <Label>Photo <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer border border-slate-200 hover:border-emerald-500 bg-white rounded-xl px-4 py-2 text-sm font-medium text-slate-700">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : updateImageUrl ? "Replace photo" : "Attach photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  className="hidden"
                  data-testid="updates-image-upload"
                />
              </label>
              {updateImageUrl && (
                <div className="relative">
                  <img
                    src={imageUrl(updateImageUrl)}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setUpdateImageUrl(null)}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setBody("");
                setUpdateImageUrl(null);
              }}
              className="rounded-xl"
              data-testid="updates-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="updates-submit-button"
            >
              {submitting ? "Posting…" : "Post update"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : updates.length === 0 ? (
        <div className="text-sm text-slate-500" data-testid="updates-empty">
          No updates yet.{" "}
          {isOwner && "Share your first progress note to keep donors engaged."}
        </div>
      ) : (
        <ol className="space-y-6" data-testid="updates-list">
          {updates.map((u, idx) => (
            <li
              key={u.update_id}
              className="relative pl-8 pb-6 border-l-2 border-emerald-200 last:border-l-transparent last:pb-0"
              data-testid={`update-item-${u.update_id}`}
            >
              <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg font-semibold text-blue-900 leading-snug">
                    {u.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {u.author_name} ·{" "}
                    {new Date(u.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => remove(u.update_id)}
                    className="text-slate-400 hover:text-red-600 p-1 shrink-0"
                    title="Delete update"
                    data-testid={`update-delete-${u.update_id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {u.image_url && (
                <img
                  src={imageUrl(u.image_url)}
                  alt=""
                  className="mt-3 rounded-xl max-h-80 w-full object-cover border border-slate-200"
                />
              )}
              <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap break-words">
                {u.body}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
