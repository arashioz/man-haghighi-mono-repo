import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { articlesService } from '../services/api';
import { Article } from '../types';
import { getImageUrl } from '../utils/imageUtils';

const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      const data = await articlesService.getBySlug(slug!);
      setArticle(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت مقاله');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded max-w-md">
          {error}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">مقاله یافت نشد</h2>
          <button
            onClick={() => window.history.back()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          {article.featuredImage && (
            <img
              src={getImageUrl(article.featuredImage)!}
              alt={article.title}
              className="w-full h-64 md:h-96 object-cover"
            />
          )}
          <div className="p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>
            {article.publishedAt && (
              <p className="text-gray-500 mb-6">
                منتشر شده در {new Date(article.publishedAt).toLocaleDateString('fa-IR')}
              </p>
            )}
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </article>
      </div>
    </div>
  );
};

export default ArticleDetail;