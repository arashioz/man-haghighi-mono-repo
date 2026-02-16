import { api } from './client';
import type { Course } from '../types';

export async function getMyCourses(): Promise<Course[]> {
  const { data } = await api.get<Course[]>('/courses/my-courses');
  return Array.isArray(data) ? data : [];
}

export async function getVideoStreamUrl(videoId: string): Promise<string> {
  const { data } = await api.get<{ streamUrl: string }>(`/videos/${videoId}/stream-url`);
  return data.streamUrl;
}

export async function getAudioStreamUrl(audioId: string): Promise<string> {
  const { data } = await api.get<{ streamUrl: string }>(`/audios/${audioId}/stream-url`);
  return data.streamUrl;
}
