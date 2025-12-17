import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { podcastsService, API_ORIGIN } from '../services/api';
import { Podcast } from '../types';
import { CommentsSection } from '../components/comments/CommentsSection';

const PodcastDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const audioSrc = useMemo(() => {
    if (!podcast) return '';
    if (podcast.streamUrl) return podcast.streamUrl;
    if (podcast.audioFile) {
      // In some responses audioFile is a processed URL; otherwise we fall back to /uploads
      if (podcast.audioFile.startsWith('http://') || podcast.audioFile.startsWith('https://')) return podcast.audioFile;
      return `${API_ORIGIN}/uploads/${podcast.audioFile}`;
    }
    return '';
  }, [podcast]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError('');
        const data = await podcastsService.getById(id);
        if (mounted) setPodcast(data);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.message || 'خطا در دریافت پادکست');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400" />
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

  if (!podcast) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl" data-version2="true">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          {podcast.thumbnail ? (
            <div className="relative h-56 sm:h-72">
              <img src={podcast.thumbnail} alt={podcast.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
            </div>
          ) : null}

          <div className="p-7 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">پادکست</p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-right">{podcast.title}</h1>
            {podcast.description ? (
              <p className="mt-4 text-white/70 leading-relaxed text-right">{podcast.description}</p>
            ) : null}

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
              {audioSrc ? (
                <audio
                  controls
                  preload="metadata"
                  className="w-full [&::-webkit-media-controls-panel]:direction-rtl"
                  style={{ direction: 'rtl' }}
                  src={audioSrc}
                />
              ) : (
                <div className="text-sm text-white/60 text-right">فایل صوتی در دسترس نیست</div>
              )}
            </div>
          </div>
        </div>

        <CommentsSection
          targetType="PODCAST"
          targetId={podcast.id}
          allowComments={podcast.allowComments !== false}
          title="نظرات پادکست"
        />
      </div>
    </div>
  );
};

export default PodcastDetail;


