import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterCredentials, UpdateProfilePayload, User, Slider, Article, Podcast, VideoPodcast, Course, Video, VideoStreamInfo, Audio, AudioStreamInfo, Workshop } from '../types';

const DEFAULT_LOCAL_API = 'http://localhost:3000/api';
const DEFAULT_SERVER_API = 'http://185.231.112.84:8080/api';

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const isLocalHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1';

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (isLocalHost(hostname)) {
      if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
        return normalizeUrl(envUrl);
      }
      return DEFAULT_LOCAL_API;
    }
  }

  if (envUrl) {
    return normalizeUrl(envUrl);
  }

  return DEFAULT_SERVER_API;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors and 304 status
api.interceptors.response.use(
  (response) => {
    // Handle 304 Not Modified - ensure response.data exists
    if (response.status === 304 && !response.data) {
      // For 304, we should use cached data if available, or return empty array/object
      // This depends on the endpoint, but we'll let the service handle it
      response.data = response.data || null;
    }
    return response;
  },
  (error) => {
    // Only redirect to login for 401 errors, not validation errors (400)
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use replace to avoid adding to history
      // Frontend nginx should handle all routes and serve index.html
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<AuthResponse> => {
    const response = await api.patch('/auth/profile', payload);
    return response.data;
  },
};

export const slidersService = {
  getActive: async (): Promise<Slider[]> => {
    const response = await api.get('/sliders/active');
    return response.data;
  },
};

export const articlesService = {
  getPublished: async (): Promise<Article[]> => {
    const response = await api.get('/articles/published');
    return response.data;
  },

  getBySlug: async (slug: string): Promise<Article> => {
    const response = await api.get(`/articles/slug/${slug}`);
    return response.data;
  },
};

export const podcastsService = {
  getPublished: async (): Promise<Podcast[]> => {
    const response = await api.get('/podcasts/published');
    return response.data;
  },
};

export const videoPodcastsService = {
  getPublished: async (): Promise<VideoPodcast[]> => {
    const response = await api.get('/video-podcasts/published');
    return response.data;
  },

  getById: async (id: string): Promise<VideoPodcast> => {
    const response = await api.get(`/video-podcasts/${id}`);
    return response.data;
  },
};

export const coursesService = {
  getPublished: async (): Promise<Course[]> => {
    const response = await api.get('/courses/published');
    return response.data;
  },

  getById: async (id: string): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  enroll: async (courseId: string): Promise<void> => {
    await api.post(`/courses/${courseId}/enroll`);
  },

  getMyCourses: async (): Promise<Course[]> => {
    const response = await api.get('/courses/my-courses');
    return response.data;
  },
};

export const videosService = {
  getMyVideos: async (): Promise<Video[]> => {
    const response = await api.get('/videos/my-videos');
    return response.data;
  },

  getStreamInfo: async (videoId: string) => {
    const response = await api.get(`/videos/${videoId}/stream`);
    return response.data;
  },

  getVideoStreamUrl: async (videoId: string): Promise<VideoStreamInfo> => {
    const response = await api.get(`/videos/${videoId}/stream-url`);
    return response.data;
  },
};

export const audiosService = {
  getMyAudios: async (): Promise<Audio[]> => {
    const response = await api.get('/audios/my-audios');
    return response.data;
  },

  getAudioStreamUrl: async (audioId: string): Promise<AudioStreamInfo> => {
    const response = await api.get(`/audios/${audioId}/stream-url`);
    return response.data;
  },
};

export const workshopsService = {
  getActive: async (): Promise<Workshop[]> => {
    try {
      const response = await api.get('/workshops/active');
      // Handle 304 Not Modified and ensure we return an array
      if (response.status === 304 && !response.data) {
        return [];
      }
      // Ensure response.data is an array
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (error: any) {
      // If it's a 304 error, return empty array instead of throwing
      if (error.response?.status === 304) {
        return [];
      }
      throw error;
    }
  },

  getMyWorkshops: async (): Promise<Workshop[]> => {
    const response = await api.get('/workshops/my-workshops');
    return response.data;
  },

  getById: async (id: string): Promise<Workshop> => {
    const response = await api.get(`/workshops/${id}`);
    return response.data;
  },

  preRegister: async (workshopId: string, participantData: {
    customerPhone: string;
    customerName: string;
  }): Promise<void> => {
    await api.post(`/workshops/${workshopId}/participants`, participantData);
  },
};
