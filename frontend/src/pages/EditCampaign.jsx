import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, formatApiError, imageUrl, CATEGORIES } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { Upload, ImageIcon, X, Trash2, ArrowLeft } from "lucide-react";

export default function EditCampaign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState("Active");
  const [imageUrlState, setImageUrlState] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/campaigns/${id}`);
        setCampaign(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setCategory(data.category || "");
        setGoal(String(data.goal_amount ?? ""));
        setStatus(data.status || "Active");
        setImageUrlState(data.image_url || null);
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12 text-slate-500">Loading…</main>
      </div>
    );
  }
  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4" data-testid="edit-error">
            {error}
          </div>
        </main>
      </div>
    );
  }

  const isOwner = user && (user.id === campaign.user_id || user.role === "admin");
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4" data-testid="edit-forbidden">
            You can only edit your own campaigns.
          </div>
        </main>
      </div>
    );
  }

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
      setImageUrlState(data.url);
      toast.success("New image uploaded");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!category) return setError("Please choose a category");
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        category,
        goal_amount: Number(goal),
        image_url: imageUrlState || "", // empty string clears
        status,
      };
      const { data } = await api.patch(`/campaigns/${id}`, payload);
      toast.success("Campaign updated");
      navigate(`/campaigns/${data.id}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm(
      "Delete this campaign? This will remove all updates and comments. You can't undo this."
    )) return;
    setDeleting(true);
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success("Campaign deleted");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
      setDeleting(false);
    }
  };

  const goalNum = Number(goal || 0);
  const raised = Number(campaign.current_balance_gross || 0);
  const goalTooLow = goalNum < raised;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <button
          onClick={() => navigate(`/campaigns/${id}`)}
          className="text-sm text-blue-900 hover:text-emerald-600 inline-flex items-center gap-1 mb-4"
          data-testid="edit-back-link"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaign
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
          Edit campaign
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-8">
          {campaign.title}
        </h1>

        <form
          onSubmit={onSubmit}
          className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8"
          data-testid="edit-campaign-form"
        >
          <div>
            <Label htmlFor="title">Campaign title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 rounded-xl"
              data-testid="edit-title-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 rounded-xl" data-testid="edit-category-select">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} data-testid={`edit-category-option-${c.toLowerCase()}`}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal">Goal amount (USD)</Label>
              <Input
                id="goal"
                type="number"
                step="1"
                min="1"
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-1 rounded-xl"
                data-testid="edit-goal-input"
              />
              {raised > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Already raised: ${raised.toFixed(2)} — new goal must be at least this.
                </p>
              )}
              {goalTooLow && (
                <p className="text-xs text-red-600 mt-1" data-testid="edit-goal-too-low">
                  Goal must be at least ${raised.toFixed(2)} (amount already raised).
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="mt-1 rounded-xl"
              data-testid="edit-description-input"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 rounded-xl" data-testid="edit-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active" data-testid="edit-status-active">Active</SelectItem>
                <SelectItem value="Paused" data-testid="edit-status-paused">Paused</SelectItem>
                {user.role === "admin" && (
                  <>
                    <SelectItem value="Completed" data-testid="edit-status-completed">Completed (admin)</SelectItem>
                    <SelectItem value="Rejected" data-testid="edit-status-rejected">Rejected (admin)</SelectItem>
                    <SelectItem value="Removed" data-testid="edit-status-removed">Removed (admin)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Pause to hide your campaign from public view temporarily.
            </p>
          </div>

          <div>
            <Label>Cover image</Label>
            <div className="mt-2 flex items-start gap-4">
              {imageUrlState ? (
                <div className="relative">
                  <img
                    src={imageUrl(imageUrlState)}
                    alt=""
                    className="h-28 w-44 object-cover rounded-xl border border-slate-200"
                    data-testid="edit-current-image"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrlState(null)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-600"
                    title="Remove image"
                    data-testid="edit-remove-image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-28 w-44 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                  No image
                </div>
              )}
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 cursor-pointer border border-slate-200 hover:border-emerald-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 bg-white">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : imageUrlState ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onUpload}
                    className="hidden"
                    data-testid="edit-image-upload"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-2">JPG, PNG, WEBP up to 8MB</p>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
              data-testid="edit-form-error"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              data-testid="edit-delete-button"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {deleting ? "Deleting…" : "Delete campaign"}
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/campaigns/${id}`)}
                className="rounded-xl"
                data-testid="edit-cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || goalTooLow}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="edit-submit-button"
              >
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
