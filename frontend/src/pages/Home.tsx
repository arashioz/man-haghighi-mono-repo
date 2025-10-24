import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { slidersService, coursesService, articlesService, podcastsService, workshopsService } from '../services/api';
import { Slider, Course, Article, Podcast, Workshop } from '../types';
import { formatPersianDate } from '../utils/dateUtils';

const Home: React.FC = () => {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [preRegisterModal, setPreRegisterModal] = useState<{isOpen: boolean, workshop: Workshop | null}>({isOpen: false, workshop: null});
  const [preRegisterData, setPreRegisterData] = useState({customerName: '', customerPhone: ''});
  const [preRegisterLoading, setPreRegisterLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slidersData, coursesData, articlesData, podcastsData, workshopsData] = await Promise.all([
          slidersService.getActive(),
          coursesService.getPublished(),
          articlesService.getPublished(),
          podcastsService.getPublished(),
          workshopsService.getActive(),
        ]);

        setSliders(slidersData);
        setCourses(coursesData.slice(0, 6)); // نمایش 6 دوره
        setArticles(articlesData.slice(0, 3));
        setPodcasts(podcastsData.slice(0, 6)); // نمایش 6 پادکست
        setWorkshops(workshopsData.slice(0, 3)); // نمایش 3 کارگاه فعال
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    if (sliders.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev === sliders.length - 1 ? 0 : prev + 1));
      }, 5000); // Change slide every 5 seconds

      return () => clearInterval(interval);
    }
  }, [sliders.length]);

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegisterModal.workshop) return;

    setPreRegisterLoading(true);
    try {
      await workshopsService.preRegister(preRegisterModal.workshop.id, {
        customerName: preRegisterData.customerName,
        customerPhone: preRegisterData.customerPhone,
      });
      
      alert('پیش‌ثبت‌نام با موفقیت انجام شد!');
      setPreRegisterModal({isOpen: false, workshop: null});
      setPreRegisterData({customerName: '', customerPhone: ''});
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در پیش‌ثبت‌نام');
    } finally {
      setPreRegisterLoading(false);
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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded max-w-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 1. اسلایدر */}
      <section className="relative">
        {sliders.length > 0 ? (
          <div className="relative h-screen overflow-hidden">
            {/* Slider Images */}
            <div className="relative w-full h-full">
              {sliders.map((slider, index) => (
                <div
                  key={slider.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={slider.image}
                    alt={slider.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                  <div className="absolute inset-0 flex items-end justify-start">
                    <div className="text-right text-white max-w-4xl px-8 pb-16">
                      <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
                        {slider.title}
                      </h1>
                      {slider.description && (
                        <p className="text-xl md:text-2xl mb-8 animate-fade-in-delay">
                          {slider.description}
                        </p>
                      )}
                      {slider.link && (
                        <button
                          onClick={() => navigate(slider.link!)}
                          className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 mr-auto"
                        >
                          شروع کنید
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            {sliders.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev === 0 ? sliders.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev === sliders.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {sliders.length > 1 && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {sliders.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentSlide ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-screen bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl md:text-7xl font-bold mb-6">خوش آمدید</h1>
              <p className="text-xl md:text-2xl mb-8">به پلتفرم آموزشی حقیقی</p>
            </div>
          </div>
        )}
      </section>

      {/* 2. درباره استاد قورچیان */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* تصویر استاد */}
            <div className="relative">
              <div className="relative z-10">
                <img
                  src="/assets/faraz.jpg"
                  alt="فراز قورچیان"
                  className="w-full h-[500px] object-cover rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-yellow-400 rounded-full opacity-20"></div>
            </div>

            {/* متن درباره استاد */}
            <div className="space-y-6">
              <div className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-semibold">
                درباره استاد
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                فراز قورچیان
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                فراز قورچیان موسس، مدیرعامل و راهبر گروه آموزشی من حقیقی می باشند. ایشان به عنوان محقق، مدرس و سخنران در حوزه خودآگاهی و توسعه فردی و معنا مشغول به فعالیت می باشند. همچنین به عنوان یک کارآفرین مدیریت و رهبری تیم کارکنان من حقیقی را برای رسیدن به اهداف، ماموریت و چشم انداز سازمان بر عهده دارند.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                برگزاری موفقیت آمیز بیش از دو هزار کارگاه آموزشی برای بیش از دویست هزار نفر در زمینه های مختلف خودشناسی، ناخودآگاه، روابط عاطفی و روابط مالی بخشی از فعالیت های درخشان ایشان در مدت هجده سال گذشته می باشد.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">300,000+</div>
                  <div className="text-sm text-gray-600">دانشجو</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">46,541</div>
                  <div className="text-sm text-gray-600">کاربران وبسایت</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">2,119</div>
                  <div className="text-sm text-gray-600">کارگاه برگزار شده</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">193</div>
                  <div className="text-sm text-gray-600">محتوای آموزشی</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/about')}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                بیشتر بدانید
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. لیست پادکست‌ها */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              پادکست‌ها
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              پادکست‌های آموزشی
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              گوش دهید به آخرین پادکست‌های آموزشی استاد قورچیان و از تجربیات ارزشمند ایشان بهره‌مند شوید
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {podcasts.slice(0, 6).map((podcast, index) => (
              <div key={podcast.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {podcast.title}
                    </h3>
                    {podcast.duration && (
                      <p className="text-sm text-gray-500">
                        {Math.floor(podcast.duration / 60)} دقیقه
                      </p>
                    )}
                  </div>
                </div>
                {podcast.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {podcast.description}
                  </p>
                )}
                <audio controls className="w-full mb-4">
                  <source src={podcast.audioFile} type="audio/mpeg" />
                  مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                </audio>
                {podcast.publishedAt && (
                  <p className="text-sm text-gray-500">
                    منتشر شده در {formatPersianDate(podcast.publishedAt)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/podcasts')}
              className="bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              مشاهده همه پادکست‌ها
            </button>
          </div>
        </div>
      </section>

      {/* 4. کارگاه‌های فعال */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              کارگاه‌های فعال
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              کارگاه‌های آموزشی فعال
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              شرکت کنید در کارگاه‌های حضوری استاد قورچیان و از تجربه‌های ارزشمند ایشان بهره‌مند شوید
            </p>
          </div>

          {workshops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {workshops.map((workshop) => (
                <div key={workshop.id} className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-orange-100">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {workshop.title}
                      </h3>
                    <p className="text-sm text-orange-600 font-medium">
                      {formatPersianDate(workshop.date)}
                    </p>
                    </div>
                  </div>
                  
                  {workshop.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {workshop.description}
                    </p>
                  )}
                  
                  <div className="space-y-3 mb-6">
                    {workshop.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {workshop.location}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {workshop.price ? `${workshop.price.toLocaleString()} تومان` : 'رایگان'}
                      </div>
                      
                      {workshop.maxParticipants && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {workshop.participants?.length || 0} / {workshop.maxParticipants}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setPreRegisterModal({isOpen: true, workshop})}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    پیش‌ثبت‌نام
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">کارگاه فعالی یافت نشد</h3>
              <p className="text-gray-600">در حال حاضر هیچ کارگاه فعالی وجود ندارد.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. پادکست‌های تصویری */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              پادکست‌های تصویری
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              ویدیو پادکست‌ها
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              تماشا کنید و گوش دهید به پادکست‌های تصویری استاد قورچیان
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="relative">
                  <img
                    src={`/images/podcasts/video-podcast-${item}.jpg`}
                    alt={`پادکست تصویری ${item}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    پادکست تصویری {item}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    توضیحات پادکست تصویری {item} - استاد قورچیان
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">45 دقیقه</span>
                    <button className="text-indigo-600 font-semibold hover:text-indigo-700">
                      تماشا کنید →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. دوره‌ها */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              دوره‌ها
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              دوره‌های آموزشی
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              شرکت کنید در دوره‌های جامع و حرفه‌ای استاد قورچیان
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {course.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-indigo-600">
                      ${course.price}
                    </span>
                    <button
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      مشاهده دوره
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/courses')}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              مشاهده همه دوره‌ها
            </button>
          </div>
        </div>
      </section>

      {/* 6. سازمان‌های همکار */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              همکاران
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              سازمان‌های همکار
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              افتخار همکاری با برترین سازمان‌ها و شرکت‌های فناوری
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {[
              { name: 'چای احمد', image: '/assets/brands/AHMED-TEA.png' },
              { name: 'دانشگاه امیرکبیر', image: '/assets/brands/amirkabir.png' },
              { name: 'بانک ملت', image: '/assets/brands/bank-mellat.png' },
              { name: 'بارز', image: '/assets/brands/barez.png' },
              { name: 'بهشتی', image: '/assets/brands/beheshti.png' },
              { name: 'چابهار', image: '/assets/brands/chabahar-sb-.png' },
              { name: 'هما', image: '/assets/brands/HOMA.png' },
              { name: 'ایران خودرو', image: '/assets/brands/irankhodro.png' },
              { name: 'چای محمود', image: '/assets/brands/MAHMOOD-TEA.png' },
              { name: 'مهرگان پارس', image: '/assets/brands/mehreghan-pars.png' },
              { name: 'شهرداری', image: '/assets/brands/shahrdari.png' },
              { name: 'تهران', image: '/assets/brands/tehran.png' }
            ].map((brand, index) => (
              <div key={index} className="flex items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="max-h-12 w-auto filter grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. البوم دوره‌ها */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              البوم دوره‌ها
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              گالری تصاویر کارگاه‌ها و دوره‌ها
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              نگاهی به فضای آموزشی و جو حاکم بر کارگاه‌های فراز قورچیان
            </p>
          </div>

          {/* Image Slider */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={[
                  '/assets/seminar-photo/seminar-12.jpg',
                  '/assets/seminar-photo/seminar-13.jpg',
                  '/assets/seminar-photo/seminar-14.jpg',
                  '/assets/seminar-photo/seminar-15.jpg',
                  '/assets/seminar-photo/seminar-17.jpg',
                  '/assets/seminar-photo/seminar-18.jpg',
                  '/assets/seminar-photo/seminar-19.jpg',
                  '/assets/seminar-photo/seminar-25.jpg',
                  '/assets/seminar-photo/seminar-29.jpg',
                  '/assets/seminar-photo/kargah-03.jpg',
                  '/assets/seminar-photo/kargah-04.jpg',
                  '/assets/seminar-photo/DSC_0514.jpg'
                ][currentSlide]}
                alt={`کارگاه آموزشی ${currentSlide + 1}`}
                className="w-full h-96 object-cover"
              />
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={() => {
                const totalSlides = 12;
                setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                const totalSlides = 12;
                setCurrentSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {Array.from({ length: 12 }, (_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    currentSlide === index ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-12">
            {[
              '/assets/seminar-photo/seminar-12.jpg',
              '/assets/seminar-photo/seminar-13.jpg',
              '/assets/seminar-photo/seminar-14.jpg',
              '/assets/seminar-photo/seminar-15.jpg',
              '/assets/seminar-photo/seminar-17.jpg',
              '/assets/seminar-photo/seminar-18.jpg',
              '/assets/seminar-photo/seminar-19.jpg',
              '/assets/seminar-photo/seminar-25.jpg',
              '/assets/seminar-photo/seminar-29.jpg',
              '/assets/seminar-photo/kargah-03.jpg',
              '/assets/seminar-photo/kargah-04.jpg',
              '/assets/seminar-photo/DSC_0514.jpg'
            ].map((image, index) => (
              <div key={index} className="relative group cursor-pointer">
                <img
                  src={image}
                  alt={`کارگاه آموزشی ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. فوتر */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* اطلاعات تماس */}
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">من حقیقی</h3>
              <p className="text-gray-300 mb-6 max-w-md">
                پلتفرم آموزشی پیشرو در حوزه خودآگاهی و توسعه فردی با راهبری فراز قورچیان، 
                موسس و مدیرعامل گروه آموزشی من حقیقی با بیش از 18 سال تجربه و برگزاری بیش از 2000 کارگاه آموزشی
              </p>
              <div className="space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-gray-300">آموزش حرفه‌ای و کاربردی</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-gray-300">پشتیبانی 24 ساعته</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-gray-300">گواهینامه معتبر</span>
                </div>
              </div>
            </div>

            {/* لینک‌های سریع */}
            <div>
              <h4 className="text-lg font-semibold mb-4">لینک‌های سریع</h4>
              <ul className="space-y-2">
                <li><button onClick={() => navigate('/courses')} className="text-gray-300 hover:text-white transition-colors">دوره‌ها</button></li>
                <li><button onClick={() => navigate('/articles')} className="text-gray-300 hover:text-white transition-colors">مقالات</button></li>
                <li><button onClick={() => navigate('/podcasts')} className="text-gray-300 hover:text-white transition-colors">پادکست‌ها</button></li>
                <li><button onClick={() => navigate('/about')} className="text-gray-300 hover:text-white transition-colors">درباره ما</button></li>
              </ul>
            </div>

            {/* شبکه‌های اجتماعی */}
            <div>
              <h4 className="text-lg font-semibold mb-4">شبکه‌های اجتماعی</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 پلتفرم آموزشی حقیقی. تمامی حقوق محفوظ است.
            </p>
          </div>
        </div>
      </footer>

      {/* مودال پیش‌ثبت‌نام */}
      {preRegisterModal.isOpen && preRegisterModal.workshop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">پیش‌ثبت‌نام در کارگاه</h3>
              <button
                onClick={() => setPreRegisterModal({isOpen: false, workshop: null})}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-gray-900 mb-2">{preRegisterModal.workshop.title}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>📅 تاریخ: {formatPersianDate(preRegisterModal.workshop.date)}</p>
                {preRegisterModal.workshop.location && <p>📍 مکان: {preRegisterModal.workshop.location}</p>}
                <p>💰 قیمت: {preRegisterModal.workshop.price ? `${preRegisterModal.workshop.price.toLocaleString()} تومان` : 'رایگان'}</p>
              </div>
            </div>
            
            <form onSubmit={handlePreRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  value={preRegisterData.customerName}
                  onChange={(e) => setPreRegisterData({...preRegisterData, customerName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="نام و نام خانوادگی خود را وارد کنید"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شماره تماس
                </label>
                <input
                  type="tel"
                  value={preRegisterData.customerPhone}
                  onChange={(e) => setPreRegisterData({...preRegisterData, customerPhone: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="شماره تماس خود را وارد کنید"
                  required
                />
              </div>
              
              <div className="flex space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => setPreRegisterModal({isOpen: false, workshop: null})}
                  disabled={preRegisterLoading}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={preRegisterLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50"
                >
                  {preRegisterLoading ? 'در حال ثبت...' : 'پیش‌ثبت‌نام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;