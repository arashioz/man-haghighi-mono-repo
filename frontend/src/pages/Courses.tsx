import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Variants, useScroll, useTransform } from 'framer-motion';
import { coursesService } from '../services/api';
import { Course } from '../types';
import { getImageUrlWithFallback } from '../utils/imageUtils';

const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] },
  },
} satisfies Variants;

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
} satisfies Variants;

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] },
  },
} satisfies Variants;

// Random images from assets
const randomImages = [
  '/assets/homeV2/Qodrat Namahdood5.jpg',
  '/assets/homeV2/Pedar Nakhodagah6.jpg',
  '/assets/homeV2/Cast box Cover6.jpg',
  '/assets/homeV2/Emotional Podcast2.jpg',
  '/assets/homeV2/Artboard 2 copy 4.jpg',
  '/assets/homeV2/01.jpg',
  '/assets/homeV2/DSC_0514 (1).jpg',
  '/assets/homeV2/Drifter.jpg',
  '/assets/homeV2/Sexual Energy Transmutation.jpg',
  '/assets/homeV2/Energy-Pool-Moarefi.jpg',
  '/assets/homeV2/Ehsase-Arzeshmandi-Moarefi.jpg',
  '/assets/course-introcution/a-journey-into-deep-self.jpg',
  '/assets/course-introcution/a-journey-into-unconscious-mind.jpg',
  '/assets/course-introcution/act-of-courage.jpg',
  '/assets/course-introcution/divine-providence.jpg',
  '/assets/course-introcution/enerzhi-pool.jpg',
  '/assets/course-introcution/from-weakness-to-strength.jpg',
  '/assets/seminar-photo/0D2A9768.jpg',
  '/assets/seminar-photo/DSC_0514.jpg',
  '/assets/seminar-photo/kargah-03.jpg',
  '/assets/seminar-photo/kargah-04.jpg',
];

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const heroRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

  // Get random images for each course
  const getRandomImage = (index: number) => {
    return randomImages[index % randomImages.length];
  };

  // Get random background images for blur effect
  const backgroundImages = useMemo(() => {
    const shuffled = [...randomImages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      let isCompleted = false;
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        setLoading(true);
        setError(null);
        
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            setError('درخواست بیش از حد انتظار طول کشید. لطفاً صفحه را رفرش کنید.');
            setLoading(false);
          }
        }, 30000);
        
        const response: any = await coursesService.getPublished();
        isCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        let coursesArray: Course[] = [];
        
        if (Array.isArray(response)) {
          coursesArray = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            coursesArray = response.data;
          } else if (Array.isArray(response.courses)) {
            coursesArray = response.courses;
          } else {
            const keys = Object.keys(response);
            for (const key of keys) {
              if (Array.isArray(response[key])) {
                coursesArray = response[key];
                break;
              }
            }
          }
        }
        
        if (!Array.isArray(coursesArray)) {
          coursesArray = [];
        }
        
        setCourses(coursesArray);
      } catch (err: any) {
        isCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        let errorMessage = 'خطا در دریافت دوره‌ها';
        if (err.response?.status === 404) {
          errorMessage = 'آدرس API یافت نشد. لطفاً با پشتیبانی تماس بگیرید.';
        } else if (err.response?.status === 500) {
          errorMessage = 'خطای سرور. لطفاً بعداً تلاش کنید.';
        } else if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
          errorMessage = 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Filter courses based on search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return courses;

    const searchLower = searchTerm.toLowerCase().trim();
    return courses.filter(course =>
      course.title.toLowerCase().includes(searchLower) ||
      course.description?.toLowerCase().includes(searchLower)
    );
  }, [courses, searchTerm]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Hero Section with Blur Background */}
      <section ref={heroRef} className="relative overflow-hidden border-b border-white/10">
        {/* Blurred Background Images */}
        <div className="absolute inset-0">
          {backgroundImages.map((img, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 2, delay: idx * 0.5 }}
              className={`absolute ${
                idx === 0 ? 'top-0 left-0 w-1/3' 
                : idx === 1 ? 'top-0 left-1/3 w-1/3' 
                : 'top-0 right-0 w-1/3'
              } h-full`}
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(80px)',
                transform: 'scale(1.2)',
              }}
            />
          ))}
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)]" />
        
        {/* Content */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative mx-auto max-w-7xl px-4 py-32 sm:px-6 sm:py-40 lg:px-8"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400 mb-6"
            >
              دوره‌های آموزشی
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-black uppercase leading-tight sm:text-6xl lg:text-7xl mb-8 bg-gradient-to-r from-white via-violet-400 to-white bg-clip-text text-transparent"
            >
              برنامه‌های تحول
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-3xl mx-auto text-xl text-white/80 sm:text-2xl leading-relaxed"
            >
              مجموعه دوره‌های عمیق و کاربردی ما که برای جهش شخصی و حرفه‌ای طراحی شده‌اند.
              هر دوره یک سفر کامل برای ساخت نسخه بهتر از خودت.
            </motion.p>
          </motion.div>
        </motion.div>
      </section>

      {/* Search Section */}
      <section className="relative py-16 border-b border-white/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-4">جستجوی دوره‌ها</h2>
            <p className="text-white/70">در میان دوره‌های آموزشی ما جستجو کنید</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative max-w-2xl mx-auto"
          >
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="نام دوره، توضیحات یا مدرس را جستجو کنید..."
                className="w-full px-6 py-4 pr-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all duration-300"
                dir="rtl"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-white/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {searchTerm && (
              <div className="mt-4 text-center">
                <p className="text-white/70 text-sm">
                  {filteredCourses.length} دوره یافت شد
                  {searchTerm && ` برای "${searchTerm}"`}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative mx-auto w-full max-w-7xl px-4 pb-32 sm:px-6 lg:px-8">
        {/* Background Blur Section */}
        <section className="relative py-20 overflow-hidden">
          {/* Blurred Background Images */}
          <div className="absolute inset-0 -z-10">
            {backgroundImages.map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 1.1 }}
                whileInView={{ opacity: 0.15, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, delay: idx * 0.3 }}
                className={`absolute ${
                  idx === 0 ? 'top-0 left-0 w-1/2' 
                  : idx === 1 ? 'top-0 right-0 w-1/2' 
                  : 'bottom-0 left-1/2 transform -translate-x-1/2 w-1/2'
                } h-full`}
                style={{
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(100px)',
                }}
              />
            ))}
          </div>
          
          {/* Content */}
          <div className="relative">
            {loading ? (
              <div className="text-center py-32">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-violet-400/20 blur-3xl rounded-full" />
                  <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-violet-400/30 border-t-violet-400 mx-auto mb-6" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/60 text-lg"
                >
                  در حال بارگذاری دوره‌ها...
                </motion.p>
              </div>
            ) : error ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="text-center py-32"
              >
                <motion.div
                  variants={scaleIn}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 mb-6 relative"
                >
                  <div className="absolute inset-0 bg-red-400/20 blur-2xl rounded-full" />
                  <svg
                    className="relative w-12 h-12 text-red-400"
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
                </motion.div>
                <motion.p variants={fadeUp} className="text-red-400 mb-6 text-xl">
                  {error}
                </motion.p>
                <motion.button
                  variants={fadeUp}
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-violet-400/20 hover:bg-violet-400/30 border border-violet-400/30 rounded-full text-violet-400 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                >
                  تلاش مجدد
                </motion.button>
              </motion.div>
            ) : filteredCourses.length > 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filteredCourses.map((course, index) => {
                  const courseImage = course.thumbnail
                    ? getImageUrlWithFallback(course.thumbnail, getRandomImage(index))
                    : getRandomImage(index);

                  const videoCount = course.videos?.length || 0;
                  const audioCount = course.audios?.length || 0;
                  const totalContent = videoCount + audioCount;
                  const cardBgImage = getRandomImage((index + 2) % randomImages.length);

                  return (
                    <motion.div
                      key={course.id}
                      variants={scaleIn}
                      whileHover={{ y: -12, scale: 1.03 }}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="group relative overflow-hidden rounded-[40px] border border-white/10 cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:shadow-[0_30px_80px_-20px_rgba(139,92,246,0.4)]"
                    >
                      {/* Blurred Background */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{
                          backgroundImage: `url(${cardBgImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'blur(60px)',
                          transform: 'scale(1.3)',
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 group-hover:from-black/90 group-hover:via-black/70 group-hover:to-black/50 transition-all duration-700" />
                      
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-violet-400/10 to-violet-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
                      
                      {/* Content */}
                      <div className="relative">
                        {/* Image Section */}
                        <div className="relative h-72 overflow-hidden">
                          <motion.img
                            src={courseImage}
                            alt={course.title}
                            className="w-full h-full object-cover"
                            initial={{ scale: 1 }}
                            whileHover={{ scale: 1.15 }}
                            transition={{ duration: 0.8 }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getRandomImage(index);
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {/* Badge */}
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            whileInView={{ scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="absolute top-6 right-6"
                          >
                            <span className="px-4 py-2 bg-violet-400/20 backdrop-blur-xl rounded-full text-xs font-bold text-violet-400 uppercase tracking-wider border border-violet-400/40 shadow-lg">
                              دوره
                            </span>
                          </motion.div>
                          
                          {/* Price */}
                          {course.price > 0 && (
                            <div className="absolute bottom-6 left-6">
                              <span className="px-4 py-2 bg-black/80 backdrop-blur-xl rounded-full text-sm font-bold text-white border border-white/20 shadow-lg">
                                {typeof course.price === 'number'
                                  ? course.price.toLocaleString('fa-IR')
                                  : course.price}{' '}
                                تومان
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="p-8">
                          <h3 className="text-2xl font-black mb-4 text-white group-hover:text-violet-400 transition-colors duration-300 line-clamp-2 min-h-[4rem]">
                            {course.title}
                          </h3>
                          
                          {course.description && (
                            <p className="text-base text-white/70 mb-6 line-clamp-3 leading-relaxed min-h-[5rem]">
                              {course.description}
                            </p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center justify-between pt-6 border-t border-white/20">
                            <div className="flex items-center gap-5 text-sm text-white/60">
                              {videoCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <svg
                                    className="w-5 h-5 text-violet-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                  </svg>
                                  <span className="font-semibold">{videoCount} ویدیو</span>
                                </div>
                              )}
                              {audioCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <svg
                                    className="w-5 h-5 text-purple-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-1.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="font-semibold">{audioCount} فایل صوتی</span>
                                </div>
                              )}
                              {totalContent === 0 && (
                                <span className="text-white/40">محتوایی موجود نیست</span>
                              )}
                            </div>
                            
                            {/* Arrow Icon */}
                            <motion.svg
                              className="w-6 h-6 text-violet-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              whileHover={{ x: 8 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </motion.svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="text-center py-32 border border-white/10 rounded-[40px] bg-black/40 backdrop-blur-xl relative overflow-hidden"
              >
                {/* Blurred Background */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `url(${backgroundImages[0]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(80px)',
                  }}
                />
                <div className="absolute inset-0 bg-black/60" />
                
                <div className="relative">
                  <motion.div
                    variants={scaleIn}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-8 relative"
                  >
                    <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full" />
                    <svg
                      className="relative w-12 h-12 text-white/40"
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
                  </motion.div>
                  <motion.h3 variants={fadeUp} className="text-2xl font-bold text-white mb-4">
                    {searchTerm ? 'دوره‌ای یافت نشد' : 'دوره‌ای برای نمایش وجود ندارد'}
                  </motion.h3>
                  <motion.p variants={fadeUp} className="text-white/60 mb-8 text-lg">
                    {searchTerm
                      ? `هیچ دوره‌ای با کلمه "${searchTerm}" یافت نشد.`
                      : 'در حال حاضر هیچ دوره منتشر شده‌ای در دسترس نیست.'
                    }
                  </motion.p>
                  <motion.button
                    variants={fadeUp}
                    onClick={() => navigate('/')}
                    className="px-8 py-3 bg-violet-400/20 hover:bg-violet-400/30 border border-violet-400/30 rounded-full text-violet-400 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                  >
                    بازگشت به صفحه اصلی
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Courses;
