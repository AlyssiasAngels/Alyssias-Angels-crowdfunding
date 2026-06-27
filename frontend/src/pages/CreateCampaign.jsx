import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, formatApiError, CATEGORIES } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Upload, ImageIcon } from "lucide-react";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [goal, setGoal] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setImageUrl(data.url);
      toast.success("Image uploaded");
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
      const { data } = await api.post("/campaigns", {
        title,
        description,
        category,
        goal_amount: Number(goal),
        image_url: imageUrl,
      });
      toast.success("Campaign created. Awaiting admin PayPal setup.");
      navigate(`/campaigns/${data.id}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
          Create campaign
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-blue-900 tracking-tight mb-8">
          Tell your story
        </h1>

        <form onSubmit={onSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8" data-testid="create-campaign-form">
          <div>
            <Label htmlFor="title">Campaign title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Help Sarah pay for surgery"
              className="mt-1 rounded-xl"
              data-testid="campaign-title-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 rounded-xl" data-testid="campaign-category-select">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} data-testid={`category-option-${c.toLowerCase()}`}>
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
                placeholder="5000"
                className="mt-1 rounded-xl"
                data-testid="campaign-goal-input"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell donors why this matters…"
              rows={6}
              className="mt-1 rounded-xl"
              data-testid="campaign-description-input"
            />
          </div>

          <div>
            <Label>Cover image</Label>
            <div className="mt-1 flex items-start gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer border border-slate-200 hover:border-emerald-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 bg-white">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  className="hidden"
                  data-testid="campaign-image-upload"
                />
              </label>
              {imageUrl ? (
                <div className="text-xs text-emerald-700 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Image attached
                </div>
              ) : (
                <p className="text-xs text-slate-500 self-center">Optional — JPG, PNG, WEBP up to 8MB</p>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" data-testid="create-error">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900">
            After creating, your campaign starts as <strong>Pending</strong>. An admin will
            assign your unique PayPal donation link, then it will go live.
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-xl" data-testid="create-cancel-button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="create-submit-button"
            >
              {submitting ? "Creating…" : "Create campaign"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
