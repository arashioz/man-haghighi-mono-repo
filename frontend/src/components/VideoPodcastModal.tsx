import React, { useEffect, useRef } from 'react';
import { VideoPodcast } from '../types';
import { API_ORIGIN } from '../services/api';
import { getImageUrl } from '../utils/imageUtils';

interface VideoPodcastModalProps {
  videoPodcast: VideoPodcast | null;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPodcastModal: React.FC<VideoPodcastModalProps> = ({
  videoPodcast,
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoPodcast && videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error('Error playing video:', err);
      });
    } else if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isOpen, videoPodcast]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !videoPodcast) return null;

  const videoUrl = videoPodcast.streamUrl || `${API_ORIGIN}/api/video-podcasts/${videoPodcast.id}/stream`;
  const thumbnailUrl = videoPodcast.thumbnail ? getImageUrl(videoPodcast.thumbnail) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl mx-4 bg-black rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          aria-label="بستن"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            controls
            controlsList="nodownload"
            className="w-full h-full"
            poster={thumbnailUrl || undefined}
            src={videoUrl}
            onError={(e) => {
              const videoElement = e.target as HTMLVideoElement;
              console.error('Video error:', videoElement.error);
            }}
          >
            مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
          </video>
        </div>

        {/* Video Info */}
        <div className="p-6 bg-black/80">
          <h2 className="text-2xl font-bold text-white mb-2">{videoPodcast.title}</h2>
          {videoPodcast.description && (
            <p className="text-white/70 mb-4">{videoPodcast.description}</p>
          )}
          {videoPodcast.duration && (
            <div className="flex items-center gap-4 text-sm text-white/60">
              <span>مدت زمان: {formatDuration(videoPodcast.duration)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default VideoPodcastModal;

