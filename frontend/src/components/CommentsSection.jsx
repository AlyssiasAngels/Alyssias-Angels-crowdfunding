import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Trash2 } from "lucide-react";

export default function CommentsSection({ campaignId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/comments`);
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/comments", {
        campaign_id: campaignId,
        body: body.trim(),
        display_name: user ? null : (displayName || "Anonymous"),
      });
      setBody("");
      toast.success("Comment posted");
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (comment_id) => {
    try {
      await api.delete(`/admin/comments/${comment_id}`);
      toast.success("Comment removed");
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8" data-testid="comments-section">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle className="h-5 w-5 text-blue-900" />
        <h2 className="font-heading text-xl font-semibold text-blue-900">
          Comments ({comments.length})
        </h2>
      </div>

      <form onSubmit={submit} className="space-y-3 mb-6" data-testid="comment-form">
        {!user && (
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name (optional)"
            className="rounded-xl"
            maxLength={60}
            data-testid="comment-display-name-input"
          />
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={user ? "Share a word of support…" : "Share a word of support (you can post anonymously)…"}
          rows={3}
          maxLength={1000}
          required
          className="rounded-xl"
          data-testid="comment-body-input"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {user ? `Posting as ${user.full_name}` : "Posting anonymously"} · {body.length}/1000
          </p>
          <Button
            type="submit"
            disabled={submitting || !body.trim()}
            className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white"
            data-testid="comment-submit-button"
          >
            {submitting ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-slate-500" data-testid="comments-empty">
          No comments yet. Be the first to share support.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100" data-testid="comments-list">
          {comments.map((c) => (
            <li key={c.comment_id} className="py-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-900 font-heading font-semibold shrink-0">
                {(c.author_name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{c.author_name}</p>
                  {c.is_anonymous && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Anonymous
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    · {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {user?.role === "admin" && (
                <button
                  onClick={() => remove(c.comment_id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                  title="Remove comment"
                  data-testid={`comment-delete-${c.comment_id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
