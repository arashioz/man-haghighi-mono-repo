import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { motion, type Variants, useScroll, useTransform } from 'framer-motion';
import Globe from 'react-globe.gl';
import {
  Slider,
  Course,
  Article,
  Podcast,
  VideoPodcast,
  Workshop,
} from '../../types';
import { getImageUrl, getImageUrlWithFallback } from '../../utils/imageUtils';
import { API_ORIGIN } from '../../services/api';
import { articlesService } from '../../services/api';
import VideoPodcastModal from '../VideoPodcastModal';
import VideoPodcastCard from '../VideoPodcastCard';

const ARTICLES_PAGE_SIZE = 10;

type HomeV2Props = {
  sliders: Slider[];
  courses: Course[];
  articles: Article[];
  podcasts: Podcast[];
  videoPodcasts?: VideoPodcast[];
  workshops: Workshop[];
  onBackToClassic: () => void;
  onOpenPreRegister: (workshop: Workshop | null) => void;
};

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
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
} satisfies Variants;

const curatedAssets = {
  heroImage: '/assets/homeV2/Qodrat Namahdood5.jpg',
  missionImage: '/assets/homeV2/Emotional Podcast2.jpg',
  gallery: [
    '/assets/homeV2/Qodrat Namahdood5.jpg',
    '/assets/homeV2/Pedar Nakhodagah6.jpg',
    '/assets/homeV2/Cast box Cover6.jpg',
    '/assets/homeV2/Emotional Podcast2.jpg',
    '/assets/homeV2/Artboard 2 copy 4.jpg',
    '/assets/homeV2/01.jpg',
    '/assets/homeV2/DSC_0514 (1).jpg',
    '/assets/homeV2/Drifter.jpg',
  ],
  videoPoster: '/assets/homeV2/Sexual Energy Transmutation.jpg',
  mentorImages: [
    '/assets/homeV2/Qodrat Namahdood5.jpg',
    '/assets/homeV2/Pedar Nakhodagah6.jpg',
    '/assets/homeV2/DSC_0514 (1).jpg',
    '/assets/homeV2/Emotional Podcast2.jpg',
  ],
  podcastCovers: [
    '/assets/homeV2/Cast box Cover6.jpg',
    '/assets/homeV2/Soundcloud Header1.jpg',
    '/assets/homeV2/Soundcloud Header2.jpg',
    '/assets/homeV2/Cover CD Getting The Hang of wound Healing3.jpg',
    '/assets/homeV2/Energy-Pool-Moarefi.jpg',
    '/assets/homeV2/Ehsase-Arzeshmandi-Moarefi.jpg',
  ],
};

