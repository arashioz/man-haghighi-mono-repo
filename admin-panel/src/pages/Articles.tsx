import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import SeoPreview from '../components/SeoPreview';
import ProgressBar from '../components/ProgressBar';
import { articlesService, API_ORIGIN } from '../services/api';
import { Article } from '../types';

const Articles: React.FC = () => {
  // State management
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'advanced'>('editor');
  const [editActiveTab, setEditActiveTab] = useState<'editor' | 'seo' | 'advanced'>('editor');
  
  // Article form state
  const [newArticle, setNewArticle] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [] as string[],
    focusKeyword: '',
    author: '',
    tags: [] as string[],
    published: false,
  });

  // Image upload state
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [editFeaturedImageFile, setEditFeaturedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch articles on component mount
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await articlesService.getAll({
        page: pageNum,
        limit: 10,
      });
      // پشتیبانی از شکل { data, meta } و حالت آرایه‌ای
      const rawData = response?.data ?? response;
      const data = Array.isArray(rawData) ? rawData : [];
      const meta = response?.meta ?? {};
      const total = typeof meta.total === 'number' ? meta.total : 0;
      const totalPagesCount = typeof meta.totalPages === 'number' ? meta.totalPages : Math.max(1, total ? Math.ceil(total / 10) : 1);
      setArticles(data);
      setTotalPages(totalPagesCount);
      setTotalItems(total);
      setCurrentPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت مقالات');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setNewArticle(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      metaTitle: title,
    }));
  };

  // Article CRUD operations
  const uploadFeaturedImage = async (articleId: string, file: File) => {
    setIsUploadingImage(true);
    setUploadProgress(0);
    try {
      await articlesService.uploadFeaturedImage(articleId, file, (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setNewArticle({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: [],
      focusKeyword: '',
      author: '',
      tags: [],
      published: false,
    });
    setFeaturedImageFile(null);
    setImagePreview(null);
    setIsModalOpen(false);
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const createdArticle = await articlesService.create(newArticle);
      
      if (featuredImageFile) {
        await uploadFeaturedImage(createdArticle.id, featuredImageFile);
      }

      resetForm();
      fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد مقاله');
    }
  };

  const handleUpdateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle?.id) return;
    setEditError('');
    try {
      const payload = {
        title: editingArticle.title,
        slug: editingArticle.slug,
        content: editingArticle.content,
        excerpt: editingArticle.excerpt,
        metaTitle: editingArticle.metaTitle,
        metaDescription: editingArticle.metaDescription,
        metaKeywords: editingArticle.metaKeywords,
        focusKeyword: editingArticle.focusKeyword,
        author: editingArticle.author,
        published: editingArticle.published,
        tags: editingArticle.tags,
      };
      const updatedArticle = await articlesService.update(editingArticle.id, payload);
      if (editFeaturedImageFile) {
        await uploadFeaturedImage(editingArticle.id, editFeaturedImageFile);
      }
      setArticles(articles.map(article =>
        article.id === editingArticle.id ? { ...article, ...updatedArticle } : article
      ));
      setIsEditModalOpen(false);
      setEditingArticle(null);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'خطا در ویرایش مقاله');
    }
  };

  const getFeaturedImageUrl = (img: string | undefined) => {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${API_ORIGIN}/uploads/${img}`;
  };

  const handleEditArticle = async (article: Article) => {
    setEditLoading(true);
    setEditError('');
    setIsEditModalOpen(true);
    setEditingArticle(null);
    try {
      const full = await articlesService.getById(article.id);
      const art: Article = {
        ...full,
        id: full.id || '',
        title: full.title || '',
        slug: full.slug || '',
        content: full.content || '',
        excerpt: full.excerpt || '',
        metaTitle: full.metaTitle || '',
        metaDescription: full.metaDescription || '',
        focusKeyword: full.focusKeyword || '',
        author: full.author || '',
        published: full.published ?? false,
        featuredImage: full.featuredImage || undefined,
        metaKeywords: full.metaKeywords || [],
        tags: full.tags || [],
        createdAt: full.createdAt || new Date().toISOString(),
        updatedAt: full.updatedAt || new Date().toISOString(),
        readingTime: full.readingTime ?? 0,
        viewCount: full.viewCount ?? 0,
      };
      setEditingArticle(art);
      setEditActiveTab('editor');
      setEditFeaturedImageFile(null);
      setEditImagePreview(getFeaturedImageUrl(full.featuredImage) || full.featuredImage || null);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'خطا در بارگذاری مقاله');
      setIsEditModalOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm('آیا از حذف این مقاله اطمینان دارید؟')) return;
    
    try {
      await articlesService.delete(id);
      setArticles(articles.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف مقاله');
    }
  };

  // UI Components
  const AddButton = () => (
    <button 
      onClick={() => setIsModalOpen(true)}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span className="mr-2">مقاله جدید</span>
    </button>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="مقالات" 
        description="مدیریت مقالات و محتوای سئو شده"
        action={<AddButton />}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {articles.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {/* Table Header */}
                <thead className="bg-gray-50">
                  <tr>
                    {['مقاله', 'نویسنده', 'بازدید', 'وضعیت', 'تاریخ', 'عملیات'].map((header) => (
                      <th key={header} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                
                {/* Table Body */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {article.featuredImage ? (
                            <img src={getFeaturedImageUrl(article.featuredImage) || article.featuredImage} alt={article.title} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center text-white">
                              {article.title?.[0] || 'A'}
                            </div>
                          )}
                          <div className="mr-4">
                            <div className="font-medium text-gray-900">{article.title}</div>
                            {article.readingTime && (
                              <div className="text-gray-500">{article.readingTime} دقیقه مطالعه</div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {article.author || 'ناشناس'}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {article.viewCount}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          article.published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {article.published ? 'منتشر شده' : 'پیش‌نویس'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(article.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      
                      {/* Action buttons */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2 space-x-reverse">
                          <button 
                            onClick={() => handleEditArticle(article)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="ویرایش"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="حذف"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                {totalItems > 0
                  ? `نمایش ${(currentPage - 1) * 10 + 1} تا ${Math.min(currentPage * 10, totalItems)} از ${totalItems} مقاله`
                  : `نمایش ${articles.length} مقاله`}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => fetchArticles(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 border rounded-md text-sm ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  قبلی
                </button>
                {(() => {
                  const pages: number[] = [];
                  const show = 5;
                  let start = Math.max(1, currentPage - Math.floor(show / 2));
                  let end = Math.min(totalPages, start + show - 1);
                  if (end - start + 1 < show) start = Math.max(1, end - show + 1);
                  for (let p = start; p <= end; p++) pages.push(p);
                  return (
                    <>
                      {start > 1 && (
                        <>
                          <button onClick={() => fetchArticles(1)} className="px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-100">1</button>
                          {start > 2 && <span className="px-1 text-gray-500">…</span>}
                        </>
                      )}
                      {pages.map((page) => (
                        <button
                          key={page}
                          onClick={() => fetchArticles(page)}
                          className={`px-3 py-1.5 border rounded-md text-sm min-w-[2.25rem] ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          {page}
                        </button>
                      ))}
                      {end < totalPages && (
                        <>
                          {end < totalPages - 1 && <span className="px-1 text-gray-500">…</span>}
                          <button onClick={() => fetchArticles(totalPages)} className="px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-100">{totalPages}</button>
                        </>
                      )}
                    </>
                  );
                })()}
                <button
                  onClick={() => fetchArticles(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 border rounded-md text-sm ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  بعدی
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            مقاله‌ای یافت نشد
          </div>
        )}
      </div>

      {/* Add Article Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="مقاله جدید"
        size="xl"
      >
        <form onSubmit={handleAddArticle} className="space-y-4">
          <div className="flex border-b border-gray-200 mb-4">
            {(['editor', 'seo', 'advanced'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'editor' ? 'ویرایشگر' : tab === 'seo' ? 'سئو' : 'پیشرفته'}
              </button>
            ))}
          </div>
          {activeTab === 'editor' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان</label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسلاگ</label>
                <input
                  type="text"
                  value={newArticle.slug}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">محتوا</label>
                <RichTextEditor
                  value={newArticle.content}
                  onChange={(content) => setNewArticle(prev => ({ ...prev, content }))}
                  height={280}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">خلاصه</label>
                <textarea
                  value={newArticle.excerpt}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, excerpt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تصویر شاخص</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFeaturedImageFile(f);
                      setImagePreview(URL.createObjectURL(f));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {imagePreview && <img src={imagePreview} alt="پیش‌نمایش" className="mt-2 h-24 rounded object-cover" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نویسنده</label>
                <input
                  type="text"
                  value={newArticle.author}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="new-published"
                  checked={newArticle.published}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, published: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="new-published" className="mr-2 text-sm text-gray-700">منتشر شود</label>
              </div>
            </div>
          )}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان متا</label>
                <input
                  type="text"
                  value={newArticle.metaTitle}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, metaTitle: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات متا</label>
                <textarea
                  value={newArticle.metaDescription}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, metaDescription: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کلمه کلیدی تمرکز</label>
                <input
                  type="text"
                  value={newArticle.focusKeyword}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, focusKeyword: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کلمات کلیدی متا (با کاما)</label>
                <input
                  type="text"
                  value={newArticle.metaKeywords.join(', ')}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, metaKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <SeoPreview title={newArticle.metaTitle} description={newArticle.metaDescription} slug={newArticle.slug} />
            </div>
          )}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">برچسب‌ها (با کاما)</label>
                <input
                  type="text"
                  value={newArticle.tags.join(', ')}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">انصراف</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ذخیره</button>
          </div>
        </form>
      </Modal>

      {/* Edit Article Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingArticle(null);
          setEditError('');
        }}
        title="ویرایش مقاله"
        size="xl"
      >
        {editLoading ? (
          <div className="py-8 flex justify-center"><LoadingSpinner /></div>
        ) : editingArticle ? (
          <form onSubmit={handleUpdateArticle} className="space-y-4">
            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">{editError}</div>
            )}
            <div className="flex border-b border-gray-200 mb-4">
              {(['editor', 'seo', 'advanced'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEditActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${editActiveTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'editor' ? 'ویرایشگر' : tab === 'seo' ? 'سئو' : 'پیشرفته'}
                </button>
              ))}
            </div>
            {editActiveTab === 'editor' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عنوان</label>
                  <input
                    type="text"
                    value={editingArticle.title}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, title: e.target.value, slug: generateSlug(e.target.value), metaTitle: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسلاگ</label>
                  <input
                    type="text"
                    value={editingArticle.slug}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, slug: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">محتوا</label>
                  <RichTextEditor
                    value={editingArticle.content}
                    onChange={(content) => setEditingArticle(prev => prev ? { ...prev, content } : null)}
                    height={280}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">خلاصه</label>
                  <textarea
                    value={editingArticle.excerpt || ''}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, excerpt: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تصویر شاخص</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setEditFeaturedImageFile(f);
                        setEditImagePreview(URL.createObjectURL(f));
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  {(editImagePreview || editingArticle.featuredImage) && (
                    <img src={editImagePreview || getFeaturedImageUrl(editingArticle.featuredImage) || ''} alt="پیش‌نمایش" className="mt-2 h-24 rounded object-cover" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نویسنده</label>
                  <input
                    type="text"
                    value={editingArticle.author || ''}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, author: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-published"
                    checked={editingArticle.published}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, published: e.target.checked } : null)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="edit-published" className="mr-2 text-sm text-gray-700">منتشر شود</label>
                </div>
              </div>
            )}
            {editActiveTab === 'seo' && editingArticle && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عنوان متا</label>
                  <input
                    type="text"
                    value={editingArticle.metaTitle || ''}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, metaTitle: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات متا</label>
                  <textarea
                    value={editingArticle.metaDescription || ''}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, metaDescription: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کلمه کلیدی تمرکز</label>
                  <input
                    type="text"
                    value={editingArticle.focusKeyword || ''}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, focusKeyword: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کلمات کلیدی متا (با کاما)</label>
                  <input
                    type="text"
                    value={(editingArticle.metaKeywords || []).join(', ')}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, metaKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <SeoPreview title={editingArticle.metaTitle || ''} description={editingArticle.metaDescription || ''} slug={editingArticle.slug} />
              </div>
            )}
            {editActiveTab === 'advanced' && editingArticle && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">برچسب‌ها (با کاما)</label>
                  <input
                    type="text"
                    value={(editingArticle.tags || []).join(', ')}
                    onChange={(e) => setEditingArticle(prev => prev ? { ...prev, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingArticle(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">انصراف</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ذخیره تغییرات</button>
            </div>
          </form>
        ) : !editLoading && (
          <div className="py-8 text-center text-gray-500">مقاله‌ای انتخاب نشده است.</div>
        )}
      </Modal>
    </div>
  );
};

export default Articles;