import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { articlesService } from '../services/api';
import { Article } from '../types';
import { getImageUrl, getImageUrlWithFallback } from '../utils/imageUtils';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const curatedAssets = {
  gallery: [
    '/assets/homeV2/Qodrat Namahdood5.jpg',
    '/assets/homeV2/Pedar Nakhodagah6.jpg',
    '/assets/homeV2/Cast box Cover6.jpg',
    '/assets/homeV2/Emotional Podcast2.jpg',
  ],
};

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError('');
        const response: any = await articlesService.getPublished();
        let articlesArray: Article[] = [];
        if (Array.isArray(response)) {
          articlesArray = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            articlesArray = response.data;
          } else if (response.data && Array.isArray(response.data.data)) {
            articlesArray = response.data.data;
          }
        }
        setArticles(Array.isArray(articlesArray) ? articlesArray : []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت مقالات');
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

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
              مقالات
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl mb-6"
            >
              مقالات برتر
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-3xl mx-auto text-lg text-white/70 sm:text-xl"
            >
              مجموعه مقالات منتخب ما که برای تحول ذهنی و پیشرفت شخصی طراحی شده‌اند.
              هر مقاله یک راهنمای عملی برای ساخت زندگی بهتر.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Articles Grid */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        <section className="border-t border-white/10 py-12 sm:py-16">
          {articles.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {articles.map((article, index) => {
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
            </motion.div>
          ) : (
            <div className="text-center py-16 border border-white/10 rounded-[32px] bg-[#0a0a0a]">
              <p className="text-white/60 mb-4">مقالاتی برای نمایش وجود ندارد</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Articles;