const HomeV2: React.FC<HomeV2Props> = ({
  sliders,
  courses,
  articles,
  podcasts,
  videoPodcasts = [],
  workshops,
  onBackToClassic,
  onOpenPreRegister,
}) => {
  const navigate = useNavigate();

  const heroMedia = useMemo(() => {
    if (sliders[0]?.videoFile) {
      return {
        type: 'video' as const,
        source: sliders[0].videoFile,
        poster: getImageUrl(sliders[0].image) ?? curatedAssets.heroImage,
      };
    }

    if (sliders[0]?.image) {
      return { type: 'image' as const, source: getImageUrl(sliders[0].image) ?? '' };
    }

    if (curatedAssets.heroImage) {
      return { type: 'image' as const, source: curatedAssets.heroImage };
    }

    return { type: 'gradient' as const };
  }, [sliders]);

  const stats = [
    { label: 'سال فعالیت', value: '8+' },
    { label: 'کارگاه برگزار شده', value: '2000+' },
    { label: 'شرکت‌کننده', value: '200K+' },
    { label: 'دوره و برنامه', value: `${Math.max(courses.length, 6)}+` },
  ];

  const transformationLines = [
    'من حقیقی، مسیر ساختن یک زندگی آگاهانه است—با معنا، رشد و عمل.',
    'ما در کنار شما هستیم تا خودشناسی را از «دانستن» به «تبدیل شدن» تبدیل کنید.',
    'تمرین‌ها و تکنیک‌های راهبردی، برای عبور از موانع روانی، جسمی، مالی و عاطفی طراحی شده‌اند.',
    'بهترین نتایج وقتی اتفاق می‌افتد که تصمیم بگیرید و پیوسته اقدام کنید.',
    'این مسیر هم حضوری است و هم آنلاین—هرجا هستید می‌توانید هم‌مسیر شوید.',
    'شما نیز بخشی از داستان ما هستید.',
  ];

  const pillars = [
    {
      label: 'خودشناسی',
      title: 'خودشناسی و خودآگاهی',
      description:
        'شناخت عمیق خود، روشن‌کردن مسیر تصمیم‌ها و ساختن پایه‌های یک تغییر پایدار.',
    },
    {
      label: 'ناخودآگاه',
      title: 'کار با ناخودآگاه',
      description:
        'بازنویسی الگوها، رهاسازی گره‌ها و حرکت از تکرار به سمت انتخاب آگاهانه.',
    },
    {
      label: 'روابط',
      title: 'روابط عاطفی و مالی',
      description:
        'مهارت‌های ارتباطی و نگاه تازه به پول و ارزشمندی؛ برای ساختن روابط سالم و پایدار.',
    },
  ];

  const missionHighlights = [
    { value: '8+', label: 'سال فعالیت' },
    { value: '2000+', label: 'کارگاه آموزشی' },
    { value: '200K+', label: 'شرکت‌کننده' },
  ];

  const galleryImages = useMemo(() => {
    const sources = sliders
      .map((slide) => getImageUrl(slide.image))
      .filter((image): image is string => Boolean(image));

    return Array.from(new Set([...sources, ...curatedAssets.gallery])).slice(0, 9);
  }, [sliders]);

  const missionImage = curatedAssets.missionImage ?? galleryImages[0];

  const testimonialEntries = useMemo(() => {
    if (articles.length > 0) {
      return articles.slice(0, 3).map((article, index) => ({
        quote:
          article.excerpt ??
          'این مسیر ذهنم را بازنویسی کرد و جسارت تصمیم‌گیری مرا چند برابر نمود.',
        name: article.title ?? `شرکت‌کننده ${index + 1}`,
        role: 'عضو Engine Transformation',
      }));
    }

    return [
      {
        quote:
          'هر لحظه این تجربه مثل آتش بود؛ محدودیت‌هایم سوخت و چشم‌انداز تازه‌ای پیدا کردم.',
        name: 'مریم — رهبر فروش',
        role: 'شرکت‌کننده کارگاه',
      },
      {
        quote:
          'من یاد گرفتم رشد را انتخاب کنم و برایش سیستم بسازم. این شروع دوباره من است.',
        name: 'کاوه — کارآفرین تکنولوژی',
        role: 'عضو Inner Circle',
      },
      {
        quote:
          'قدرت واقعی را در تنظیم انرژی روزانه و تصمیم‌های قاطع پیدا کردم.',
        name: 'هلیا — مربی سلامت',
        role: 'دانشجوی برنامه تحول',
      },
    ];
  }, [articles]);

  const primaryWorkshop = workshops[0] ?? null;

  // Articles section: 10 per page with pagination (fetched in this component)
  const [articlesList, setArticlesList] = useState<Article[]>([]);
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesTotalPages, setArticlesTotalPages] = useState(1);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [articlesLoading, setArticlesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setArticlesLoading(true);
    articlesService.getPublished({ page: articlesPage, limit: ARTICLES_PAGE_SIZE })
      .then((res) => {
        if (!cancelled) {
          setArticlesList(res.data ?? []);
          setArticlesTotalPages(res.meta?.totalPages ?? 1);
          setArticlesTotal(res.meta?.total ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setArticlesList([]);
      })
      .finally(() => {
        if (!cancelled) setArticlesLoading(false);
      });
    return () => { cancelled = true; };
  }, [articlesPage]);

  const featuredPodcasts = useMemo(() => {
    return podcasts;
  }, [podcasts]);

  // Hero slider state - use dynamic sliders from backend
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroSlides = useMemo(() => {
    // First, use sliders from backend
    const backendSlides = sliders
      .filter(s => s.isActive)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => {
        if (s.videoFile) {
          return { type: 'video' as const, source: getImageUrl(s.videoFile) || '', poster: getImageUrl(s.image) || '', data: s };
        }
        return { type: 'image' as const, source: getImageUrl(s.image) || '', data: s };
      })
      .filter(s => s.source);
    
    if (backendSlides.length > 0) {
      return backendSlides;
    }
    
    // Fallback to curated assets
    const fallbackSlides = [
      curatedAssets.heroImage,
      curatedAssets.gallery[1],
      curatedAssets.gallery[2],
      curatedAssets.gallery[3],
      curatedAssets.missionImage,
    ].filter(Boolean);
    
    return fallbackSlides.map(img => ({ type: 'image' as const, source: img as string }));
  }, [sliders]);

  // Auto-rotate hero slider
  useEffect(() => {
    if (heroSlides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroSlides.length]);

  // Events slider state
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const featuredWorkshops = useMemo(() => {
    return workshops.slice(0, 6);
  }, [workshops]);

  // Auto-rotate events slider
  useEffect(() => {
    if (featuredWorkshops.length > 1) {
      const interval = setInterval(() => {
        setCurrentEventIndex((prev) => (prev + 1) % featuredWorkshops.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [featuredWorkshops.length]);

  // Global audio player (bottom bar)
  const {
    playPodcast,
    togglePlayPause,
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    seek,
  } = useAudioPlayer();

  // Parallax refs for sections
  const podcastSectionRef = useRef<HTMLDivElement>(null);
  const mentorSectionRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [places, setPlaces] = useState<any[]>([]);
  
  const { scrollYProgress: podcastScrollProgress } = useScroll({
    target: podcastSectionRef,
    offset: ['start end', 'end start'],
  });

  const { scrollYProgress: mentorScrollProgress } = useScroll({
    target: mentorSectionRef,
    offset: ['start end', 'end start'],
  });

  const podcastY1 = useTransform(podcastScrollProgress, [0, 1], ['0%', '30%']);
  const podcastY2 = useTransform(podcastScrollProgress, [0, 1], ['0%', '-30%']);
  const podcastOpacity = useTransform(podcastScrollProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  const mentorY1 = useTransform(mentorScrollProgress, [0, 1], ['0%', '30%']);
  const mentorY2 = useTransform(mentorScrollProgress, [0, 1], ['0%', '-30%']);
  const mentorOpacity = useTransform(mentorScrollProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  // Load populated places for globe labels (similar to official react-globe.gl example)
  useEffect(() => {
    fetch(
      '//unpkg.com/three-globe@2.36.0/example/datasets/ne_110m_populated_places_simple.geojson'
    )
      .then((res) => res.json())
      .then(({ features }) => {
        setPlaces(features || []);
      })
      .catch(() => {
        // Fallback: a few manual points
        setPlaces([
          {
            properties: {
              name: 'Tehran',
              latitude: 35.6892,
              longitude: 51.389,
              pop_max: 13532000,
            },
          },
          {
            properties: {
              name: 'Los Angeles',
              latitude: 34.0522,
              longitude: -118.2437,
              pop_max: 12750807,
            },
          },
          {
            properties: {
              name: 'London',
              latitude: 51.5074,
              longitude: -0.1278,
              pop_max: 9126366,
            },
          },
          {
            properties: {
              name: 'Tokyo',
              latitude: 35.6762,
              longitude: 139.6503,
              pop_max: 37435191,
            },
          },
        ]);
      });
  }, []);

  // Audio player handlers (hooked to global bar)
  const handlePlayPause = (podcast: Podcast) => {
    const audioUrl = podcast.streamUrl || (podcast.audioFile ? `${API_ORIGIN}/uploads/${podcast.audioFile}` : null);
    if (!audioUrl) {
      alert('فایل صوتی در دسترس نیست');
      return;
    }

    if (currentPodcast?.id === podcast.id) {
      togglePlayPause();
    } else {
      playPodcast(podcast);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentPodcast) return;
    const percent = parseFloat(e.target.value);
    const newTime = (percent / 100) * (duration || 0);
    seek(newTime);
  };

  const handleJumpBackward = () => {
    if (!currentPodcast) return;
    seek(Math.max(0, currentTime - 30));
  };

  const handleJumpForward = () => {
    if (!currentPodcast) return;
    seek(Math.min(duration, currentTime + 30));
  };

  const handlePrevious = () => {
    if (featuredPodcasts.length === 0) return;
    const currentId = currentPodcast?.id;
    const currentIndex = currentId ? featuredPodcasts.findIndex((p) => p.id === currentId) : 0;
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const prevIndex = safeIndex > 0 ? safeIndex - 1 : featuredPodcasts.length - 1;
    handlePlayPause(featuredPodcasts[prevIndex]);
  };

  const handleNext = () => {
    if (featuredPodcasts.length === 0) return;
    const currentId = currentPodcast?.id;
    const currentIndex = currentId ? featuredPodcasts.findIndex((p) => p.id === currentId) : 0;
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + 1) % featuredPodcasts.length;
    handlePlayPause(featuredPodcasts[nextIndex]);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePrimaryCta = () => {
    if (primaryWorkshop) {
      onOpenPreRegister(primaryWorkshop);
      return;
    }
    navigate('/workshops');
  };

  const [selectedVideoPodcast, setSelectedVideoPodcast] = useState<VideoPodcast | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleVideoPodcastClick = (video: VideoPodcast) => {
    setSelectedVideoPodcast(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideoPodcast(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Hero Slider Section */}
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          {/* Slider Background Images */}
          {heroSlides.map((slide, index) => {
            const slideSrc = typeof slide === 'string' ? slide : (slide as any).source;
            const isVideo = typeof slide !== 'string' && (slide as any).type === 'video';
            const slideData = typeof slide !== 'string' ? (slide as any).data : null;
            const slidePoster = typeof slide !== 'string' && isVideo ? (slide as any).poster : undefined;
            
            // Use unique ID from slider data if available, otherwise use source URL or index
            const uniqueKey = slideData?.id || slideSrc || `slide-${index}`;
            
            return (
              <motion.div
                key={uniqueKey}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: currentSlide === index ? 1 : 0,
                  scale: currentSlide === index ? 1 : 1.1,
                }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                {isVideo && slideSrc ? (
                  <video
                    key={`${uniqueKey}-video`}
                    src={slideSrc}
                    poster={slidePoster}
                    className="h-full w-full object-cover"
                    autoPlay={currentSlide === index}
                    loop
                    muted
                    playsInline
                  />
                ) : slideSrc ? (
                  <img
                    key={`${uniqueKey}-img`}
                    src={slideSrc}
                    alt={slideData?.title || `Hero slide ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </motion.div>
            );
          })}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-[#0a0a0a]" />
          
          {/* Slider Indicators */}
          {heroSlides.length > 1 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {heroSlides.map((slide, index) => {
                const slideData = typeof slide !== 'string' ? (slide as any).data : null;
                const slideSrc = typeof slide === 'string' ? slide : (slide as any).source;
                const uniqueKey = slideData?.id || slideSrc || `indicator-${index}`;
                
                return (
                  <button
                    key={uniqueKey}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === index
                        ? 'w-8 bg-violet-400'
                        : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="relative mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-end gap-8 px-4 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {/* Get hero content from current slider */}
            {(() => {
              const currentSlider = heroSlides.length > 0 && typeof heroSlides[currentSlide] !== 'string' 
                ? (heroSlides[currentSlide] as any).data 
                : sliders[currentSlide] || sliders[0];
              const heroTitle = currentSlider?.title || 'Engine Transformation 2.0';
              const heroSubtitle = currentSlider?.description || 'مسیر رشد و یادگیری در من حقیقی';
              const heroDescription = currentSlider?.description || 'برنامه‌ها و کارگاه‌های من حقیقی را اینجا دنبال کنید تا تازه‌ترین مسیرهای یادگیری و رشد را تجربه کنید.';
              
              return (
                <>
                  <motion.span
                    className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.6em] text-violet-400"
                    variants={fadeUp}
                  >
                    <span>نسخه ۲</span>
                    <span className="h-1 w-1 rounded-full bg-violet-400" />
                    <span>Engine Transformation</span>
                  </motion.span>
                  <motion.h1
                    key={currentSlide}
                    variants={fadeUp}
                    className="mt-6 text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl text-right"
                  >
                    {heroTitle}
                    <br />
                    <span className="text-white/70">{heroSubtitle}</span>
                  </motion.h1>
                  <motion.p
                    key={`desc-${currentSlide}`}
                    variants={fadeUp}
                    className="mt-6 max-w-3xl text-sm text-white/70 sm:text-base text-right"
                  >
                    {heroDescription}
                  </motion.p>
                </>
              );
            })()}
            <motion.div className="mt-8 flex flex-wrap gap-4" variants={fadeUp}>
              <button
                onClick={handlePrimaryCta}
                className="rounded-full bg-gradient-to-r from-violet-400 via-violet-500 to-violet-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(139,92,246,0.8)] transition hover:scale-105"
              >
                عضویت در من حقیقی
              </button>
              <button
                onClick={() => navigate('/about')}
                className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
              >
                داستان فراز قورچیان
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur"
              >
                <p className="text-3xl font-black text-violet-400">{stat.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/60">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        {/* Events that liberate - Animated Slider */}
        <section className="relative border-t border-white/10 py-16 sm:py-20 overflow-hidden">
          {/* Background Images */}
          <div className="absolute inset-0">
            {curatedAssets.gallery.slice(0, 3).map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 1.1 }}
                whileInView={{ opacity: 0.15, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: idx * 0.3 }}
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px)',
                }}
              />
            ))}
          </div>
          
          <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mb-12 text-center"
            >
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400 mb-4"
              >
                رویدادها
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-5xl font-bold sm:text-6xl lg:text-7xl mb-6 text-right">
                رویدادهایی برای رشد و تحول
              </motion.h2>
              <motion.p variants={fadeUp} className="text-xl text-white/80 max-w-3xl mx-auto text-right">
                کارگاه‌ها و رویدادهایی که مسیر خودشناسی و تغییر پایدار را برای شما روشن می‌کنند.
              </motion.p>
            </motion.div>

            {featuredWorkshops.length > 0 ? (
              <div className="relative">
                <div className="overflow-hidden rounded-[40px]">
                  <motion.div
                    key={currentEventIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="relative"
                  >
                    {featuredWorkshops.map((workshop, index) => {
                      if (index !== currentEventIndex) return null;
                      const defaultImage = curatedAssets.gallery[index % curatedAssets.gallery.length];
                      const bgImage = workshop.thumbnail 
                        ? getImageUrlWithFallback(workshop.thumbnail, defaultImage)
                        : defaultImage;
                      
                      return (
                        <div
                          key={workshop.id}
                          className="relative min-h-[500px] sm:min-h-[600px] rounded-[40px] overflow-hidden border border-white/20"
                        >
                          {/* Background Image */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `url(${bgImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60" />
                          </div>

                          <div className="relative grid lg:grid-cols-2 gap-8 items-center min-h-[500px] sm:min-h-[600px] p-8 sm:p-12">
                            <motion.div
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="space-y-6"
                            >
                              <div className="inline-block px-4 py-2 bg-violet-400/20 backdrop-blur rounded-full border border-violet-400/30">
                                <span className="text-sm font-semibold text-violet-400 uppercase tracking-wider">
                                  {workshop.isActive ? 'رویداد فعال' : 'رویداد آتی'}
                                </span>
                              </div>
                              <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                                {workshop.title}
                              </h3>
                              {workshop.description && (
                                <p className="text-lg text-white/80 leading-relaxed">
                                  {workshop.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 pt-4">
                                <button
                                  onClick={() => onOpenPreRegister(workshop)}
                                  className="rounded-full bg-gradient-to-r from-violet-400 via-violet-500 to-violet-600 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(139,92,246,0.8)] transition hover:scale-105"
                                >
                                  ثبت نام
                                </button>
                                <button
                                  onClick={() => navigate(`/workshops/${workshop.id}`)}
                                  className="rounded-full border border-white/30 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
                                >
                                  جزئیات بیشتر
                                </button>
                              </div>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 }}
                              className="relative h-full min-h-[300px] rounded-3xl overflow-hidden border border-white/20"
                            >
                              <img
                                src={bgImage}
                                alt={workshop.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Event Navigation */}
                {featuredWorkshops.length > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      onClick={() => setCurrentEventIndex((prev) => (prev - 1 + featuredWorkshops.length) % featuredWorkshops.length)}
                      className="p-3 rounded-full border border-white/20 hover:border-violet-400/50 hover:bg-violet-400/10 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex gap-2">
                      {featuredWorkshops.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentEventIndex(index)}
                          className={`h-2 rounded-full transition-all ${
                            currentEventIndex === index
                              ? 'w-8 bg-violet-400'
                              : 'w-2 bg-white/30 hover:bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentEventIndex((prev) => (prev + 1) % featuredWorkshops.length)}
                      className="p-3 rounded-full border border-white/20 hover:border-violet-400/50 hover:bg-violet-400/10 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]/50 backdrop-blur">
                <p className="text-white/60">رویدادی برای نمایش وجود ندارد</p>
              </div>
            )}
          </div>
        </section>

        {/* Video Podcasts Carousel */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400">
                ویدیوپادکست‌ها
              </p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight text-right">
                ویدیوپادکست‌های ما
              </h2>
              <p className="text-sm sm:text-base text-white/70 max-w-2xl text-right">
                آخرین ویدیوپادکست‌های بارگذاری‌شده را اینجا ببینید؛ روی هر کدام کلیک کنید تا در پاپ‌آپ پخش شود.
              </p>
            </div>
            <button
              onClick={() => navigate('/video-podcasts')}
              className="self-end rounded-full border border-white/30 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
            >
              همه ویدیوپادکست‌ها
            </button>
          </div>

          {videoPodcasts.length > 0 ? (
            <div className="relative mt-8">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
              <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory hide-scrollbar">
                {videoPodcasts.map((video) => (
                  <VideoPodcastCard
                    key={video.id}
                    video={video}
                    curatedAssets={curatedAssets}
                    onClick={handleVideoPodcastClick}
                    variants={fadeUp}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 text-sm text-right">
              هنوز ویدیوپادکست فعالی ثبت نشده است.
            </div>
          )}
        </section>

        {/* About · Mission - Enhanced with Background */}
        <section className="relative border-t border-white/10 py-16 sm:py-20 overflow-hidden">
          {/* Background Images */}
          <div className="absolute inset-0">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.15 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${curatedAssets.missionImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(60px)',
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="space-y-6"
              >
                <motion.p
                  variants={fadeUp}
                  className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400"
                >
                  درباره · ماموریت
                </motion.p>
                <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl lg:text-6xl text-right">
                  من حقیقی برای ساختن آینده‌ای است که منتظرش بودی
                </motion.h2>
                <motion.p variants={fadeUp} className="text-lg leading-relaxed text-white/80 text-right">
                  ما تغییر را جرقه می‌زنیم و تحول را تثبیت می‌کنیم. با دوره‌ها و کارگاه‌های من حقیقی، مسیر خودشناسی،
                  کار با ناخودآگاه، روابط عاطفی و روابط مالی را عملی و قابل‌اجرا تجربه می‌کنید.
                </motion.p>
                <motion.div
                  variants={stagger}
                  className="grid gap-6 sm:grid-cols-2"
                >
                  {missionHighlights.map((item) => (
                    <motion.div
                      key={item.label}
                      variants={fadeUp}
                      className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur"
                    >
                      <p className="text-3xl font-black text-violet-400">{item.value}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/60">
                        {item.label}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/5"
            >
              <div className="relative h-[500px] sm:h-[600px] lg:h-[700px] w-full">
                <img
                  src="/assets/faraz.jpg"
                  alt="فراز قورچیان"
                  className="h-full w-full object-cover scale-110"
                  style={{ filter: 'blur(20px)' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = curatedAssets.missionImage;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="/assets/faraz.jpg"
                    alt="فراز قورچیان"
                    className="h-[70%] w-auto max-w-[80%] object-contain rounded-2xl shadow-2xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = curatedAssets.missionImage;
                    }}
                  />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/20 bg-black/50 p-6 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.5em] text-violet-400">فراز قورچیان</p>
                <p className="mt-3 text-base leading-relaxed text-white/90 text-right">
                  فراز قورچیان به عنوان محقق، مدرس و سخنران در حوزه خودآگاهی، توسعه فردی و معنا فعالیت می‌کند. 
                  با مدیریت و راهبری تیم من حقیقی، مسیر رشد مخاطبان را با راهبردهای آموزشی و تجربه‌های عملی همراهی می‌کند.
                </p>
              </div>
            </motion.div>
            </div>
          </div>
        </section>

        {/* 3D Globe Section - full width */}
        <section className="relative border-t border-white/10 py-16 sm:py-24 overflow-hidden">
          {/* Soft background glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-8 w-full">
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-400/5 via-transparent to-purple-500/10" />

              <div className="relative flex flex-col items-center gap-12 w-full p-6 sm:p-8">
                {/* 3D globe - centered and larger */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                  className="w-full flex justify-center"
                >
                  <div className="relative w-full max-w-[800px] aspect-square flex justify-center items-center">
                    {/* Simplified container - no background/border as requested */}
                    <Globe
                      ref={globeRef}
                      backgroundColor="rgba(0,0,0,0)"
                      globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
                      showAtmosphere
                      atmosphereColor="lightskyblue"
                      atmosphereAltitude={0.25}
                      labelsData={places}
                      labelLat={(d: any) => d.properties?.latitude}
                      labelLng={(d: any) => d.properties?.longitude}
                      labelText={(d: any) => d.properties?.name}
                      labelSize={(d: any) => Math.sqrt(d.properties?.pop_max || 1) * 4e-4}
                      labelDotRadius={(d: any) => Math.sqrt(d.properties?.pop_max || 1) * 4e-4}
                      labelColor={() => 'rgba(255,165,0,0.8)'}
                      labelResolution={2}
                      width={window.innerWidth < 768 ? 400 : 700}
                      height={window.innerWidth < 768 ? 400 : 700}
                      onGlobeReady={() => {
                        const controls = globeRef.current?.controls?.();
                        if (controls) {
                          controls.enableZoom = false;
                          controls.enableRotate = true;
                          controls.enablePan = false;
                          controls.autoRotate = true;
                          controls.autoRotateSpeed = 0.8;
                        }
                      }}
                    />
                  </div>
                </motion.div>

                {/* Text - centered below globe */}
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  className="relative z-10 space-y-6 text-center w-full max-w-4xl flex flex-col items-center"
                >
                  <motion.p
                    variants={fadeUp}
                    className="inline-block rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.5em] text-violet-400"
                  >
                    شبکه جهانی من حقیقی
                  </motion.p>
                  <motion.h2
                    variants={fadeUp}
                    className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight"
                  >
                    یک کره، هزار داستان تحول
                  </motion.h2>
                  <motion.p
                    variants={fadeUp}
                    className="text-lg leading-relaxed text-white/85"
                  >
                    این کره چرخان نمایی واقعی و نمادین از جامعه جهانی من حقیقی است؛ افرادی از شهرها و
                    کشور‌های مختلف که تصمیم گرفته‌اند نسخه دوم زندگی‌شان را بسازند. هر نقطه، یک انتخاب
                    تازه برای رشد و آگاهی است.
                  </motion.p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Podcasts Section - Tony Robbins Style */}
        <section 
          ref={podcastSectionRef}
          className="relative border-t border-white/10 py-24 sm:py-32 overflow-hidden"
        >
          {/* Background Images */}
          <div className="absolute inset-0">
            {curatedAssets.podcastCovers.slice(0, 3).map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: idx * 0.2 }}
                className={`absolute ${idx === 0 ? 'top-0 left-0 w-1/3' : idx === 1 ? 'top-0 right-0 w-1/3' : 'bottom-0 left-1/2 transform -translate-x-1/2 w-1/3'} h-full`}
                style={{
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(80px)',
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              {/* Header */}
              <div className="mb-10 flex flex-wrap items-center justify-between gap-2.5 md:flex-row md:gap-5">
                <motion.h3
                  variants={fadeUp}
                  className="text-lg font-medium tracking-tighter text-white text-right"
                >
                  پادکست‌ها
                </motion.h3>
                <motion.a
                  variants={fadeUp}
                  href="/podcasts"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/podcasts');
                  }}
                  className="group flex gap-2 items-center font-medium opacity-60 hover:opacity-100 duration-500 w-auto"
                >
                  <span>همه اپیزودها</span>
                  <svg
                    viewBox="0 0 20 20"
                    className="h-5 w-5 fill-current duration-500 group-hover:translate-x-1 rotate-0"
                  >
                    <title>Carat</title>
                    <path d="M10.9724 10.0006L6.84766 5.87577L8.02616 4.69727L13.3295 10.0006L8.02616 15.3038L6.84766 14.1253L10.9724 10.0006Z" />
                  </svg>
                </motion.a>
              </div>

              {featuredPodcasts.length > 0 ? (
                <ul className="grid grid-cols-1 items-stretch gap-10 rounded-3xl bg-violet-400/10 backdrop-blur-sm border border-violet-400/20 p-5 md:p-8 lg:[grid-template-columns:1.05fr_1.45fr]">
                  {/* Featured Player - First Podcast */}
                  <li className="mx-auto flex w-full max-w-xl flex-col items-center space-y-8 p-4">
                    {featuredPodcasts[0] && (() => {
                      const featuredPodcast = featuredPodcasts[0];
                      const coverImage = curatedAssets.podcastCovers[0];
                      const isCurrentlyPlaying = currentPodcast?.id === featuredPodcast.id;
                      const audioUrl = featuredPodcast.streamUrl || (featuredPodcast.audioFile ? `${API_ORIGIN}/uploads/${featuredPodcast.audioFile}` : null);
                      const progressPercent = isCurrentlyPlaying && duration > 0 ? (currentTime / duration) * 100 : 0;

                      return (
                        <>
                          <a
                            href={`/podcasts/${featuredPodcast.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/podcasts/${featuredPodcast.id}`);
                            }}
                            className="block"
                          >
                            <div className="relative h-64 w-64 overflow-hidden rounded-xl shadow-xl">
                              <img
                                alt={featuredPodcast.title}
                                loading="lazy"
                                width={256}
                                height={256}
                                className="absolute inset-0 h-full w-full object-cover"
                                src={coverImage}
                              />
                            </div>
                          </a>
                          <div className="text-center w-full">
                            <span className="text-label s mb-2 flex w-full flex-wrap items-center space-x-1 opacity-60 justify-center text-sm">
                              <span>پادکست</span>
                              <span className="mx-2 h-1 w-1 rounded-full bg-white opacity-60"></span>
                              <span>{featuredPodcast.publishedAt ? new Date(featuredPodcast.publishedAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'اخیر'}</span>
                            </span>
                            <a
                              href={`/podcasts/${featuredPodcast.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/podcasts/${featuredPodcast.id}`);
                              }}
                              className="block"
                            >
                              <h3 className="text-xl text-white hover:text-violet-400 transition-colors text-right">
                                {featuredPodcast.title}
                              </h3>
                            </a>
                          </div>
                          <div className="w-full">
                            <div className="w-full">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={isCurrentlyPlaying ? progressPercent : 0}
                                onChange={handleSeek}
                                className="related-podcasts-progress-bar rounded-full bg-white/10 w-full h-1 cursor-pointer accent-violet-400"
                                style={{
                                  background: `linear-gradient(to right, rgb(250, 204, 21) 0%, rgb(250, 204, 21) ${progressPercent}%, rgba(255, 255, 255, 0.1) ${progressPercent}%, rgba(255, 255, 255, 0.1) 100%)`
                                }}
                                disabled={!isCurrentlyPlaying}
                              />
                            </div>
                            <div className="relative flex w-full justify-between pt-2 text-xs text-white/60" dir="ltr">
                              <span>{formatTime(isCurrentlyPlaying ? currentTime : 0)}</span>
                              <span>{formatTime(duration || featuredPodcast.duration || 0)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center space-x-6">
                            <button
                              onClick={handlePrevious}
                              disabled={featuredPodcasts.length <= 1}
                              aria-label="go to previous"
                              className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:scale-105 ${featuredPodcasts.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                            >
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" className="text-white">
                                <path fill="none" d="M0 0h24v24H0z"></path>
                                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"></path>
                              </svg>
                            </button>
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={handleJumpBackward}
                                disabled={!isCurrentlyPlaying}
                                aria-label="jump backward"
                                className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:scale-105 ${!isCurrentlyPlaying ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                              >
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="h-6 w-6 text-white">
                                  <path fill="none" d="M0 0h24v24H0V0z"></path>
                                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-2.44 8.49h.45c.21 0 .37-.05.48-.16s.16-.25.16-.43a.538.538 0 0 0-.15-.39c-.05-.05-.11-.09-.18-.11s-.16-.04-.25-.04c-.08 0-.15.01-.22.03s-.13.05-.18.1-.09.09-.12.15-.05.13-.05.2h-.85a1.06 1.06 0 0 1 .41-.85c.13-.1.27-.18.44-.23s.35-.08.54-.08c.21 0 .41.03.59.08s.33.13.46.23.23.23.3.38.11.33.11.53a.842.842 0 0 1-.17.52 1.1 1.1 0 0 1-.48.39c.24.09.42.21.54.39s.18.38.18.61c0 .2-.04.38-.12.53s-.18.29-.32.39-.29.19-.48.24-.38.08-.6.08c-.18 0-.36-.02-.53-.07s-.33-.12-.46-.23-.25-.23-.33-.38-.12-.34-.12-.55h.85c0 .08.02.15.05.22s.07.12.13.17.12.09.2.11.16.04.25.04c.1 0 .19-.01.27-.04s.15-.07.2-.12.1-.11.13-.18.04-.15.04-.24c0-.11-.02-.21-.05-.29s-.08-.15-.14-.2-.13-.09-.22-.11-.18-.04-.29-.04h-.47v-.65zm5.74.75c0 .32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82v.74zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v.97c0 .19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32c.03-.13.04-.29.04-.48v-.97z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePlayPause(featuredPodcast)}
                              disabled={!audioUrl}
                              aria-label="Play"
                              className={`relative h-[72px] w-[72px] rounded-full text-black hover:scale-105 transition-transform ${isCurrentlyPlaying && isPlaying ? 'bg-violet-400' : 'bg-white'} ${!audioUrl ? 'opacity-15 cursor-not-allowed' : ''}`}
                            >
                              {isCurrentlyPlaying && isPlaying ? (
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform h-8 w-8">
                                  <path fill="none" d="M0 0h24v24H0z"></path>
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path>
                                </svg>
                              ) : (
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform h-8 w-8">
                                  <path fill="none" d="M0 0h24v24H0z"></path>
                                  <path d="M8 5v14l11-7z"></path>
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={handleJumpForward}
                              disabled={!isCurrentlyPlaying}
                              aria-label="jump forward"
                              className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:scale-105 ${!isCurrentlyPlaying ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                            >
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="h-6 w-6 text-white">
                                <path fill="none" d="M0 0h24v24H0z"></path>
                                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"></path>
                                <path d="M10.06 15.38c-.29 0-.62-.17-.62-.54h-.85c0 .97.9 1.23 1.45 1.23.87 0 1.51-.46 1.51-1.25 0-.66-.45-.9-.71-1 .11-.05.65-.32.65-.92 0-.21-.05-1.22-1.44-1.22-.62 0-1.4.35-1.4 1.16h.85c0-.34.31-.48.57-.48.59 0 .58.5.58.54 0 .52-.41.59-.63.59h-.46v.66h.45c.65 0 .7.42.7.64 0 .32-.21.59-.65.59zM13.85 11.68c-.14 0-1.44-.08-1.44 1.82v.74c0 1.9 1.31 1.82 1.44 1.82.14 0 1.44.09 1.44-1.82v-.74c.01-1.91-1.3-1.82-1.44-1.82zm.6 2.67c0 .77-.21 1.03-.59 1.03s-.6-.26-.6-1.03v-.97c0-.75.22-1.01.59-1.01.38 0 .6.26.6 1.01v.97z"></path>
                              </svg>
                            </button>
                          </div>
                          <button
                            onClick={handleNext}
                            disabled={featuredPodcasts.length <= 1}
                            aria-label="go to next"
                            className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:scale-105 ${featuredPodcasts.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                          >
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" className="text-white">
                              <path fill="none" d="M0 0h24v24H0z"></path>
                              <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z"></path>
                            </svg>
                          </button>
                        </div>
                      </>
                      );
                    })()}
                  </li>

                  {/* Other Podcasts List */}
                  <div className="divide-y divide-violet-400/20">
                    {featuredPodcasts.slice(1).map((podcast, index) => {
                      const coverImage = curatedAssets.podcastCovers[(index + 1) % curatedAssets.podcastCovers.length];
                      const audioUrl = podcast.streamUrl || (podcast.audioFile ? `${API_ORIGIN}/uploads/${podcast.audioFile}` : null);
                      
                      return (
                        <li key={podcast.id} className="flex w-full gap-4 py-4 md:items-center">
                          <a
                            href={`/podcasts/${podcast.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/podcasts/${podcast.id}`);
                            }}
                            className="block"
                          >
                            <div className="relative h-20 w-20 overflow-hidden rounded-lg">
                              <img
                                alt={podcast.title}
                                loading="lazy"
                                width={80}
                                height={80}
                                className="absolute inset-0 h-full object-cover"
                                src={coverImage}
                              />
                            </div>
                          </a>
                          <div className="flex w-full flex-col items-start md:flex-row md:items-center">
                            <div className="mb-3 flex-grow md:mb-0">
                              <span className="text-label s mb-2 flex w-full flex-wrap items-center space-x-1 opacity-60 text-sm">
                                <span>پادکست</span>
                                <span className="mx-2 h-1 w-1 rounded-full bg-white opacity-60"></span>
                                <span>{podcast.publishedAt ? new Date(podcast.publishedAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'اخیر'}</span>
                              </span>
                              <a
                                href={`/podcasts/${podcast.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/podcasts/${podcast.id}`);
                                }}
                                className="block"
                              >
                                <h3 className="text-base leading-none tracking-tighter text-white hover:text-violet-400 transition-colors text-right">
                                  {podcast.title}
                                </h3>
                              </a>
                            </div>
                            <button
                              onClick={() => handlePlayPause(podcast)}
                              disabled={!audioUrl}
                              className={`cursor-pointer group inline-flex items-center justify-center gap-2 font-medium text-center tracking-wide rounded-full duration-500 border border-violet-400/30 bg-violet-400/20 hover:bg-violet-400/30 text-white w-auto text-sm py-2 px-4 transition-all ${!audioUrl ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                              <svg viewBox="0 0 24 24" fill="transparent" className="flex h-5 w-5 fill-current">
                                <title>Play</title>
                                <path d="M17.2335 11.1362C17.895 11.5221 17.895 12.4779 17.2335 12.8638L6.50387 19.1227C5.83721 19.5116 5 19.0308 5 18.259L5 5.74104C5 4.96925 5.83721 4.48838 6.50387 4.87726L17.2335 11.1362Z" />
                              </svg>
                              <span>
                                <span className="text-nowrap leading-none">گوش دهید</span>
                              </span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </div>
                </ul>
              ) : (
                <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]/50 backdrop-blur">
                  <p className="text-white/60">پادکستی برای نمایش وجود ندارد</p>
                  <button
                    onClick={() => navigate('/podcasts')}
                    className="mt-4 text-violet-400 hover:text-violet-500 text-sm uppercase tracking-wider"
                  >
                    مشاهده همه پادکست‌ها
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Mentor Section - فراز قورچیان */}
        <section 
          ref={mentorSectionRef}
          className="relative border-t border-white/10 py-24 sm:py-32 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#040404] via-[#0a0a0a] to-[#040404]" />
          
          {/* Parallax Background Images */}
          <motion.div 
            style={{ y: mentorY1, opacity: mentorOpacity }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute top-0 right-0 w-1/3 h-full">
              <img
                src={curatedAssets.mentorImages[0]}
                alt=""
                className="w-full h-full object-cover opacity-20 blur-sm"
              />
            </div>
            <div className="absolute bottom-0 left-0 w-1/3 h-full">
              <img
                src={curatedAssets.mentorImages[1]}
                alt=""
                className="w-full h-full object-cover opacity-20 blur-sm"
              />
            </div>
          </motion.div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="grid gap-12 lg:grid-cols-2 lg:items-center"
            >
              <motion.div variants={fadeUp} className="space-y-6">
                <motion.p
                  variants={fadeUp}
                  className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400"
                >
                  داستان فراز قورچیان
                </motion.p>
                <motion.h2 
                  variants={fadeUp} 
                  className="text-4xl font-bold sm:text-5xl lg:text-6xl text-right"
                >
                  فراز قورچیان
                  <br />
                  <span className="text-violet-400">مربی تحول و رشد شخصی</span>
                </motion.h2>
                <motion.p 
                  variants={fadeUp} 
                  className="text-lg leading-relaxed text-white/80 text-right"
                >
                  با بیش از یک دهه تجربه در زمینه کوچینگ، روانشناسی تحول و مهندسی رشد شخصی، 
                  فراز قورچیان خالق Engine Transformation است. رویکرد او ترکیبی از علم، 
                  تجربه و انرژی است که به هزاران نفر کمک کرده تا نسخه بهتری از خودشان بسازند.
                </motion.p>
                <motion.p 
                  variants={fadeUp} 
                  className="text-base leading-relaxed text-white/70 text-right"
                >
                  هر برنامه، هر کارگاه و هر لحظه از این سفر با دقت طراحی شده تا تو را 
                  به سمت تحولی واقعی و پایدار هدایت کند. این فقط یک برنامه نیست؛ 
                  این یک انقلاب شخصی است.
                </motion.p>
                <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={() => navigate('/about')}
                    className="rounded-full bg-gradient-to-r from-violet-400 via-violet-500 to-violet-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(139,92,246,0.8)] transition hover:scale-105"
                  >
                    درباره مربی
                  </button>
                  <button
                    onClick={() => navigate('/workshops')}
                    className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
                  >
                    کارگاه‌ها
                  </button>
                </motion.div>
              </motion.div>

              <motion.div 
                variants={fadeUp}
                style={{ y: mentorY2 }}
                className="relative"
              >
                <div className="grid grid-cols-2 gap-4">
                  {curatedAssets.mentorImages.slice(0, 4).map((img, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.05, zIndex: 10 }}
                      className={`relative overflow-hidden rounded-[24px] border border-white/20 bg-white/5 backdrop-blur ${
                        idx === 0 ? 'col-span-2 h-64' : 'h-48'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Mentor ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {idx === 0 && (
                        <div className="absolute bottom-4 left-4 right-4">
                          <p className="text-xs uppercase tracking-[0.5em] text-violet-400 mb-2">
                            چشم‌انداز و ماموریت
                          </p>
                          <p className="text-white/90 text-sm font-medium text-right">
                            ساختن آینده‌ای که منتظرش بودی
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>


        {/* Courses Section */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="mb-10 flex flex-col gap-4">
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400"
              >
                دوره‌های آموزشی
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl text-right">
                برنامه‌های تحول
              </motion.h2>
              <motion.p variants={fadeUp} className="max-w-3xl text-base text-white/70 text-right">
                مجموعه دوره‌های عمیق و کاربردی ما که برای جهش شخصی و حرفه‌ای طراحی شده‌اند.
                هر دوره یک سفر کامل برای ساخت نسخه بهتر از خودت.
              </motion.p>
            </div>
            {courses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {courses.slice(0, 6).map((course, index) => {
                  const courseImage = course.thumbnail 
                    ? getImageUrlWithFallback(course.thumbnail, curatedAssets.gallery[index % curatedAssets.gallery.length])
                    : curatedAssets.gallery[index % curatedAssets.gallery.length];
                  
                  return (
                    <motion.div
                      key={course.id}
                      variants={fadeUp}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] cursor-pointer transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_25px_60px_-20px_rgba(139,92,246,0.3)]"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={courseImage}
                          alt={course.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1 bg-violet-400/20 backdrop-blur rounded-full text-xs font-semibold text-violet-400 uppercase tracking-wider">
                            دوره
                          </span>
                        </div>
                        {course.price > 0 && (
                          <div className="absolute bottom-4 left-4">
                            <span className="px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs font-semibold text-white">
                              {course.price.toLocaleString()} تومان
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-violet-400 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-white/70 mb-4 line-clamp-3 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex items-center gap-4 text-xs text-white/60">
                            {course.videos && course.videos.length > 0 && (
                              <span>{course.videos.length} ویدیو</span>
                            )}
                            {course.audios && course.audios.length > 0 && (
                              <span>{course.audios.length} فایل صوتی</span>
                            )}
                          </div>
                          <svg
                            className="w-5 h-5 text-violet-400 transform group-hover:translate-x-1 transition-transform"
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
              </div>
            ) : (
              <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
                <p className="text-white/60">دوره‌ای برای نمایش وجود ندارد</p>
                <button
                  onClick={() => navigate('/courses')}
                  className="mt-4 text-violet-400 hover:text-violet-500 text-sm uppercase tracking-wider"
                >
                  مشاهده همه دوره‌ها
                </button>
              </div>
            )}
            {courses.length > 6 && (
              <motion.div variants={fadeUp} className="mt-8 text-center">
                <button
                  onClick={() => navigate('/courses')}
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
                >
                  مشاهده همه دوره‌ها
                </button>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* Articles Section */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="mb-10 flex flex-col gap-4">
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400"
              >
                مقالات
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl text-right">
                مقالات برتر
              </motion.h2>
              <motion.p variants={fadeUp} className="max-w-3xl text-base text-white/70 text-right">
                مجموعه مقالات منتخب ما که برای تحول ذهنی و پیشرفت شخصی طراحی شده‌اند.
                هر مقاله یک راهنمای عملی برای ساخت زندگی بهتر.
              </motion.p>
            </div>
            {articlesLoading && articlesList.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-400 border-t-transparent" />
              </div>
            ) : articlesList.length > 0 ? (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {articlesList.map((article, index) => {
                    const fallbackImage = curatedAssets.gallery[index % curatedAssets.gallery.length];
                    const articleImage = getImageUrlWithFallback(article.featuredImage, fallbackImage);
                    return (
                      <motion.div
                        key={article.id}
                        variants={fadeUp}
                        whileHover={{ y: -8, scale: 1.02 }}
                        onClick={() => navigate(`/articles/${article.slug}`)}
                        className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] cursor-pointer transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_25px_60px_-20px_rgba(139,92,246,0.3)]"
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={articleImage}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              if (t.src !== fallbackImage) t.src = fallbackImage;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-0.5 bg-violet-400/20 backdrop-blur rounded-full text-xs font-semibold text-violet-400 uppercase tracking-wider">
                              مقاله
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-base font-bold mb-2 text-white group-hover:text-violet-400 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
                            <span className="text-xs uppercase tracking-[0.2em] text-violet-400">
                              بیشتر
                            </span>
                            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {/* Pagination */}
                {articlesTotalPages > 1 && (
                  <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setArticlesPage((p) => Math.max(1, p - 1))}
                      disabled={articlesPage <= 1 || articlesLoading}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-white/10 transition"
                    >
                      قبلی
                    </button>
                    <span className="px-4 py-2 text-sm text-white/80">
                      صفحه {articlesPage} از {articlesTotalPages} ({articlesTotal} مقاله)
                    </span>
                    <button
                      type="button"
                      onClick={() => setArticlesPage((p) => Math.min(articlesTotalPages, p + 1))}
                      disabled={articlesPage >= articlesTotalPages || articlesLoading}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-white/10 transition"
                    >
                      بعدی
                    </button>
                  </motion.div>
                )}
                <motion.div variants={fadeUp} className="mt-8 text-center">
                  <button
                    onClick={() => navigate('/articles')}
                    className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
                  >
                    مشاهده همه مقالات
                  </button>
                </motion.div>
              </>
            ) : (
              <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
                <p className="text-white/60">مقالاتی برای نمایش وجود ندارد</p>
                <button
                  onClick={() => navigate('/articles')}
                  className="mt-4 text-violet-400 hover:text-violet-500 text-sm uppercase tracking-wider"
                >
                  مشاهده همه مقالات
                </button>
              </div>
            )}
          </motion.div>
        </section>

        <section className="border-t border-white/10 py-12 sm:py-16">
          <div className="mb-10 flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400">
              نظرات
            </p>
            <h2 className="text-4xl font-bold sm:text-5xl text-right">صداهای تحول</h2>
            <p className="max-w-3xl text-base text-white/70 text-right">
              روایت‌هایی که نشان می‌دهد وقتی تصمیم می‌گیری پروژه زندگی‌ات را خودت هدایت کنی و قدرت را انتخاب کنی چه
              اتفاقی می‌افتد.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonialEntries.map((testimonial) => (
              <motion.div
                key={testimonial.quote}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="rounded-[32px] border border-white/10 bg-[#0a0a0a] p-8"
              >
                <p className="text-sm leading-relaxed text-white/80">"{testimonial.quote}"</p>
                <div className="mt-6 text-xs uppercase tracking-[0.5em] text-violet-400">
                  {testimonial.name}
                </div>
                <p className="mt-2 text-xs text-white/50">{testimonial.role}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 py-12 sm:py-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-r from-black via-[#0b0b0b] to-black p-10"
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-violet-500/20 to-transparent" />
            <div className="relative space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-violet-400">
                فراخوان نهایی · سفر تو از اینجا شروع می‌شود
              </p>
              <h2 className="text-4xl font-bold sm:text-5xl text-right">
                پتانسیل بی‌پایان خود را کشف کن · پروژه زندگی‌ات را خودت بساز
              </h2>
              <p className="max-w-3xl text-base text-white/70 text-right">
                این Engine برای ساختن آینده‌ای است که مدت‌ها منتظرش بودی. تصمیم بگیر، اقدام کن و اجازه بده نسخه V2
                زندگی‌ات روی صحنه طلایی بیاید.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handlePrimaryCta}
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-white/90"
                >
                  عضویت در من حقیقی
                </button>
                <button
                  onClick={() => navigate('/courses')}
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                >
                  کاوش برنامه‌ها
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Video Podcast Modal */}
      <VideoPodcastModal
        videoPodcast={selectedVideoPodcast}
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
      />
    </div>
  );
};

export default HomeV2;
