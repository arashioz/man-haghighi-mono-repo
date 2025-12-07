import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { podcastsService } from '../services/api';
import { Podcast } from '../types';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

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

const Podcasts: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentPodcast, isPlaying, playPodcast } = useAudioPlayer();

  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const data = await podcastsService.getPublished();
        setPodcasts(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت پادکست‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchPodcasts();
  }, []);

  const handlePlayPause = (podcast: Podcast) => {
    playPodcast(podcast);
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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded max-w-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#0a0a0a]" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-8 sm:py-32">
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
              پادکست‌ها
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl mb-6"
            >
              پادکست‌های پرانرژی
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-3xl mx-auto text-lg text-white/70 sm:text-xl"
            >
              گوش دهید به آخرین قسمت‌های پادکست ما و دانش خود را گسترش دهید.
              هر اپیزود یک سفر صوتی برای تحول و رشد.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Podcasts Grid */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        <section className="border-t border-white/10 py-12 sm:py-16">
          {podcasts.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {podcasts.map((podcast) => (
                <motion.div
                  key={podcast.id}
                  variants={fadeUp}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_25px_60px_-20px_rgba(250,204,21,0.3)]"
                >
                  {podcast.thumbnail && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={podcast.thumbnail}
                        alt={podcast.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                      {podcast.title}
                    </h3>
                    {podcast.description && (
                      <p className="text-sm text-white/70 mb-4 line-clamp-3 leading-relaxed">
                        {podcast.description}
                      </p>
                    )}
                    <button
                      onClick={() => handlePlayPause(podcast)}
                      className="w-full mt-4 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.8)] transition hover:scale-105"
                    >
                      {currentPodcast?.id === podcast.id && isPlaying ? '⏸ توقف' : '▶ پخش'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
              <p className="text-white/60 mb-4">پادکستی برای نمایش وجود ندارد</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Podcasts;
