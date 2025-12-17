import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { VideoPodcast } from '../types';
import { getImageUrl } from '../utils/imageUtils';

interface VideoPodcastCardProps {
  video: VideoPodcast;
  curatedAssets: any;
  onClick: (video: VideoPodcast) => void;
  variants?: any;
}

const VideoPodcastCard: React.FC<VideoPodcastCardProps> = ({
  video,
  curatedAssets,
  onClick,
  variants,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const thumb = video.thumbnail ? getImageUrl(video.thumbnail) : null;
  const source = video.streamUrl || video.videoFile || '';

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    setIsHovered(true);
    if (videoRef.current && source) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Pause after 3 seconds
      timeoutRef.current = setTimeout(() => {
        if (videoRef.current && isHoveredRef.current) {
          videoRef.current.pause();
        }
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    setIsHovered(false);
    // Clear timeout if user moves away
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -4, scale: 1.01 }}
      className="snap-start w-[300px] sm:w-[320px] shrink-0 rounded-[32px] border border-white/10 bg-white/5 overflow-hidden shadow-lg cursor-pointer"
      onClick={() => onClick(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        {source && isHovered ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={source}
            playsInline
            muted
            preload="metadata"
          />
        ) : (
          <img
            src={thumb || curatedAssets.videoPoster}
            alt={video.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = curatedAssets.videoPoster;
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
            Video Podcast
          </span>
          <h3 className="text-lg font-bold text-white leading-snug line-clamp-2">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-xs text-white/75 line-clamp-2">
              {video.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPodcastCard;

