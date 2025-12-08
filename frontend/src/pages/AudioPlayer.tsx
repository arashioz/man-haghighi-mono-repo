import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { audiosService, coursesService, API_ORIGIN } from '../services/api';
import { Audio, Course, AudioStreamInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';
import LoadingSpinner from '../components/LoadingSpinner';

const AudioPlayer: React.FC = () => {
  const { audioId } = useParams<{ audioId: string }>();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [audioInfo, setAudioInfo] = useState<AudioStreamInfo | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseAudios, setCourseAudios] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Load saved progress from localStorage
  const loadProgress = (audioId: string): number => {
    try {
      const saved = localStorage.getItem(`audio_progress_${audioId}`);
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  };

  // Save progress to localStorage
  const saveProgress = (audioId: string, time: number) => {
    try {
      localStorage.setItem(`audio_progress_${audioId}`, time.toString());
    } catch {
      // Ignore localStorage errors
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (audioId) {
      fetchAudioData();
    }
  }, [audioId, user, authLoading, navigate]);

  const fetchAudioData = async () => {
    try {
      setLoading(true);
      
      const streamData = await audiosService.getAudioStreamUrl(audioId!);
      setAudioInfo(streamData);
      
      const token = localStorage.getItem('token');
      const baseUrl = API_ORIGIN;
      const streamUrl = token 
        ? `${baseUrl}/api/audios/${audioId}/stream?token=${encodeURIComponent(token)}`
        : streamData.streamUrl;
      
      setAudioUrl(streamUrl);
      
      if (streamData.courseId) {
        const [courseData, audiosData] = await Promise.all([
          coursesService.getById(streamData.courseId),
          audiosService.getMyAudios()
        ]);
        
        setCourse(courseData);
        
        // Filter audios for this course
        const courseAudiosList = audiosData.filter(a => a.courseId === streamData.courseId);
        setCourseAudios(courseAudiosList.sort((a, b) => a.order - b.order));
      }
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در بارگذاری فایل صوتی');
    } finally {
      setLoading(false);
    }
  };

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    const audio = audioRef.current;
    
    // Load saved progress
    const savedTime = loadProgress(audioId!);
    if (savedTime > 0) {
      audio.currentTime = savedTime;
    }

    // Update current time
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      // Save progress every 5 seconds
      if (Math.floor(audio.currentTime) % 5 === 0) {
        saveProgress(audioId!, audio.currentTime);
      }
    };

    // Update duration
    const updateDuration = () => {
      setDuration(audio.duration);
    };

    // Handle play/pause
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Handle ended
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      saveProgress(audioId!, 0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, audioId]);

  const handleAudioSelect = (selectedAudioId: string) => {
    navigate(`/courses/${courseId}/audios/${selectedAudioId}`);
  };

  const getCurrentAudioIndex = () => {
    return courseAudios.findIndex(a => a.id === audioId);
  };

  const goToNextAudio = () => {
    const currentIndex = getCurrentAudioIndex();
    if (currentIndex < courseAudios.length - 1) {
      handleAudioSelect(courseAudios[currentIndex + 1].id);
    }
  };

  const goToPreviousAudio = () => {
    const currentIndex = getCurrentAudioIndex();
    if (currentIndex > 0) {
      handleAudioSelect(courseAudios[currentIndex - 1].id);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      saveProgress(audioId!, time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
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

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">خطا در دسترسی به فایل صوتی</h2>
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

  if (!audioInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">فایل صوتی یافت نشد</h2>
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

  const currentIndex = getCurrentAudioIndex();
  const hasNext = currentIndex < courseAudios.length - 1;
  const hasPrevious = currentIndex > 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onError={(e) => {
          const audioElement = e.target as HTMLAudioElement;
          const error = audioElement.error;
          console.error('Audio playback error:', {
            code: error?.code,
            message: error?.message,
            url: audioUrl,
            networkState: audioElement.networkState,
            readyState: audioElement.readyState
          });
          
          let errorMessage = 'خطا در پخش فایل صوتی. ';
          if (error?.code === 1) {
            errorMessage += 'فایل صوتی یافت نشد.';
          } else if (error?.code === 2) {
            errorMessage += 'خطا در اتصال به سرور.';
          } else if (error?.code === 3) {
            errorMessage += 'فایل صوتی خراب است یا فرمت آن پشتیبانی نمی‌شود.';
          } else if (error?.code === 4) {
            errorMessage += 'فایل صوتی رمزگذاری شده و قابل پخش نیست.';
          } else {
            errorMessage += 'لطفاً صفحه را رفرش کنید.';
          }
          setError(errorMessage);
        }}
      />

      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{audioInfo.title}</h1>
              {course && (
                <p className="text-white/70 mt-1">{course.title}</p>
              )}
            </div>
            <button
              onClick={() => navigate(`/courses/${courseId || audioInfo.courseId}`)}
              className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              بازگشت به دوره
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Audio Player */}
          <div className="lg:col-span-3">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg overflow-hidden">
              {/* Audio Visualizer/Thumbnail */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/20 p-12 flex items-center justify-center min-h-[400px]">
                {audioInfo.thumbnail ? (
                  <img
                    src={getImageUrl(audioInfo.thumbnail)!}
                    alt={audioInfo.title}
                    className="w-full max-w-md h-auto rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="w-full max-w-md aspect-square rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
                    <svg className="w-32 h-32 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Audio Controls */}
              <div className="p-6 bg-[#0a0a0a]">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-white/60 mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%, rgba(255, 255, 255, 0.2) 100%)`,
                    }}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={goToPreviousAudio}
                    disabled={!hasPrevious}
                    className={`p-3 rounded-full transition-colors ${
                      hasPrevious
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                    aria-label="قبلی"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6l8.5-6v12z" />
                    </svg>
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"
                    aria-label={isPlaying ? 'توقف' : 'پخش'}
                  >
                    {isPlaying ? (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={goToNextAudio}
                    disabled={!hasNext}
                    className={`p-3 rounded-full transition-colors ${
                      hasNext
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                    aria-label="بعدی"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-4">
                  <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    {volume === 0 ? (
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    ) : volume < 0.5 ? (
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    ) : (
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    )}
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${volume * 100}%, rgba(255, 255, 255, 0.2) ${volume * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                    }}
                  />
                </div>

                {/* Audio Info */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h2 className="text-xl font-bold text-white mb-2">{audioInfo.title}</h2>
                  {audioInfo.description && (
                    <p className="text-white/70 mb-4">{audioInfo.description}</p>
                  )}
                  
                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={goToPreviousAudio}
                      disabled={!hasPrevious}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        hasPrevious
                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      ← فایل قبلی
                    </button>
                    
                    <span className="text-sm text-white/60">
                      {currentIndex + 1} از {courseAudios.length}
                    </span>
                    
                    <button
                      onClick={goToNextAudio}
                      disabled={!hasNext}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        hasNext
                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      فایل بعدی →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Course Audios List */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                فهرست فایل‌های صوتی
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {courseAudios.map((courseAudio, index) => (
                  <button
                    key={courseAudio.id}
                    onClick={() => handleAudioSelect(courseAudio.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      courseAudio.id === audioId
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30'
                        : 'bg-[#0a0a0a] text-white/80 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ml-3 ${
                        courseAudio.id === audioId
                          ? 'bg-purple-400 text-black'
                          : 'bg-white/10 text-white/60'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{courseAudio.title}</p>
                        {courseAudio.duration && (
                          <p className="text-xs text-white/50 mt-1">
                            {Math.floor(courseAudio.duration / 60)} دقیقه
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

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgb(168, 85, 247);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgb(168, 85, 247);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default AudioPlayer;

