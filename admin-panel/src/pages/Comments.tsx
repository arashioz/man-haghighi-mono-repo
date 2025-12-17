import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { api } from '../services/api';
import { Comment } from '../types';

const CommentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-12 w-12"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 8.25h9m-9 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0Zm-3.75 4.874a3.001 3.001 0 00-2.02.424L12 18l-3.23-1.7a3 3 0 00-2.02-.425"
    />
  </svg>
);

type Filters = {
  targetType?: 'ARTICLE' | 'PODCAST' | 'COURSE';
  isPublished?: boolean;
  search?: string;
};

const Comments: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ isPublished?: boolean; editedContent?: string }>({});

  const fetchComments = useMemo(
    () => async (pageParam = page, filtersParam = filters) => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/admin/comments', {
          params: {
            page: pageParam,
            limit,
            targetType: filtersParam.targetType,
            isPublished: typeof filtersParam.isPublished === 'boolean' ? filtersParam.isPublished : undefined,
            search: filtersParam.search,
          },
        });
        const data = response.data;
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        setComments(list);
        setTotalPages(data?.meta?.totalPages || 1);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'خطا در دریافت نظرات');
        setComments([]);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, filters],
  );

  useEffect(() => {
    fetchComments(page, filters);
  }, [fetchComments, page, filters]);

  const applyFilters = (f: Filters) => {
    setPage(1);
    setFilters(f);
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditData({
      isPublished: comment.isPublished,
      editedContent: comment.editedContent || comment.content,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await api.patch(`/admin/comments/${editingId}`, editData);
      setEditingId(null);
      setEditData({});
      fetchComments(page, filters);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در ذخیره تغییرات');
    }
  };

  const deleteComment = async (id: string) => {
    if (!window.confirm('حذف این نظر؟')) return;
    try {
      await api.delete(`/admin/comments/${id}`);
      fetchComments(page, filters);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در حذف نظر');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="نظرات" description="مدیریت، انتشار و ویرایش نظرات کاربران" />

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">نوع محتوا</label>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={filters.targetType || ''}
            onChange={(e) => applyFilters({ ...filters, targetType: (e.target.value || undefined) as any })}
          >
            <option value="">همه</option>
            <option value="ARTICLE">مقاله</option>
            <option value="PODCAST">پادکست</option>
            <option value="COURSE">دوره</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">وضعیت انتشار</label>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={
              typeof filters.isPublished === 'boolean'
                ? filters.isPublished
                  ? 'published'
                  : 'unpublished'
                : ''
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'published') applyFilters({ ...filters, isPublished: true });
              else if (val === 'unpublished') applyFilters({ ...filters, isPublished: false });
              else applyFilters({ ...filters, isPublished: undefined });
            }}
          >
            <option value="">همه</option>
            <option value="published">منتشر شده</option>
            <option value="unpublished">در انتظار انتشار</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">جستجو در متن/نام/تلفن</label>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="عبارت جستجو..."
            value={filters.search || ''}
            onChange={(e) => applyFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<CommentIcon />}
          title="نظری ثبت نشده"
          description="هنوز نظری ثبت نشده است."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-700">نام</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">نوع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">متن</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">وضعیت</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comments.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{c.authorName}</div>
                      {c.authorPhone && <div className="text-xs text-gray-500 mt-1">{c.authorPhone}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('fa-IR') : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.targetType === 'ARTICLE' ? 'مقاله' : c.targetType === 'PODCAST' ? 'پادکست' : 'دوره'}
                      <div className="text-xs text-gray-400 mt-1">{c.targetId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      {isEditing ? (
                        <textarea
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                          rows={3}
                          value={editData.editedContent ?? ''}
                          onChange={(e) => setEditData((p) => ({ ...p, editedContent: e.target.value }))}
                        />
                      ) : (
                        <div className="text-sm text-gray-800 line-clamp-3">{c.editedContent || c.content}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                          value={editData.isPublished === true ? '1' : editData.isPublished === false ? '0' : ''}
                          onChange={(e) =>
                            setEditData((p) => ({
                              ...p,
                              isPublished: e.target.value === '' ? undefined : e.target.value === '1',
                            }))
                          }
                        >
                          <option value="">تغییر نده</option>
                          <option value="1">منتشر شود</option>
                          <option value="0">منتشر نشود</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            c.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {c.isPublished ? 'منتشر' : 'در انتظار'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 space-y-2">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                            onClick={saveEdit}
                          >
                            ذخیره
                          </button>
                          <button
                            className="px-3 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                            onClick={() => {
                              setEditingId(null);
                              setEditData({});
                            }}
                          >
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                            onClick={() => startEdit(c)}
                          >
                            ویرایش/انتشار
                          </button>
                          <button
                            className="px-3 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                            onClick={() => deleteComment(c.id)}
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <div>
              صفحه {page} از {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
              >
                قبلی
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comments;


