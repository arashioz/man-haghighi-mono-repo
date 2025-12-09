import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videosService, coursesService, API_ORIGIN } from '../services/api';
import { Video, Course, VideoStreamInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';
import LoadingSpinner from '../components/LoadingSpinner';

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
      fetchVideoData();
    }
  }, [videoId, user, authLoading, navigate]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      
      const streamData = await videosService.getVideoStreamUrl(videoId!);
      setVideoInfo(streamData);
      
      const token = localStorage.getItem('token');

      const baseUrl = API_ORIGIN;
      
      const USE_TEST_ENDPOINT = true; 
      const streamUrl = USE_TEST_ENDPOINT
        ? `${baseUrl}/api/videos/${videoId}/stream-test`
        : (token 
          ? `${baseUrl}/api/videos/${videoId}/stream?token=${encodeURIComponent(token)}`
          : streamData.streamUrl);
      
      console.log('Video stream URL:', streamUrl);
      console.log('Video info:', streamData);
      
      // Test if URL is accessible
      try {
        const testResponse = await fetch(streamUrl, {
          method: 'HEAD',
          headers: {
            'Range': 'bytes=0-1'
          }
        });
        console.log('Video URL test response:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          headers: Object.fromEntries(testResponse.headers.entries())
        });
        
        if (!testResponse.ok) {
          console.error('Video URL not accessible:', testResponse.status, testResponse.statusText);
        }
      } catch (fetchError) {
        console.error('Error testing video URL:', fetchError);
      }
      
      setVideoUrl(streamUrl);
      
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
                    key={videoId} // Force re-render when video changes
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
