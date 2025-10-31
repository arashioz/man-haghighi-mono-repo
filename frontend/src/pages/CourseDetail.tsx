import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesService } from '../services/api';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">دوره یافت نشد</h2>
          <button
            onClick={() => navigate('/courses')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            بازگشت به دوره‌ها
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-64 md:h-96 object-cover"
                />
              )}
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {course.title}
                </h1>
                {course.description && (
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>
            </div>

            {/* Course Videos */}
            {course.videos && course.videos.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">محتوای دوره</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.videos.map((video) => (
                    <div 
                      key={video.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        isEnrolled 
                          ? 'border-gray-200 hover:shadow-md hover:border-indigo-300 cursor-pointer' 
                          : 'border-gray-200 opacity-75'
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
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {video.description}
                        </p>
                      )}
                      {video.duration && (
                        <p className="text-sm text-gray-500">
                          مدت زمان: {Math.floor(video.duration / 60)} دقیقه
                        </p>
                      )}
                      {!isEnrolled && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          🔒 برای دسترسی به این ویدیو ثبت‌نام کنید
                        </div>
                      )}
                      {isEnrolled && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
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
              <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">فایل‌های صوتی دوره</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.audios.map((audio) => (
                    <div 
                      key={audio.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        isEnrolled 
                          ? 'border-gray-200 hover:shadow-md hover:border-purple-300 cursor-pointer' 
                          : 'border-gray-200 opacity-75'
                      }`}
                      onClick={isEnrolled ? () => {
                        // Navigate to audio player or play directly
                        const audioUrl = `http://localhost:3000/uploads/${audio.audioFile}`;
                        window.open(audioUrl, '_blank');
                      } : undefined}
                    >
                      {audio.thumbnail && (
                        <img
                          src={getImageUrl(audio.thumbnail)!}
                          alt={audio.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <div className="flex items-center mb-3">
                        <svg className="w-8 h-8 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                        </svg>
                        <h3 className="font-semibold text-gray-900">
                          {audio.title}
                        </h3>
                      </div>
                      {audio.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {audio.description}
                        </p>
                      )}
                      {audio.duration && (
                        <p className="text-sm text-gray-500">
                          مدت زمان: {Math.floor(audio.duration / 60)} دقیقه
                        </p>
                      )}
                      {!isEnrolled && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          🔒 برای دسترسی به این فایل صوتی ثبت‌نام کنید
                        </div>
                      )}
                      {isEnrolled && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                          ✅ برای پخش کلیک کنید
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Attachments */}
            {course.attachments && course.attachments.length > 0 && isEnrolled && (
              <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">فایل‌های ضمیمه دوره</h2>
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
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-green-300 transition-all"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate mb-1">
                            {fileName}
                          </h3>
                          <p className="text-sm text-gray-500 uppercase">
                            فایل {fileExt}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">جزئیات دوره</h2>
              
              <div className="mb-6">
                <span className="text-3xl font-bold text-indigo-600">
                  {course.price.toLocaleString()} تومان
                </span>
                <p className="text-sm text-gray-600">
                  پرداخت یکباره برای دسترسی مادام‌العمر
                </p>
              </div>

              {course.videos && (
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{course.videos.length} درس ویدیویی</span>
                  </div>
                </div>
              )}

              {course.audios && (
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{course.audios.length} فایل صوتی</span>
                  </div>
                </div>
              )}

              {isEnrolled ? (
                <div className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-semibold text-center">
                  ✅ با موفقیت ثبت‌نام شدید
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling ? 'در حال ثبت‌نام...' : user ? 'ثبت‌نام کنید' : 'ورود برای ثبت‌نام'}
                </button>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">دسترسی مادام‌العمر</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">دسترسی موبایل و دسکتاپ</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">گواهینامه تکمیل دوره</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;