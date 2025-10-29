import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import SeoPreview from '../components/SeoPreview';
import { articlesService } from '../services/api';
import { Article } from '../types';

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'advanced'>('editor');
  
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

  const [keywordInput, setKeywordInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await articlesService.getAll();
      setArticles(response.data || response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت مقالات');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setNewArticle({
      ...newArticle,
      title,
      slug: generateSlug(title),
      metaTitle: title,
    });
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !newArticle.metaKeywords.includes(keywordInput.trim())) {
      setNewArticle({
        ...newArticle,
        metaKeywords: [...newArticle.metaKeywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setNewArticle({
      ...newArticle,
      metaKeywords: newArticle.metaKeywords.filter(k => k !== keyword),
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newArticle.tags.includes(tagInput.trim())) {
      setNewArticle({
        ...newArticle,
        tags: [...newArticle.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewArticle({
      ...newArticle,
      tags: newArticle.tags.filter(t => t !== tag),
    });
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await articlesService.create(newArticle);
      setIsModalOpen(false);
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
      fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد مقاله');
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setIsEditModalOpen(true);
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!window.confirm('آیا از حذف این مقاله اطمینان دارید؟')) {
      return;
    }

    try {
      await articlesService.delete(articleId);
      setArticles(articles.filter(article => article.id !== articleId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف مقاله');
    }
  };

  const handleUpdateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    try {
      const updatedArticle = await articlesService.update(editingArticle.id, editingArticle);
      setArticles(articles.map(article => 
        article.id === editingArticle.id ? updatedArticle : article
      ));
      setIsEditModalOpen(false);
      setEditingArticle(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ویرایش مقاله');
    }
  };

  const AddButton = () => (
    <button 
      onClick={() => setIsModalOpen(true)}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span className="mr-2">مقاله جدید</span>
    </button>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const ArticleIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="مقالات" 
        description="مدیریت مقالات و محتوای سئو شده"
        action={<AddButton />}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {articles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مقاله
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نویسنده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    بازدید
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {article.featuredImage ? (
                            <img
                              src={article.featuredImage}
                              alt={article.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center text-white font-medium">
                              {article.title?.[0] || 'A'}
                            </div>
                          )}
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {article.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {article.readingTime && `${article.readingTime} دقیقه مطالعه`}
                          </div>
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
        ) : (
          <div className="p-6">
            <EmptyState
              icon={<ArticleIcon />}
              title="مقاله‌ای یافت نشد"
              description="هنوز مقاله‌ای ثبت نشده است."
              action={<AddButton />}
            />
          </div>
        )}
      </div>

      {/* Add Article Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="مقاله جدید"
        size="large"
      >
        <form onSubmit={handleAddArticle} className="space-y-4">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 space-x-reverse">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'editor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ویرایشگر
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'seo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                تنظیمات SEO
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('advanced')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'advanced'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                پیشرفته
              </button>
            </nav>
          </div>

          {/* Editor Tab */}
          {activeTab === 'editor' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان مقاله *
                </label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (نامک)
                </label>
                <input
                  type="text"
                  value={newArticle.slug}
                  onChange={(e) => setNewArticle({...newArticle, slug: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  محتوای مقاله *
                </label>
                <RichTextEditor
                  value={newArticle.content}
                  onChange={(value) => setNewArticle({...newArticle, content: value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  خلاصه مقاله
                </label>
                <textarea
                  value={newArticle.excerpt}
                  onChange={(e) => setNewArticle({...newArticle, excerpt: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="خلاصه‌ای کوتاه از مقاله..."
                />
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <SeoPreview
                    title={newArticle.metaTitle || newArticle.title}
                    metaDescription={newArticle.metaDescription}
                    slug={newArticle.slug}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان سئو (Meta Title)
                  </label>
                  <input
                    type="text"
                    value={newArticle.metaTitle}
                    onChange={(e) => setNewArticle({...newArticle, metaTitle: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="اگر خالی باشد، از عنوان مقاله استفاده می‌شود"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    توضیحات سئو (Meta Description)
                  </label>
                  <textarea
                    value={newArticle.metaDescription}
                    onChange={(e) => setNewArticle({...newArticle, metaDescription: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="توضیحات مختصری که در نتایج جستجو نمایش داده می‌شود (120-160 کاراکتر)"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کلمه کلیدی اصلی
                  </label>
                  <input
                    type="text"
                    value={newArticle.focusKeyword}
                    onChange={(e) => setNewArticle({...newArticle, focusKeyword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="کلمه کلیدی اصلی مقاله"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کلمات کلیدی (Keywords)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="کلمه کلیدی را وارد کنید"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      افزودن
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newArticle.metaKeywords.map((keyword, index) => (
                      <span key={index} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="mr-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نویسنده
                </label>
                <input
                  type="text"
                  value={newArticle.author}
                  onChange={(e) => setNewArticle({...newArticle, author: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="نام نویسنده مقاله"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تگ‌ها
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="تگ را وارد کنید"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    افزودن
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newArticle.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="mr-2 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newArticle.published}
                  onChange={(e) => setNewArticle({...newArticle, published: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="mr-2 block text-sm text-gray-900">
                  انتشار مقاله
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
            >
              ایجاد مقاله
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Articles;
