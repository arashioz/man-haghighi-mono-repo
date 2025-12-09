import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesService, API_ORIGIN, audiosService } from '../services/api';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';

// Audio Player Component
const AudioPlayerComponent: React.FC<{ audioId: string }> = ({ audioId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch audio stream URL
  useEffect(() => {
    const fetchAudioUrl = async () => {
      try {
        setLoading(true);
        const streamData = await audiosService.getAudioStreamUrl(audioId);
        setAudioUrl(streamData.streamUrl);
      } catch (error) {
        console.error('Error fetching audio stream URL:', error);
      } finally {
        setLoading(false);
      }
    };

    if (audioId) {
      fetchAudioUrl();
    }
  }, [audioId]);

  // Initialize audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Set audio source
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      console.log('Audio can play');
    };

    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      console.error('Audio error:', audioElement.error);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      const seekTime = Math.max(0, Math.min(time, duration));
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-purple-400/30 rounded-lg p-3">
        <div className="text-xs text-white/60">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className="bg-[#0a0a0a] border border-red-400/30 rounded-lg p-3">
        <div className="text-xs text-red-400">خطا در بارگذاری فایل صوتی</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-purple-400/30 rounded-lg p-3">
      <audio 
        ref={audioRef} 
        preload="metadata" 
        crossOrigin="anonymous" 
        className="hidden"
        onError={(e) => {
          const audioElement = e.target as HTMLAudioElement;
          console.error('Audio playback error:', {
            code: audioElement.error?.code,
            message: audioElement.error?.message,
            url: audioUrl
          });
        }}
      />
      
      {/* Progress Bar */}
      <div className="mb-2">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          onMouseDown={(e) => {
            // Pause while seeking
            const audio = audioRef.current;
            if (audio && isPlaying) {
              audio.pause();
            }
          }}
          onMouseUp={(e) => {
            // Resume after seeking if it was playing
            const audio = audioRef.current;
            if (audio && isPlaying) {
              audio.play().catch(console.error);
            }
          }}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%, rgba(255, 255, 255, 0.2) 100%)`,
          }}
        />
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isPlaying ? 'توقف' : 'پخش'}
          disabled={!audioUrl}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-xs text-white/80 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgb(168, 85, 247);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgb(168, 85, 247);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
        }
        
        input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const fetchCourse = async () => {
    try {
      const data = await coursesService.getById(id!);
      setCourse(data);
      
      // Check if user is enrolled
      if (user) {
        const myCourses = await coursesService.getMyCourses();
        const enrolled = myCourses.some(c => c.id === id);
        setIsEnrolled(enrolled);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت دوره');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Video player event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [course?.videoFile]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      await coursesService.enroll(id!);
      setIsEnrolled(true);
      // Refresh course data to show videos
      await fetchCourse();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ثبت‌نام در دوره');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVideoClick = (videoId: string) => {
    navigate(`/courses/${id}/videos/${videoId}`);
  };

  const handleAudioClick = (audioId: string) => {
    navigate(`/courses/${id}/audios/${audioId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded max-w-md">
          {error}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">دوره یافت نشد</h2>
          <button
            onClick={() => navigate('/courses')}
            className="bg-yellow-400 text-black px-6 py-2 rounded-md hover:bg-yellow-500 transition-colors"
          >
            بازگشت به دوره‌ها
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg overflow-hidden">
              {/* Course Intro Video */}
              {course.videoFile && (
                <div className="w-full relative group" onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(true)}>
                  <div className="relative aspect-video bg-black">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain"
                      style={{ 
                        direction: 'ltr',
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                      }}
                      preload="metadata"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                      }}
                      onError={(e) => {
                        const videoElement = e.target as HTMLVideoElement;
                        console.error('Video error:', videoElement.error);
                      }}
                    >
                      <source
                        src={`${API_ORIGIN}/api/courses/${id}/intro-video/stream`}
                        type="video/mp4"
                      />
                      <source
                        src={`${API_ORIGIN}/api/courses/${id}/intro-video/stream`}
                        type="video/webm"
                      />
                      مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                    </video>
                    
                    {/* Custom Controls Overlay - Center Play/Pause (only when paused) */}
                    {!isPlaying && (
                      <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 pointer-events-none`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                          }}
                          className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl pointer-events-auto"
                          aria-label="پخش"
                        >
                          <svg className="w-10 h-10 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* Bottom Controls Bar */}
                    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 transition-opacity ${showControls || isPlaying ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100`}>
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          step="0.1"
                          value={currentTime}
                          onChange={(e) => handleSeek(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
                          style={{
                            background: `linear-gradient(to right, rgb(234, 179, 8) 0%, rgb(234, 179, 8) ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%, rgba(255, 255, 255, 0.2) 100%)`,
                          }}
                        />
                      </div>
                      
                      {/* Time and Controls */}
                      <div className="flex items-center justify-between text-white text-sm">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlayPause();
                            }}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            aria-label={isPlaying ? 'توقف' : 'پخش'}
                          >
                            {isPlaying ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                          <span className="font-mono text-xs sm:text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!course.videoFile && course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-64 md:h-96 object-cover"
                />
              )}
              <div className="p-6">
                <h1 className="text-3xl font-bold text-white mb-4">
                  {course.title}
                </h1>
                {course.description && (
                  <p className="text-white/70 text-lg leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>
            </div>

            {/* Course Videos */}
            {course.videos && course.videos.length > 0 && (
              <div className="mt-8 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6">محتوای دوره</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.videos.map((video) => (
                    <div 
                      key={video.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        isEnrolled 
                          ? 'border-white/20 hover:shadow-md hover:border-yellow-400/50 cursor-pointer bg-[#0a0a0a]' 
                          : 'border-white/10 opacity-75 bg-[#0a0a0a]'
                      }`}
                      onClick={isEnrolled ? () => handleVideoClick(video.id) : undefined}
                    >
                      {video.thumbnail && (
                        <img
                          src={getImageUrl(video.thumbnail)!}
                          alt={video.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-white mb-2">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-white/70 mb-2">
                          {video.description}
                        </p>
                      )}
                      {video.duration && (
                        <p className="text-sm text-white/60">
                          مدت زمان: {Math.floor(video.duration / 60)} دقیقه
                        </p>
                      )}
                      {!isEnrolled && (
                        <div className="mt-3 p-2 bg-yellow-400/20 border border-yellow-400/30 rounded text-sm text-yellow-400">
                          🔒 برای دسترسی به این ویدیو ثبت‌نام کنید
                        </div>
                      )}
                      {isEnrolled && (
                        <div className="mt-3 p-2 bg-green-500/20 border border-green-500/30 rounded text-sm text-green-400">
                          ✅ برای تماشا کلیک کنید
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Audios */}
            {course.audios && course.audios.length > 0 && (
              <div className="mt-8 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6">فایل‌های صوتی دوره</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.audios.map((audio) => (
                    <div 
                      key={audio.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        isEnrolled 
                          ? 'border-white/20 hover:shadow-md hover:border-purple-400/50 bg-[#0a0a0a]' 
                          : 'border-white/10 opacity-75 bg-[#0a0a0a]'
                      }`}
                    >
                      {audio.thumbnail && (
                        <img
                          src={getImageUrl(audio.thumbnail)!}
                          alt={audio.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <div className="flex items-center mb-3">
                        <svg className="w-8 h-8 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                        </svg>
                        <h3 className="font-semibold text-white">
                          {audio.title}
                        </h3>
                      </div>
                      {audio.description && (
                        <p className="text-sm text-white/70 mb-2">
                          {audio.description}
                        </p>
                      )}
                      {audio.duration && (
                        <p className="text-sm text-white/60 mb-3">
                          مدت زمان: {Math.floor(audio.duration / 60)} دقیقه
                        </p>
                      )}
                      {!isEnrolled && (
                        <div className="mt-3 p-2 bg-yellow-400/20 border border-yellow-400/30 rounded text-sm text-yellow-400">
                          🔒 برای دسترسی به این فایل صوتی ثبت‌نام کنید
                        </div>
                      )}
                      {isEnrolled && (
                        <div className="mt-3">
                          <AudioPlayerComponent audioId={audio.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Attachments */}
            {course.attachments && course.attachments.length > 0 && isEnrolled && (
              <div className="mt-8 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6">فایل‌های ضمیمه دوره</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.attachments.map((attachment: string, idx: number) => {
                    const fileName = attachment.split('/').pop() || attachment;
                    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                    return (
                      <a
                        key={idx}
                        href={attachment}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 border border-white/20 rounded-lg hover:shadow-md hover:border-green-400/50 transition-all bg-[#0a0a0a]"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate mb-1">
                            {fileName}
                          </h3>
                          <p className="text-sm text-white/60 uppercase">
                            فایل {fileExt}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-4">جزئیات دوره</h2>
              
              <div className="mb-6">
                <span className="text-3xl font-bold text-yellow-400">
                  {course.price.toLocaleString()} تومان
                </span>
                <p className="text-sm text-white/70">
                  پرداخت یکباره برای دسترسی مادام‌العمر
                </p>
              </div>

              {course.videos && (
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80">{course.videos.length} درس ویدیویی</span>
                  </div>
                </div>
              )}

              {course.audios && (
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80">{course.audios.length} فایل صوتی</span>
                  </div>
                </div>
              )}

              {isEnrolled ? (
                <div className="w-full bg-green-500/20 border border-green-500/30 text-green-400 py-3 px-4 rounded-md font-semibold text-center">
                  ✅ با موفقیت ثبت‌نام شدید
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-md font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling ? 'در حال ثبت‌نام...' : user ? 'ثبت‌نام کنید' : 'ورود برای ثبت‌نام'}
                </button>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-white/70">دسترسی مادام‌العمر</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-white/70">دسترسی موبایل و دسکتاپ</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-white/70">گواهینامه تکمیل دوره</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgb(234, 179, 8);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgb(234, 179, 8);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
        }
        
        input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default CourseDetail;