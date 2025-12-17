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

  const api = useMemo(() => {
    if (targetType === 'ARTICLE') {
      return {
        list: () => commentsService.getArticleComments(targetId),
        create: (data: typeof form) =>
          commentsService.createArticleComment(targetId, {
            authorName: data.authorName,
            authorPhone: data.authorPhone || undefined,
            content: data.content,
          }),
      };
    }
    if (targetType === 'PODCAST') {
      return {
        list: () => commentsService.getPodcastComments(targetId),
        create: (data: typeof form) =>
          commentsService.createPodcastComment(targetId, {
            authorName: data.authorName,
            authorPhone: data.authorPhone || undefined,
            content: data.content,
          }),
      };
    }
    return {
      list: () => commentsService.getCourseComments(targetId),
      create: (data: typeof form) =>
        commentsService.createCourseComment(targetId, {
          authorName: data.authorName,
          authorPhone: data.authorPhone || undefined,
          content: data.content,
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
    } catch (e: any) {
      alert(e?.response?.data?.message || 'خطا در ثبت نظر');
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowComments) {
    return (
      <section className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h3 className="text-xl font-bold text-right text-white">{title}</h3>
        <p className="mt-3 text-sm text-white/60 text-right">ثبت نظر برای این محتوا غیرفعال است.</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-right text-white">{title}</h3>
        <span className="text-xs text-white/50">{items.length} نظر</span>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-white/70 mb-2 text-right">نام و نام خانوادگی</label>
            <input
              value={form.authorName}
              onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
              placeholder="مثلاً: علی رضایی"
              required
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2 text-right">شماره تماس (اختیاری)</label>
            <input
              value={form.authorPhone}
              onChange={(e) => setForm((p) => ({ ...p, authorPhone: e.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
              placeholder="مثلاً: 0912xxxxxxx"
              maxLength={30}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-2 text-right">متن نظر</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
            placeholder="نظر خود را بنویسید..."
            required
            maxLength={5000}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="justify-self-start rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.6)] transition hover:scale-105 disabled:opacity-60"
        >
          {submitting ? 'در حال ارسال...' : 'ثبت نظر'}
        </button>
      </form>

      <div className="mt-8 border-t border-white/10 pt-6">
        {loading ? (
          <div className="text-sm text-white/60 text-right">در حال بارگذاری نظرات...</div>
        ) : error ? (
          <div className="text-sm text-red-300 text-right">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-white/60 text-right">هنوز نظری ثبت نشده است.</div>
        ) : (
          <ul className="grid gap-4">
            {items.map((c) => (
              <li key={c.id} className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-yellow-400">{c.authorName}</div>
                  <div className="text-xs text-white/50">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('fa-IR') : ''}
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/80 leading-relaxed text-right">
                  {(c.editedContent || c.content) ?? ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};


