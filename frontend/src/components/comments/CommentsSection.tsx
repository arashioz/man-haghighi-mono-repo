import React, { useEffect, useMemo, useState } from 'react';
import { Comment, CommentTargetType } from '../../types';
import { commentsService } from '../../services/api';

type Props = {
  targetType: CommentTargetType;
  targetId: string;
  allowComments?: boolean;
  title?: string;
};

export const CommentsSection: React.FC<Props> = ({ targetType, targetId, allowComments = true, title = 'نظرات' }) => {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ authorName: '', authorPhone: '', content: '' });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyForm, setReplyForm] = useState({ authorName: '', authorPhone: '', content: '' });

  const api = useMemo(() => {
    if (targetType === 'ARTICLE') {
      return {
        list: () => commentsService.getArticleComments(targetId),
        create: (data: typeof form & { parentId?: string }) =>
          commentsService.createArticleComment(targetId, {
            authorName: data.authorName,
            authorPhone: data.authorPhone || undefined,
            content: data.content,
            parentId: data.parentId,
          }),
      };
    }
    if (targetType === 'PODCAST') {
      return {
        list: () => commentsService.getPodcastComments(targetId),
        create: (data: typeof form & { parentId?: string }) =>
          commentsService.createPodcastComment(targetId, {
            authorName: data.authorName,
            authorPhone: data.authorPhone || undefined,
            content: data.content,
            parentId: data.parentId,
          }),
      };
    }
    return {
      list: () => commentsService.getCourseComments(targetId),
      create: (data: typeof form & { parentId?: string }) =>
        commentsService.createCourseComment(targetId, {
          authorName: data.authorName,
          authorPhone: data.authorPhone || undefined,
          content: data.content,
          parentId: data.parentId,
        }),
    };
  }, [targetType, targetId]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!allowComments) {
        setLoading(false);
        setItems([]);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const data = await api.list();
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.message || 'خطا در دریافت نظرات');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [api, allowComments]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowComments) return;
    setSubmitting(true);
    try {
      await api.create(form);
      alert('نظر شما ثبت شد و پس از تایید ادمین در سایت نمایش داده می‌شود.');
      setForm({ authorName: '', authorPhone: '', content: '' });
      // Refresh comments
      const data = await api.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'خطا در ثبت نظر');
    } finally {
      setSubmitting(false);
    }
  };

  const onReplySubmit = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!allowComments) return;
    setSubmitting(true);
    try {
      await api.create({ ...replyForm, parentId });
      alert('پاسخ شما ثبت شد و پس از تایید ادمین در سایت نمایش داده می‌شود.');
      setReplyForm({ authorName: '', authorPhone: '', content: '' });
      setReplyingTo(null);
      // Refresh comments
      const data = await api.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'خطا در ثبت پاسخ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowComments) {
    return (
      <section className="mt-10 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl shadow-2xl">
        <h3 className="text-xl font-bold text-right text-white">{title}</h3>
        <p className="mt-3 text-sm text-white/60 text-right">ثبت نظر برای این محتوا غیرفعال است.</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 sm:p-8 backdrop-blur-xl shadow-2xl" dir="rtl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h3 className="text-2xl font-bold text-right text-white">{title}</h3>
        <span className="text-sm text-white/50 bg-white/10 px-4 py-2 rounded-full">{items.length} نظر</span>
      </div>

      {/* Comment Form */}
      <form onSubmit={onSubmit} className="mb-8 space-y-4 bg-black/20 rounded-2xl p-6 border border-white/10">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 text-right">نام و نام خانوادگی</label>
            <input
              value={form.authorName}
              onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-white/40 outline-none transition-all focus:border-yellow-400/60 focus:bg-black/60 focus:ring-2 focus:ring-yellow-400/20"
              placeholder="مثلاً: علی رضایی"
              required
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 text-right">شماره تماس (اختیاری)</label>
            <input
              value={form.authorPhone}
              onChange={(e) => setForm((p) => ({ ...p, authorPhone: e.target.value }))}
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-white/40 outline-none transition-all focus:border-yellow-400/60 focus:bg-black/60 focus:ring-2 focus:ring-yellow-400/20"
              placeholder="مثلاً: 0912xxxxxxx"
              maxLength={30}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2 text-right">متن نظر</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            className="min-h-[140px] w-full resize-none rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-white/40 outline-none transition-all focus:border-yellow-400/60 focus:bg-black/60 focus:ring-2 focus:ring-yellow-400/20"
            placeholder="نظر خود را بنویسید..."
            required
            maxLength={5000}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto justify-self-start rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.6)] transition-all hover:scale-105 hover:shadow-[0_25px_60px_-15px_rgba(250,204,21,0.8)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {submitting ? 'در حال ارسال...' : 'ثبت نظر'}
        </button>
      </form>

      {/* Comments List */}
      <div className="border-t border-white/10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
            <span className="mr-3 text-sm text-white/60">در حال بارگذاری نظرات...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-300 text-right bg-red-500/10 border border-red-500/30 rounded-xl p-4">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-sm text-white/60">هنوز نظری ثبت نشده است.</p>
            <p className="text-xs text-white/40 mt-2">اولین کسی باشید که نظر می‌دهد!</p>
          </div>
        ) : (
          <ul className="space-y-6">
            {items.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyForm={replyForm}
                setReplyForm={setReplyForm}
                onReplySubmit={onReplySubmit}
                submitting={submitting}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

// Comment Item Component
const CommentItem: React.FC<{
  comment: Comment;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyForm: { authorName: string; authorPhone: string; content: string };
  setReplyForm: (form: { authorName: string; authorPhone: string; content: string }) => void;
  onReplySubmit: (e: React.FormEvent, parentId: string) => void;
  submitting: boolean;
}> = ({ comment, replyingTo, setReplyingTo, replyForm, setReplyForm, onReplySubmit, submitting }) => {
  const isReplying = replyingTo === comment.id;

  return (
    <li className="group">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 p-5 sm:p-6 transition-all hover:border-yellow-400/30 hover:shadow-lg">
        {/* Comment Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center text-yellow-400 font-bold text-lg border border-yellow-400/30">
              {comment.authorName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold text-yellow-400">{comment.authorName}</div>
              <div className="text-xs text-white/50 mt-1">
                {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('fa-IR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (isReplying) {
                setReplyingTo(null);
                setReplyForm({ authorName: '', authorPhone: '', content: '' });
              } else {
                setReplyingTo(comment.id);
                setReplyForm({ authorName: '', authorPhone: '', content: '' });
              }
            }}
            className="text-xs text-white/60 hover:text-yellow-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            {isReplying ? '✕ لغو' : '↩ پاسخ'}
          </button>
        </div>

        {/* Comment Content */}
        <p className="text-sm text-white/90 leading-relaxed text-right mb-4 whitespace-pre-wrap">
          {(comment.editedContent || comment.content) ?? ''}
        </p>

        {/* Reply Form */}
        {isReplying && (
          <form
            onSubmit={(e) => onReplySubmit(e, comment.id)}
            className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-black/20 rounded-xl p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={replyForm.authorName}
                onChange={(e) => setReplyForm({ ...replyForm, authorName: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-yellow-400/60"
                placeholder="نام شما"
                required
                maxLength={80}
              />
              <input
                value={replyForm.authorPhone}
                onChange={(e) => setReplyForm({ ...replyForm, authorPhone: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-yellow-400/60"
                placeholder="شماره تماس (اختیاری)"
                maxLength={30}
              />
            </div>
            <textarea
              value={replyForm.content}
              onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })}
              className="w-full min-h-[80px] resize-none rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-yellow-400/60"
              placeholder="پاسخ خود را بنویسید..."
              required
              maxLength={2000}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50"
              >
                {submitting ? 'ارسال...' : 'ارسال پاسخ'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyForm({ authorName: '', authorPhone: '', content: '' });
                }}
                className="px-4 py-2 bg-white/10 text-white/70 text-xs rounded-lg hover:bg-white/20 transition-colors"
              >
                لغو
              </button>
            </div>
          </form>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 pr-4 sm:pr-8 border-r-2 border-yellow-400/20">
            <div className="space-y-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="rounded-xl border border-white/5 bg-black/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400/20 to-purple-600/20 flex items-center justify-center text-purple-400 font-semibold text-sm border border-purple-400/30">
                      {reply.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-purple-400">{reply.authorName}</div>
                      <div className="text-xs text-white/40">
                        {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('fa-IR') : ''}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed text-right whitespace-pre-wrap">
                    {(reply.editedContent || reply.content) ?? ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </li>
  );
};
