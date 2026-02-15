import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import SeoPreview from '../components/SeoPreview';
import ProgressBar from '../components/ProgressBar';
import { articlesService } from '../services/api';
import { Article } from '../types';

const Articles: React.FC = () => {
  // State management
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'advanced'>('editor');
  
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
      const data = response?.data ?? [];
      const meta = response?.meta ?? {};
      setArticles(Array.isArray(data) ? data : []);
      setTotalPages(meta.totalPages ?? 1);
      setTotalItems(meta.total ?? 0);
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

    try {
      const updatedArticle = await articlesService.update(editingArticle.id, editingArticle);
      
      if (editFeaturedImageFile) {
        await uploadFeaturedImage(editingArticle.id, editFeaturedImageFile);
      }

      setArticles(articles.map(article => 
        article.id === editingArticle.id ? updatedArticle : article
      ));
      setIsEditModalOpen(false);
      setEditingArticle(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ویرایش مقاله');
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle({
      ...article,
      id: article.id || '',
      title: article.title || '',
      slug: article.slug || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      metaTitle: article.metaTitle || '',
      metaDescription: article.metaDescription || '',
      focusKeyword: article.focusKeyword || '',
      author: article.author || '',
      published: article.published || false,
      featuredImage: article.featuredImage || undefined,
      metaKeywords: article.metaKeywords || [],
      tags: article.tags || [],
      createdAt: article.createdAt || new Date().toISOString(),
      updatedAt: article.updatedAt || new Date().toISOString(),
      readingTime: article.readingTime || 0,
      viewCount: article.viewCount || 0
    });
    setEditFeaturedImageFile(null);
    setEditImagePreview(article.featuredImage || null);
    setIsEditModalOpen(true);
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
                            <img src={article.featuredImage} alt={article.title} className="h-10 w-10 rounded-lg object-cover" />
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                نمایش {articles.length} از {totalItems} مقاله
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={() => fetchArticles(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 border rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  قبلی
                </button>
                {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => fetchArticles(page)}
                    className={`px-3 py-1 border rounded-md ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => fetchArticles(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 border rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
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
        size="large"
      >
        <form onSubmit={handleAddArticle} className="space-y-4">
          {/* Tabs and form content would go here */}
          {/* Similar to the original implementation */}
        </form>
      </Modal>

      {/* Edit Article Modal */}
      {editingArticle && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingArticle(null);
          }}
          title="ویرایش مقاله"
          size="large"
        >
          <form onSubmit={handleUpdateArticle} className="space-y-4">
            {/* Tabs and form content would go here */}
            {/* Similar to the original implementation */}
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Articles;