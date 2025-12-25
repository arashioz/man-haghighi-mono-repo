import React from 'react';
import { Audio } from '../types';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface AudioPlayButtonProps {
  audio: Audio;
}

const AudioPlayButton: React.FC<AudioPlayButtonProps> = ({ audio }) => {
  const { playPodcast, currentPodcast, isPlaying } = useAudioPlayer();

  // تبدیل اطلاعات Audio به Podcast برای سازگاری با AudioPlayerBar
  const podcastObj = {
    id: audio.id,
    title: audio.title,
    description: audio.description,
    audioFile: audio.audioFile,
    thumbnail: audio.thumbnail,
    duration: audio.duration,
    published: audio.published,
    createdAt: audio.createdAt,
    updatedAt: audio.updatedAt,
    streamUrl: undefined // اگر دارید اضافه کنید
  };

  const isCurrent = currentPodcast?.id === audio.id;

  const handleClick = () => {
    playPodcast(podcastObj as any); // هماهنگی تایپ Podcast/Audio
  };

  return (
    <button
      onClick={handleClick}
      className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors ${isCurrent && isPlaying ? 'ring-2 ring-purple-300' : ''}`}
    >
      {isCurrent && isPlaying ? 'در حال پخش' : 'پخش'}
    </button>
  );
};

export default AudioPlayButton;

