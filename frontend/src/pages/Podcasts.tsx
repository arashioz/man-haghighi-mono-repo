import React, { useState, useEffect } from 'react';
import { podcastsService } from '../services/api';
import { Podcast } from '../types';

const Podcasts: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const data = await podcastsService.getPublished();
        setPodcasts(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت پادکست‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchPodcasts();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">پادکست‌ها</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            گوش دهید به آخرین قسمت‌های پادکست ما و دانش خود را گسترش دهید.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {podcasts.map((podcast) => (
            <div key={podcast.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {podcast.title}
                  </h3>
                  {podcast.duration && (
                    <p className="text-sm text-gray-500">
                      {Math.floor(podcast.duration / 60)} دقیقه
                    </p>
                  )}
                </div>
              </div>
              {podcast.description && (
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {podcast.description}
                </p>
              )}
              <audio controls className="w-full mb-4">
                <source src={podcast.audioFile} type="audio/mpeg" />
                مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
              </audio>
              {podcast.publishedAt && (
                <p className="text-sm text-gray-500">
                  منتشر شده در {new Date(podcast.publishedAt).toLocaleDateString('fa-IR')}
                </p>
              )}
            </div>
          ))}
        </div>

        {podcasts.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">پادکستی موجود نیست</h3>
              <p className="text-gray-600">لطفاً بعداً برای قسمت‌های جدید بررسی کنید.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Podcasts;