import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants, useScroll, useTransform } from 'framer-motion';
import {
  Slider,
  Course,
  Article,
  Podcast,
  VideoPodcast,
  Workshop,
} from '../../types';
import { getImageUrl, getImageUrlWithFallback } from '../../utils/imageUtils';

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
    transition: { duration: 0.8, ease: 'easeOut' },
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
    { label: 'برنامه فعال', value: `${Math.max(courses.length, 3)}+` },
    { label: 'پادکست پرانرژی', value: `${Math.max(podcasts.length, 12)}+` },
    { label: 'ویدیو پادکست', value: `${Math.max(videoPodcasts.length, 6)}+` },
    { label: 'کارگاه آماده', value: `${Math.max(workshops.length, 1)}` },
  ];

  const transformationLines = [
    'Engine Transformation نسخه دوم یک انقلاب شخصی است؛ برای جهش ساخته شده.',
    'برای پیشرفت طراحی شده و مثل نور، سریع و دقیق عمل می‌کند.',
    'جهان تازه، دیوانه‌وار در حال تکامل است؛ سرعت، انتخاب توست.',
    'حقیقت بنیادین: تنها کسانی رشد می‌کنند که رشد را انتخاب و مهندسی می‌کنند.',
    'این Engine مخصوص توست؛ برای تجربه یک برتری واقعی و ساخت نسخه بهتر از خودت.',
    'ایجاد تغییر، ایجاد تحول؛ برای شروعی دوباره و ساخت آینده‌ای که منتظرش بودی.',
    'Discover your unstoppable potential.',
    'Be your own project · بگذار زندگی‌ات نسخه V2 شود.',
  ];

  const pillars = [
    {
      label: 'Growth',
      title: 'Growth Mastery',
      description:
        'ترکیبی از تمرین ذهنی، راهبردهای تجاری و نظم شخصی که سرعت رشد تو را تثبیت می‌کند و استاندارد تازه‌ای می‌سازد.',
    },
    {
      label: 'Transformation',
      title: 'Transformation Engine',
      description:
        'باورهای قدیمی دوباره نوشته می‌شوند؛ هویت تازه خلق می‌شود و مسیر با وضوح طلایی هدایت خواهد شد.',
    },
    {
      label: 'Power',
      title: 'Relentless Power',
      description:
        'قدرت نامحدود یعنی انرژی × احساس × اقدام. این ستون برای تثبیت قدرت شخصی و جمعی طراحی شده است.',
    },
  ];

  const missionHighlights = [
    { value: `${Math.max(workshops.length, 3)}+`, label: 'رویدادهای فعال' },
    { value: `${Math.max(courses.length, 6)}+`, label: 'برنامه‌های عمیق' },
    {
      value: `${Math.max(podcasts.length + videoPodcasts.length, 12)}+`,
      label: 'اپیزود الهام‌بخش',
    },
  ];

  const galleryImages = useMemo(() => {
    const sources = sliders
      .map((slide) => getImageUrl(slide.image))
      .filter((image): image is string => Boolean(image));

    return Array.from(new Set([...sources, ...curatedAssets.gallery])).slice(0, 4);
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

  const highlightedVideo = videoPodcasts[0] ?? null;
  const videoPoster = highlightedVideo?.thumbnail 
    ? getImageUrl(highlightedVideo.thumbnail) ?? curatedAssets.videoPoster
    : curatedAssets.videoPoster;
  const primaryWorkshop = workshops[0] ?? null;

  const featuredArticles = useMemo(() => {
    return articles.slice(0, 3);
  }, [articles]);

  const featuredPodcasts = useMemo(() => {
    return podcasts.slice(0, 6);
  }, [podcasts]);

  // Parallax refs for mentor section
  const mentorSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mentorSectionRef,
    offset: ['start end', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  const handlePrimaryCta = () => {
    if (primaryWorkshop) {
      onOpenPreRegister(primaryWorkshop);
      return;
    }
    navigate('/workshops');
  };

  const handleVideoCta = () => {
    if (highlightedVideo) {
      navigate(`/video-podcasts/${highlightedVideo.id}`);
      return;
    }
    navigate('/video-podcasts');
  };

  return (
    <div className="min-h-screen bg-[#040404] text-white">
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          {heroMedia.type === 'video' && (
            <video
              className="h-full w-full object-cover"
              src={heroMedia.source}
              poster={heroMedia.poster}
              autoPlay
              playsInline
              muted
              loop
            />
          )}
          {heroMedia.type === 'image' && (
            <img
              src={heroMedia.source}
              alt="Hero background"
              className="h-full w-full object-cover"
            />
          )}
          {heroMedia.type === 'gradient' && (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(120,120,120,0.4),_transparent_70%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-[#040404]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-start gap-12 px-4 pb-24 pt-20 sm:px-8 sm:pt-24">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.span
              className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.6em] text-yellow-400"
              variants={fadeUp}
            >
              <span>Version 2</span>
              <span className="h-1 w-1 rounded-full bg-yellow-400" />
              <span>Engine Transformation</span>
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl"
            >
              Engine Transformation 2.0
              <br />
              <span className="text-white/70">برای جهش سینمایی و برتری طلایی طراحی شده است</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-3xl text-lg text-white/70 sm:text-xl"
            >
              ما در جهانی تازه متولدشده زندگی می‌کنیم؛ جهانی که با سرعت نور در حال تکامل است. حقیقت غیرقابل‌انکار:
              تنها کسانی رشد می‌کنند که رشد کردن را انتخاب می‌کنند. این Engine مخصوص توست برای تجربه یک برتری واقعی،
              برای ساختن نسخه بهتر از خودت، ایجاد تغییر، ایجاد تحول و ساخت آینده‌ای که مدت‌ها منتظرش بودی.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap gap-4" variants={fadeUp}>
              <button
                onClick={handlePrimaryCta}
                className="rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.8)] transition hover:scale-105"
              >
                Start The Engine
              </button>
              <button
                onClick={() => navigate('/about')}
                className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
              >
                Meet The Mentor
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
                <p className="text-3xl font-black text-yellow-400">{stat.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/60">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-8">
        <section className="border-t border-white/10 py-16 sm:py-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="space-y-6"
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
            >
              Power Statement
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl">
              Manifesto of Engine Transformation V2
            </motion.h2>
            <motion.p variants={fadeUp} className="max-w-4xl text-lg text-white/70">
              Engine Transformation برای تجربه یک برتری واقعی خلق شده است؛ تغییری که همزمان سینمایی، عمیق و عملی باشد.
              این Manifesto از انرژی رویدادهای Tony Robbins الهام گرفته تا ذهن، احساس و اقدام را هم‌راستا کند.
            </motion.p>
          </motion.div>
          <motion.div
            className="mt-10 grid gap-4 md:grid-cols-2"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {transformationLines.map((line) => (
              <motion.div
                key={line}
                variants={fadeUp}
                className="rounded-3xl border border-white/5 bg-gradient-to-r from-white/5 via-transparent to-transparent p-6 text-base leading-relaxed text-white/80"
              >
                {line}
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <div className="mb-12 flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">
              3 Transformation Pillars
            </p>
            <h2 className="text-4xl font-bold sm:text-5xl">Growth · Transformation · Power</h2>
            <p className="max-w-3xl text-lg text-white/70">
              سه ستون اصلی برنامه ما برای مهندسی یک زندگی قدرتمند: رشد هدفمند، تحول درونی و قدرت بی‌امان.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <motion.div
                key={pillar.title}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="rounded-[32px] border border-white/10 bg-gradient-to-b from-[#111] via-[#0b0b0b] to-black p-8"
              >
                <p className="text-xs uppercase tracking-[0.6em] text-yellow-500">{pillar.label}</p>
                <h3 className="mt-4 text-2xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-6"
            >
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
              >
                About · Mission
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl">
                Engine Transformation برای ساختن آینده‌ای است که منتظرش بودی
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base leading-relaxed text-white/70">
                ما تغییر را جرقه می‌زنیم و تحول را تثبیت می‌کنیم. هر برنامه با کوچینگ عمیق، داده‌محوری و تجربه‌ای
                سینمایی طراحی شده تا تو را به نسخه دوم زندگی‌ات پرتاب کند و وضوح تازه‌ای بسازد.
              </motion.p>
              <motion.div
                variants={stagger}
                className="grid gap-6 sm:grid-cols-2"
              >
                {missionHighlights.map((item) => (
                  <motion.div
                    key={item.label}
                    variants={fadeUp}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center"
                  >
                    <p className="text-3xl font-black text-yellow-400">{item.value}</p>
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
              {missionImage ? (
                <img
                  src={missionImage}
                  alt="Mission placeholder"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = curatedAssets.missionImage;
                  }}
                />
              ) : (
                <div className="h-[420px] w-full bg-gradient-to-br from-[#1a1a1a] to-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
              <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/20 bg-black/30 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.5em] text-white/60">Placeholder imagery</p>
                <p className="mt-3 text-lg text-white/80">
                  فضای تصویری سینمایی برای پرتره‌ها یا ویدیوهای رویداد؛ جایی که انرژی مربی، نور طلایی و احساس جمعیت
                  ثبت می‌شود.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-5"
            >
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
              >
                Video / Image Block
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl">
                Feel the Crowd · Hear the Roar · Decide Again
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base leading-relaxed text-white/70">
                این بلوک برای ویدیو یا تصویر سینمایی طراحی شده است تا مخاطب انرژی سالن، نورهای طلایی و لحظه تصمیم
                دوباره را حس کند؛ همان لحظه‌ای که نسخه دوم زندگی‌اش را می‌بیند.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <button
                  onClick={handleVideoCta}
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-white/90"
                >
                  Play The Film
                </button>
                <button
                  onClick={() => navigate('/video-podcasts')}
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
                >
                  Library
                </button>
              </motion.div>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0a0a0a]"
            >
              {videoPoster ? (
                <img
                  src={videoPoster}
                  alt={highlightedVideo?.title ?? 'Video placeholder'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = curatedAssets.videoPoster;
                  }}
                />
              ) : (
                <div className="h-[360px] w-full bg-[radial-gradient(circle,_rgba(250,204,21,0.2),_transparent_70%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                <span className="text-xs uppercase tracking-[0.6em] text-white/70">
                  Placeholder for cinematic video
                </span>
                <button
                  onClick={handleVideoCta}
                  className="rounded-full bg-white/15 px-6 py-2 text-sm font-semibold uppercase tracking-widest text-white backdrop-blur hover:bg-white/25"
                >
                  Watch Preview
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <div className="mb-10 flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">
              Gallery
            </p>
            <h2 className="text-4xl font-bold sm:text-5xl">Immersion Gallery</h2>
            <p className="max-w-3xl text-base text-white/70">
              تصاویری با کنتراست بالا، نور دراماتیک و انرژی انسانی از آرشیو Engine Transformation؛ به‌سادگی با گالری
              اختصاصی شما جایگزین می‌شود.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {galleryImages.map((image, index) => (
              <motion.div
                key={`${image}-${index}`}
                variants={fadeUp}
                whileHover={{ y: -4, scale: 1.05 }}
                className="group relative h-64 overflow-hidden rounded-[30px] border border-white/10 cursor-pointer"
              >
                <img 
                  src={image} 
                  alt={`gallery-${index}`} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = curatedAssets.gallery[index % curatedAssets.gallery.length] || curatedAssets.gallery[0];
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-0 transition group-hover:opacity-100" />
                <div className="absolute bottom-4 left-4 text-xs uppercase tracking-[0.4em] text-white/70 opacity-0 group-hover:opacity-100 transition">
                  Gallery {index + 1}
                </div>
              </motion.div>
            ))}
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
            style={{ y: y1, opacity }}
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
                  className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
                >
                  Meet The Mentor
                </motion.p>
                <motion.h2 
                  variants={fadeUp} 
                  className="text-4xl font-bold sm:text-5xl lg:text-6xl"
                >
                  فراز قورچیان
                  <br />
                  <span className="text-yellow-400">مربی تحول و رشد شخصی</span>
                </motion.h2>
                <motion.p 
                  variants={fadeUp} 
                  className="text-lg leading-relaxed text-white/80"
                >
                  با بیش از یک دهه تجربه در زمینه کوچینگ، روانشناسی تحول و مهندسی رشد شخصی، 
                  فراز قورچیان خالق Engine Transformation است. رویکرد او ترکیبی از علم، 
                  تجربه و انرژی است که به هزاران نفر کمک کرده تا نسخه بهتری از خودشان بسازند.
                </motion.p>
                <motion.p 
                  variants={fadeUp} 
                  className="text-base leading-relaxed text-white/70"
                >
                  هر برنامه، هر کارگاه و هر لحظه از این سفر با دقت طراحی شده تا تو را 
                  به سمت تحولی واقعی و پایدار هدایت کند. این فقط یک برنامه نیست؛ 
                  این یک انقلاب شخصی است.
                </motion.p>
                <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={() => navigate('/about')}
                    className="rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.8)] transition hover:scale-105"
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
                style={{ y: y2 }}
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
                          <p className="text-xs uppercase tracking-[0.5em] text-yellow-400 mb-2">
                            Vision & Mission
                          </p>
                          <p className="text-white/90 text-sm font-medium">
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

        {/* Podcasts Section */}
        <section className="border-t border-white/10 py-16 sm:py-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="mb-10 flex flex-col gap-4">
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
              >
                Podcasts
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl">
                پادکست‌های پرانرژی
              </motion.h2>
              <motion.p variants={fadeUp} className="max-w-3xl text-base text-white/70">
                مجموعه پادکست‌های الهام‌بخش برای تحول ذهنی، رشد شخصی و ساخت زندگی قدرتمند.
                هر اپیزود یک قدم به سمت نسخه بهتر از خودت.
              </motion.p>
            </div>
            
            {featuredPodcasts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredPodcasts.map((podcast, index) => {
                  const coverImage = curatedAssets.podcastCovers[index % curatedAssets.podcastCovers.length];
                  return (
                    <motion.div
                      key={podcast.id}
                      variants={fadeUp}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => navigate(`/podcasts/${podcast.id}`)}
                      className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] cursor-pointer transition-all duration-300 hover:border-yellow-500/30"
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={coverImage}
                          alt={podcast.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="rounded-full bg-white/20 backdrop-blur p-4">
                            <svg
                              className="w-12 h-12 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                        {podcast.duration && (
                          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur rounded-full">
                            <span className="text-xs text-white">
                              {Math.floor(podcast.duration / 60)}:{(podcast.duration % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                          {podcast.title}
                        </h3>
                        {podcast.description && (
                          <p className="text-sm text-white/70 mb-4 line-clamp-2 leading-relaxed">
                            {podcast.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-[0.3em] text-yellow-400">
                            گوش دادن
                          </span>
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
              </div>
            ) : (
              <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
                <p className="text-white/60">پادکستی برای نمایش وجود ندارد</p>
                <button
                  onClick={() => navigate('/podcasts')}
                  className="mt-4 text-yellow-400 hover:text-yellow-500 text-sm uppercase tracking-wider"
                >
                  مشاهده همه پادکست‌ها
                </button>
              </div>
            )}
          </motion.div>
        </section>

        {/* Articles Section */}
        <section className="border-t border-white/10 py-16 sm:py-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="mb-10 flex flex-col gap-4">
              <motion.p
                variants={fadeUp}
                className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
              >
                Articles
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold sm:text-5xl">
                مقالات برتر
              </motion.h2>
              <motion.p variants={fadeUp} className="max-w-3xl text-base text-white/70">
                مجموعه مقالات منتخب ما که برای تحول ذهنی و پیشرفت شخصی طراحی شده‌اند.
                هر مقاله یک راهنمای عملی برای ساخت زندگی بهتر.
              </motion.p>
            </div>
            {featuredArticles.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {featuredArticles.map((article, index) => {
                  const articleImage = article.featuredImage 
                    ? getImageUrlWithFallback(article.featuredImage, curatedAssets.gallery[index % curatedAssets.gallery.length])
                    : curatedAssets.gallery[index % curatedAssets.gallery.length];
                  
                  return (
                    <motion.div
                      key={article.id}
                      variants={fadeUp}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => navigate(`/articles/${article.slug}`)}
                      className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] cursor-pointer transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_25px_60px_-20px_rgba(250,204,21,0.3)]"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={articleImage}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1 bg-yellow-400/20 backdrop-blur rounded-full text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                            مقاله
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-sm text-white/70 mb-4 line-clamp-3 leading-relaxed">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <span className="text-xs uppercase tracking-[0.3em] text-yellow-400">
                            مطالعه بیشتر
                          </span>
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
              </div>
            ) : (
              <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
                <p className="text-white/60">مقالاتی برای نمایش وجود ندارد</p>
                <button
                  onClick={() => navigate('/articles')}
                  className="mt-4 text-yellow-400 hover:text-yellow-500 text-sm uppercase tracking-wider"
                >
                  مشاهده همه مقالات
                </button>
              </div>
            )}
          </motion.div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <div className="mb-10 flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">
              Testimonials
            </p>
            <h2 className="text-4xl font-bold sm:text-5xl">Voices of Transformation</h2>
            <p className="max-w-3xl text-base text-white/70">
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
                <div className="mt-6 text-xs uppercase tracking-[0.5em] text-yellow-400">
                  {testimonial.name}
                </div>
                <p className="mt-2 text-xs text-white/50">{testimonial.role}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-r from-black via-[#0b0b0b] to-black p-10"
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-yellow-500/20 to-transparent" />
            <div className="relative space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">
                Final CTA · Your Journey Starts Here
              </p>
              <h2 className="text-4xl font-bold sm:text-5xl">
                Discover your unstoppable potential · Be your own project
              </h2>
              <p className="max-w-3xl text-base text-white/70">
                این Engine برای ساختن آینده‌ای است که مدت‌ها منتظرش بودی. تصمیم بگیر، اقدام کن و اجازه بده نسخه V2
                زندگی‌ات روی صحنه طلایی بیاید.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handlePrimaryCta}
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-white/90"
                >
                  Start The Engine
                </button>
                <button
                  onClick={() => navigate('/courses')}
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                >
                  Explore Programs
                </button>
                <button
                  onClick={onBackToClassic}
                  className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white/70 transition hover:border-white/60 hover:text-white"
                >
                  بازگشت به نسخه کلاسیک
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default HomeV2;
