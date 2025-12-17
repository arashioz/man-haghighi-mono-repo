import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoPodcastsService } from '../services/api';
import { VideoPodcast } from '../types';
import { getImageUrl, getImageUrlWithFallback } from '../utils/imageUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import VideoPodcastModal from '../components/VideoPodcastModal';

const VideoPodcasts: React.FC = () => {
  const navigate = useNavigate();
  const [videoPodcasts, setVideoPodcasts] = useState<VideoPodcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVideoPodcast, setSelectedVideoPodcast] = useState<VideoPodcast | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchVideoPodcasts = async () => {
      try {
        const data = await videoPodcastsService.getPublished();
        setVideoPodcasts(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت ویدیو پادکست‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoPodcasts();
  }, []);

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
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">خطا</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040404] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ویدیو پادکست‌ها</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            تماشا کنید آخرین ویدیو پادکست‌های ما و دانش خود را گسترش دهید.
          </p>
        </div>

        {videoPodcasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {videoPodcasts.map((videoPodcast) => {
              const thumbnailUrl = getImageUrlWithFallback(
                videoPodcast.thumbnail,
                '/images/placeholder.jpg'
              );

              return (
                <div
                  key={videoPodcast.id}
                  onClick={() => {
                    setSelectedVideoPodcast(videoPodcast);
                    setIsModalOpen(true);
                  }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <div className="relative aspect-video bg-black">
                    <img
                      src={thumbnailUrl}
                      alt={videoPodcast.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/placeholder.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-white/20 backdrop-blur p-4 hover:bg-white/30 transition-colors">
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {videoPodcast.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(videoPodcast.duration)}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                      {videoPodcast.title}
                    </h3>
                    {videoPodcast.description && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {videoPodcast.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      {videoPodcast.publishedAt && (
                        <span>{formatPersianDate(videoPodcast.publishedAt)}</span>
                      )}
                      <span className="text-indigo-600 hover:text-indigo-700 font-medium">
                        تماشا کنید →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">ویدیو پادکستی برای نمایش وجود ندارد</p>
          </div>
        )}
      </div>

      {/* Video Podcast Modal */}
      <VideoPodcastModal
        videoPodcast={selectedVideoPodcast}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVideoPodcast(null);
        }}
      />
    </div>
  );
};

export default VideoPodcasts;





