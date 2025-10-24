import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videosService, coursesService } from '../services/api';
import { Video, Course, VideoStreamInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';

const VideoPlayer: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [videoInfo, setVideoInfo] = useState<VideoStreamInfo | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseVideos, setCourseVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (videoId) {
      fetchVideoData();
    }
  }, [videoId, user, navigate]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      
      // Get video stream info (which includes all video details)
      const streamData = await videosService.getVideoStreamUrl(videoId!);
      setVideoInfo(streamData);
      
      // Get course details and all course videos
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">خطا در دسترسی به ویدیو</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ویدیو یافت نشد</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{videoInfo.title}</h1>
              {course && (
                <p className="text-gray-600 mt-1">{course.title}</p>
              )}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
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
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-video bg-black">
                <video
                  key={videoId} // Force re-render when video changes
                  controls
                  className="w-full h-full"
                  poster={videoInfo.thumbnail ? getImageUrl(videoInfo.thumbnail)! : undefined}
                  onEnded={hasNext ? goToNextVideo : undefined}
                >
                  <source src={videoInfo.streamUrl} type="video/mp4" />
                  مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                </video>
              </div>
              
              {/* Video Info */}
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{videoInfo.title}</h2>
                {videoInfo.description && (
                  <p className="text-gray-600 mb-4">{videoInfo.description}</p>
                )}
                
                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <button
                    onClick={goToPreviousVideo}
                    disabled={!hasPrevious}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      hasPrevious
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    ← ویدیو قبلی
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} از {courseVideos.length}
                  </span>
                  
                  <button
                    onClick={goToNextVideo}
                    disabled={!hasNext}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      hasNext
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                فهرست ویدیوها
              </h3>
              <div className="space-y-2">
                {courseVideos.map((courseVideo, index) => (
                  <button
                    key={courseVideo.id}
                    onClick={() => handleVideoSelect(courseVideo.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      courseVideo.id === videoId
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ml-3 ${
                        courseVideo.id === videoId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{courseVideo.title}</p>
                        {courseVideo.duration && (
                          <p className="text-xs text-gray-500 mt-1">
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
