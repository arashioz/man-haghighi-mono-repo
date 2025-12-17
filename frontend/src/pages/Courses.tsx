import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { coursesService } from '../services/api';
import { Course } from '../types';
import { getImageUrlWithFallback } from '../utils/imageUtils';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
} satisfies Variants;

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
} satisfies Variants;

const curatedAssets = {
  gallery: [
    '/assets/homeV2/Qodrat Namahdood5.jpg',
    '/assets/homeV2/Pedar Nakhodagah6.jpg',
    '/assets/homeV2/Cast box Cover6.jpg',
    '/assets/homeV2/Emotional Podcast2.jpg',
  ],
};

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response: any = await coursesService.getPublished();
        
        // Handle different response formats
        let coursesArray: Course[] = [];
        if (Array.isArray(response)) {
          coursesArray = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            coursesArray = response.data;
          } else if (Array.isArray(response.courses)) {
            coursesArray = response.courses;
          } else {
            coursesArray = [];
          }
        }
        
        setCourses(coursesArray);
      } catch (err: any) {
        console.error('Error fetching courses:', err);
        setError(err.response?.data?.message || err.message || 'خطا در دریافت دوره‌ها');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white/60 text-sm">در حال بارگذاری دوره‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#0a0a0a]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400 mb-4"
            >
              دوره‌های آموزشی
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl mb-6"
            >
              برنامه‌های تحول
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-3xl mx-auto text-lg text-white/70 sm:text-xl leading-relaxed"
            >
              مجموعه دوره‌های عمیق و کاربردی ما که برای جهش شخصی و حرفه‌ای طراحی شده‌اند.
              هر دوره یک سفر کامل برای ساخت نسخه بهتر از خودت.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <section className="border-t border-white/10 py-12 sm:py-16">
          {error ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/30 rounded-full text-yellow-400 text-sm font-semibold transition-colors"
              >
                تلاش مجدد
              </button>
            </div>
          ) : courses.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {courses.map((course, index) => {
                const courseImage = course.thumbnail
                  ? getImageUrlWithFallback(
                      course.thumbnail,
                      curatedAssets.gallery[index % curatedAssets.gallery.length]
                    )
                  : curatedAssets.gallery[index % curatedAssets.gallery.length];

                const videoCount = course.videos?.length || 0;
                const audioCount = course.audios?.length || 0;
                const totalContent = videoCount + audioCount;

                return (
                  <motion.div
                    key={course.id}
                    variants={fadeUp}
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] cursor-pointer transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_25px_60px_-20px_rgba(250,204,21,0.3)]"
                  >
                    {/* Image Section */}
                    <div className="relative h-56 overflow-hidden bg-black/40">
                      <img
                        src={courseImage}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = curatedAssets.gallery[index % curatedAssets.gallery.length];
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      
                      {/* Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-yellow-400/20 backdrop-blur-md rounded-full text-xs font-semibold text-yellow-400 uppercase tracking-wider border border-yellow-400/30">
                          دوره
                        </span>
                      </div>
                      
                      {/* Price */}
                      {course.price > 0 && (
                        <div className="absolute bottom-4 left-4">
                          <span className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/10">
                            {typeof course.price === 'number'
                              ? course.price.toLocaleString('fa-IR')
                              : course.price}{' '}
                            تومان
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-400 transition-colors line-clamp-2 min-h-[3.5rem]">
                        {course.title}
                      </h3>
                      
                      {course.description && (
                        <p className="text-sm text-white/70 mb-4 line-clamp-3 leading-relaxed min-h-[4.5rem]">
                          {course.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-4 text-xs text-white/60">
                          {videoCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <svg
                                className="w-4 h-4 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                              <span>{videoCount} ویدیو</span>
                            </div>
                          )}
                          {audioCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <svg
                                className="w-4 h-4 text-purple-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-1.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span>{audioCount} فایل صوتی</span>
                            </div>
                          )}
                          {totalContent === 0 && (
                            <span className="text-white/40">محتوایی موجود نیست</span>
                          )}
                        </div>
                        
                        {/* Arrow Icon */}
                        <svg
                          className="w-5 h-5 text-yellow-400 transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-20 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
                <svg
                  className="w-10 h-10 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">دوره‌ای برای نمایش وجود ندارد</h3>
              <p className="text-white/60 mb-6">
                در حال حاضر هیچ دوره منتشر شده‌ای در دسترس نیست.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/30 rounded-full text-yellow-400 text-sm font-semibold transition-colors"
              >
                بازگشت به صفحه اصلی
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Courses;
