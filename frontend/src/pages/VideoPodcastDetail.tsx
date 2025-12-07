import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoPodcastsService, API_ORIGIN } from '../services/api';
import { VideoPodcast } from '../types';
import { getImageUrl } from '../utils/imageUtils';
import LoadingSpinner from '../components/LoadingSpinner';

const VideoPodcastDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [videoPodcast, setVideoPodcast] = useState<VideoPodcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchVideoPodcast();
    }
  }, [id]);

  const fetchVideoPodcast = async () => {
    try {
      setLoading(true);
      const data = await videoPodcastsService.getById(id!);
      setVideoPodcast(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت ویدیو پادکست');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPersianDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">خطا</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  if (!videoPodcast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ویدیو پادکست یافت نشد</h2>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  const videoUrl = videoPodcast.streamUrl || `${API_ORIGIN}/api/video-podcasts/${id}/stream`;
  const thumbnailUrl = getImageUrl(videoPodcast.thumbnail) || undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          بازگشت
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Video Player */}
          <div className="w-full aspect-video bg-black">
            <video
              key={id}
              controls
              controlsList="nodownload"
              className="w-full h-full [&::-webkit-media-controls-panel]:direction-rtl"
              style={{ direction: 'rtl' }}
              poster={thumbnailUrl || undefined}
              preload="metadata"
              src={videoUrl}
              onError={(e) => {
                const videoElement = e.target as HTMLVideoElement;
                const error = videoElement.error;
                console.error('Video playback error:', {
                  code: error?.code,
                  message: error?.message,
                  url: videoUrl,
                  networkState: videoElement.networkState,
                  readyState: videoElement.readyState,
                });
                
                let errorMessage = 'خطا در پخش ویدیو. ';
                if (error?.code === 1) {
                  errorMessage += 'فایل ویدیو یافت نشد.';
                } else if (error?.code === 2) {
                  errorMessage += 'خطا در اتصال به سرور.';
                } else if (error?.code === 3) {
                  errorMessage += 'فایل ویدیو خراب است یا فرمت آن پشتیبانی نمی‌شود.';
                } else if (error?.code === 4) {
                  errorMessage += 'رمزگذاری ویدیو پشتیبانی نمی‌شود.';
                }
                setError(errorMessage);
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
            </video>
          </div>

          {/* Video Info */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {videoPodcast.title}
              </h1>
              
              {videoPodcast.description && (
                <p className="text-lg text-gray-600 leading-relaxed mb-4">
                  {videoPodcast.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {videoPodcast.duration && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDuration(videoPodcast.duration)}</span>
                  </div>
                )}
                
                {videoPodcast.publishedAt && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatPersianDate(videoPodcast.publishedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPodcastDetail;

