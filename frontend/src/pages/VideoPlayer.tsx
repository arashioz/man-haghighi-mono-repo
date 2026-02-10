import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videosService, coursesService, API_ORIGIN } from '../services/api';
import { Video, Course, VideoStreamInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';
import LoadingSpinner from '../components/LoadingSpinner';

const USE_TEST_ENDPOINT = true; // استفاده از endpoint تست برای جلوگیری از مشکلات توکن در حال حاضر

const QUALITY_OPTIONS = [
  { value: 'auto', label: 'خودکار' },
  { value: '1080p', label: '۱۰۸۰p' },
  { value: '720p', label: '۷۲۰p' },
  { value: '480p', label: '۴۸۰p' },
];

const VideoPlayer: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [videoInfo, setVideoInfo] = useState<VideoStreamInfo | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseVideos, setCourseVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (videoId) {
      setSelectedQuality('auto');
      fetchVideoData();
    }
  }, [videoId, user, authLoading, navigate]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      
      const streamData = await videosService.getVideoStreamUrl(videoId!);
      setVideoInfo(streamData);
      
      const initialUrl = buildStreamUrl('auto', videoId!, streamData);
      console.log('Video stream URL:', initialUrl);
      console.log('Video info:', streamData);
      setVideoUrl(initialUrl);
      
      if (streamData.courseId) {
        const [courseData, videosData] = await Promise.all([
          coursesService.getById(streamData.courseId),
          videosService.getMyVideos()
        ]);
        
        setCourse(courseData);
        
        // Filter videos for this course
        const courseVideosList = videosData.filter(v => v.courseId === streamData.courseId);
        setCourseVideos(courseVideosList.sort((a, b) => a.order - b.order));
      }
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در بارگذاری ویدیو');
    } finally {
      setLoading(false);
    }
  };

  const buildStreamUrl = (quality: string, currentVideoId: string, info: VideoStreamInfo | null) => {
    const baseUrl = API_ORIGIN;

    if (USE_TEST_ENDPOINT) {
      if (quality === 'auto') {
        return `${baseUrl}/api/videos/${currentVideoId}/stream-test`;
      }
      return `${baseUrl}/api/videos/${currentVideoId}/stream-test?quality=${encodeURIComponent(
        quality,
      )}`;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token) {
      const base = `${baseUrl}/api/videos/${currentVideoId}/stream?token=${encodeURIComponent(
        token,
      )}`;
      if (quality === 'auto') {
        return base;
      }
      return `${base}&quality=${encodeURIComponent(quality)}`;
    }

    if (info?.streamUrl) {
      if (quality === 'auto') {
        return info.streamUrl;
      }
      const separator = info.streamUrl.includes('?') ? '&' : '?';
      return `${info.streamUrl}${separator}quality=${encodeURIComponent(quality)}`;
    }

    return '';
  };

  const handleQualityChange = (quality: string) => {
    if (!videoId) return;

    const currentTime = videoRef.current?.currentTime ?? 0;
    setResumeTime(currentTime);
    setSelectedQuality(quality);

    const newUrl = buildStreamUrl(quality, videoId, videoInfo);
    setVideoUrl(newUrl);
  };

  const handleVideoSelect = (selectedVideoId: string) => {
    navigate(`/courses/${courseId}/videos/${selectedVideoId}`);
  };

  const getCurrentVideoIndex = () => {
    return courseVideos.findIndex(v => v.id === videoId);
  };

  const goToNextVideo = () => {
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex < courseVideos.length - 1) {
      handleVideoSelect(courseVideos[currentIndex + 1].id);
    }
  };

  const goToPreviousVideo = () => {
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex > 0) {
      handleVideoSelect(courseVideos[currentIndex - 1].id);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">خطا در دسترسی به ویدیو</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded hover:bg-red-500/30 transition-colors"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">ویدیو یافت نشد</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-yellow-400 text-black px-6 py-2 rounded-md hover:bg-yellow-500 transition-colors"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = getCurrentVideoIndex();
  const hasNext = currentIndex < courseVideos.length - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{videoInfo.title}</h1>
              {course && (
                <p className="text-white/70 mt-1">{course.title}</p>
              )}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              بازگشت به داشبورد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-video bg-black relative overflow-hidden">
                {videoUrl && (
                  <video
                    ref={videoRef}
                    key={`${videoId}-${selectedQuality}`} // Force re-render when video or quality changes
                    controls
                    controlsList="nodownload"
                    className="w-full h-full object-contain"
                    style={{ 
                      direction: 'ltr',
                      pointerEvents: 'auto',
                      zIndex: 1,
                      touchAction: 'manipulation'
                    }}
                    poster={videoInfo.thumbnail ? getImageUrl(videoInfo.thumbnail)! : undefined}
                    onEnded={hasNext ? goToNextVideo : undefined}
                    onClick={(e) => {
                      // Allow click events to propagate to video controls
                      e.stopPropagation();
                    }}
                    onPlay={() => {
                      console.log('Video playing');
                    }}
                    onPause={() => {
                      console.log('Video paused');
                    }}
                    onError={(e) => {
                      const videoElement = e.target as HTMLVideoElement;
                      const error = videoElement.error;
                      console.error('Video playback error:', {
                        code: error?.code,
                        message: error?.message,
                        url: videoUrl || videoInfo.streamUrl,
                        networkState: videoElement.networkState,
                        readyState: videoElement.readyState
                      });
                      
                      let errorMessage = 'خطا در پخش ویدیو. ';
                      if (error?.code === 1) {
                        errorMessage += 'فایل ویدیو یافت نشد.';
                      } else if (error?.code === 2) {
                        errorMessage += 'خطا در اتصال به سرور.';
                      } else if (error?.code === 3) {
                        errorMessage += 'فایل ویدیو خراب است یا فرمت آن پشتیبانی نمی‌شود.';
                      } else if (error?.code === 4) {
                        errorMessage += 'فایل ویدیو رمزگذاری شده و قابل پخش نیست.';
                      } else {
                        errorMessage += 'لطفاً صفحه را رفرش کنید.';
                      }
                      setError(errorMessage);
                    }}
                    onLoadStart={() => {
                      console.log('Video loading started:', videoUrl || videoInfo.streamUrl);
                    }}
                    onLoadedData={() => {
                      console.log('Video loaded successfully');
                      if (resumeTime !== null && videoRef.current) {
                        try {
                          videoRef.current.currentTime = resumeTime;
                          videoRef.current.play().catch(() => undefined);
                        } catch (e) {
                          console.warn('Failed to resume video at previous time', e);
                        } finally {
                          setResumeTime(null);
                        }
                      }
                    }}
                    onCanPlay={() => {
                      console.log('Video can play');
                    }}
                  >
                    <source src={videoUrl || videoInfo.streamUrl} type="video/mp4" />
                    <source src={videoUrl || videoInfo.streamUrl} type="video/webm" />
                    <source src={videoUrl || videoInfo.streamUrl} type="video/ogg" />
                    مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                  </video>
                )}

                {/* Quality selector */}
                {videoUrl && (
                  <div className="absolute bottom-3 left-3 z-10">
                    <label className="bg-black/70 border border-white/10 text-xs text-white/80 px-2 py-1 rounded flex items-center space-x-2 space-x-reverse">
                      <span className="ml-2">کیفیت:</span>
                      <select
                        value={selectedQuality}
                        onChange={(e) => handleQualityChange(e.target.value)}
                        className="bg-transparent border border-white/20 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      >
                        {QUALITY_OPTIONS.map((q) => (
                          <option key={q.value} value={q.value} className="bg-[#0a0a0a] text-white">
                            {q.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
              
              {/* Video Info */}
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-2">{videoInfo.title}</h2>
                {videoInfo.description && (
                  <p className="text-white/70 mb-4">{videoInfo.description}</p>
                )}
                
                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    onClick={goToPreviousVideo}
                    disabled={!hasPrevious}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      hasPrevious
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    ← ویدیو قبلی
                  </button>
                  
                  <span className="text-sm text-white/60">
                    {currentIndex + 1} از {courseVideos.length}
                  </span>
                  
                  <button
                    onClick={goToNextVideo}
                    disabled={!hasNext}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      hasNext
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    ویدیو بعدی →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Course Videos List */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                فهرست ویدیوها
              </h3>
              <div className="space-y-2">
                {courseVideos.map((courseVideo, index) => (
                  <button
                    key={courseVideo.id}
                    onClick={() => handleVideoSelect(courseVideo.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      courseVideo.id === videoId
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                        : 'bg-[#0a0a0a] text-white/80 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ml-3 ${
                        courseVideo.id === videoId
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/10 text-white/60'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{courseVideo.title}</p>
                        {courseVideo.duration && (
                          <p className="text-xs text-white/50 mt-1">
                            {Math.floor(courseVideo.duration / 60)} دقیقه
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
