import axios from 'axios';
import { AuthResponse, LoginCredentials, User, Slider, Article, Podcast, VideoPodcast, Course, Video, Audio, Workshop, WorkshopParticipant, Log, UploadedFileInfo } from '../types';

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

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect to login if we're not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

export const usersService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{ data: User[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: Partial<User>): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  blockUser: async (id: string): Promise<User> => {
    const response = await api.post(`/users/${id}/block`);
    return response.data;
  },

  unblockUser: async (id: string): Promise<User> => {
    const response = await api.post(`/users/${id}/unblock`);
    return response.data;
  },

  getUserCourses: async (id: string) => {
    const response = await api.get(`/users/${id}/courses`);
    return response.data;
  },

  getUserWithProducts: async (id: string) => {
    const response = await api.get(`/users/${id}/products`);
    return response.data;
  },

  assignCourses: async (userId: string, courseIds: string[]) => {
    const response = await api.post(`/users/${userId}/courses`, { courseIds });
    return response.data;
  },

  grantVideoAccess: async (userId: string, videoId: string) => {
    const response = await api.post(`/users/${userId}/video-access/${videoId}`);
    return response.data;
  },

  revokeVideoAccess: async (userId: string, videoId: string) => {
    await api.delete(`/users/${userId}/video-access/${videoId}`);
  },

  getSalesTeam: async (managerId: string): Promise<User[]> => {
    const response = await api.get(`/users/sales-team/${managerId}`);
    return response.data;
  },

  getSalesPersons: async (): Promise<User[]> => {
    const response = await api.get('/users/sales-persons');
    return response.data;
  },

  getSalesManagers: async (): Promise<User[]> => {
    const response = await api.get('/users/sales-managers');
    return response.data;
  },

  assignSalesPersonToManager: async (salesPersonId: string, salesManagerId: string) => {
    const response = await api.post('/users/assign-sales-person', {
      salesPersonId,
      salesManagerId,
    });
    return response.data;
  },

  unassignSalesPersonFromManager: async (salesPersonId: string) => {
    const response = await api.delete(`/users/unassign-sales-person/${salesPersonId}`);
    return response.data;
  },

  getChildren: async (userId: string): Promise<User[]> => {
    const response = await api.get(`/users/${userId}/children`);
    return response.data;
  },

  getParent: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}/parent`);
    return response.data;
  },

  getUserStats: async (userId: string) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  bulkUpdate: async (userIds: string[], data: Partial<User>) => {
    const response = await api.patch('/users/bulk', { userIds, data });
    return response.data;
  },

  bulkDelete: async (userIds: string[]) => {
    const response = await api.delete('/users/bulk', { data: { userIds } });
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/users/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  exportUsers: async (filters?: {
    userType?: 'all' | 'old' | 'new';
    startDate?: string;
    endDate?: string;
    role?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.userType && filters.userType !== 'all') {
      params.append('userType', filters.userType);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters?.role) {
      params.append('role', filters.role);
    }

    const response = await api.get(`/users/export/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },


};

export const slidersService = {
  getAll: async (): Promise<Slider[]> => {
    const response = await api.get('/sliders');
    return response.data;
  },

  getActive: async (): Promise<Slider[]> => {
    const response = await api.get('/sliders/active');
    return response.data;
  },

  getById: async (id: string): Promise<Slider> => {
    const response = await api.get(`/sliders/${id}`);
    return response.data;
  },

  create: async (data: Omit<Slider, 'id' | 'createdAt' | 'updatedAt'>): Promise<Slider> => {
    const response = await api.post('/sliders', data);
    return response.data;
  },

  createWithFiles: async (formData: FormData, onProgress?: (progressEvent: any) => void): Promise<Slider> => {
    const response = await api.post('/sliders', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  update: async (id: string, data: Partial<Slider>): Promise<Slider> => {
    const response = await api.patch(`/sliders/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sliders/${id}`);
  },

  bulkUpdate: async (sliderIds: string[], data: Partial<Slider>) => {
    const response = await api.patch('/sliders/bulk', { sliderIds, data });
    return response.data;
  },

  bulkDelete: async (sliderIds: string[]) => {
    const response = await api.delete('/sliders/bulk', { data: { sliderIds } });
    return response.data;
  },

  activate: async (id: string) => {
    const response = await api.patch(`/sliders/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: string) => {
    const response = await api.patch(`/sliders/${id}/deactivate`);
    return response.data;
  },

  reorder: async (sliderIds: string[]) => {
    const response = await api.patch('/sliders/reorder', { sliderIds });
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/sliders/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/sliders/stats');
    return response.data;
  },

  exportSliders: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/sliders/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const articlesService = {
  getAll: async (params?: any): Promise<any> => {
    const response = await api.get('/articles', { params });
    return response.data;
  },

  getPublished: async (params?: any): Promise<any> => {
    const response = await api.get('/articles/published', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Article> => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<Article> => {
    const response = await api.get(`/articles/slug/${slug}`);
    return response.data;
  },

  create: async (data: any): Promise<Article> => {
    const response = await api.post('/articles', data);
    return response.data;
  },

  update: async (id: string, data: any): Promise<Article> => {
    const response = await api.patch(`/articles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/articles/${id}`);
  },

  uploadFeaturedImage: async (id: string, file: File, onProgress?: (progressEvent: any) => void): Promise<Article> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.patch(`/articles/${id}/featured-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  analyzeSeo: async (id: string): Promise<any> => {
    const response = await api.get(`/articles/${id}/seo-analysis`);
    return response.data;
  },

  generateSchema: async (id: string): Promise<any> => {
    const response = await api.get(`/articles/${id}/schema`);
    return response.data;
  },

  getRelated: async (id: string, limit?: number): Promise<Article[]> => {
    const response = await api.get(`/articles/${id}/related`, { params: { limit } });
    return response.data;
  },

  // Categories
  getAllCategories: async (): Promise<any[]> => {
    const response = await api.get('/articles/categories/all');
    return response.data;
  },

  createCategory: async (data: any): Promise<any> => {
    const response = await api.post('/articles/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: any): Promise<any> => {
    const response = await api.patch(`/articles/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/articles/categories/${id}`);
  },

  bulkUpdate: async (articleIds: string[], data: Partial<Article>) => {
    const response = await api.patch('/articles/bulk', { articleIds, data });
    return response.data;
  },

  bulkDelete: async (articleIds: string[]) => {
    const response = await api.delete('/articles/bulk', { data: { articleIds } });
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.patch(`/articles/${id}/publish`);
    return response.data;
  },

  unpublish: async (id: string) => {
    const response = await api.patch(`/articles/${id}/unpublish`);
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/articles/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/articles/stats');
    return response.data;
  },

  exportArticles: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/articles/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const podcastsService = {
  getAll: async (): Promise<Podcast[]> => {
    const response = await api.get('/podcasts');
    return response.data;
  },

  getPublished: async (): Promise<Podcast[]> => {
    const response = await api.get('/podcasts/published');
    return response.data;
  },

  getById: async (id: string): Promise<Podcast> => {
    const response = await api.get(`/podcasts/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    audioLink?: string;
    duration?: number | string;
    published?: boolean;
    audioFile?: File;
  }): Promise<Podcast> => {
    const formData = new FormData();
    formData.append('title', data.title);

    if (typeof data.published !== 'undefined') {
      formData.append('published', String(data.published));
    }

    if (data.description) {
      formData.append('description', data.description);
    }

    if (typeof data.duration !== 'undefined' && data.duration !== null && data.duration !== '') {
      formData.append('duration', String(data.duration));
    }

    if (data.audioLink) {
      formData.append('audioFile', data.audioLink);
    }

    if (data.audioFile) {
      formData.append('audio', data.audioFile);
    }

    return podcastsService.createWithFile(formData);
  },

  createWithFile: async (formData: FormData, onProgress?: (progressEvent: any) => void): Promise<Podcast> => {
    const response = await api.post('/podcasts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  update: async (id: string, data: Partial<Podcast>): Promise<Podcast> => {
    const response = await api.patch(`/podcasts/${id}`, data);
    return response.data;
  },

  updateWithFile: async (id: string, formData: FormData, onProgress?: (progressEvent: any) => void): Promise<Podcast> => {
    const response = await api.patch(`/podcasts/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/podcasts/${id}`);
  },

  bulkUpdate: async (podcastIds: string[], data: Partial<Podcast>) => {
    const response = await api.patch('/podcasts/bulk', { podcastIds, data });
    return response.data;
  },

  bulkDelete: async (podcastIds: string[]) => {
    const response = await api.delete('/podcasts/bulk', { data: { podcastIds } });
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.patch(`/podcasts/${id}/publish`);
    return response.data;
  },

  unpublish: async (id: string) => {
    const response = await api.patch(`/podcasts/${id}/unpublish`);
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/podcasts/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/podcasts/stats');
    return response.data;
  },

  exportPodcasts: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/podcasts/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const videoPodcastsService = {
  getAll: async (): Promise<VideoPodcast[]> => {
    const response = await api.get('/video-podcasts');
    return response.data;
  },

  getPublished: async (): Promise<VideoPodcast[]> => {
    const response = await api.get('/video-podcasts/published');
    return response.data;
  },

  getById: async (id: string): Promise<VideoPodcast> => {
    const response = await api.get(`/video-podcasts/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    videoLink?: string;
    thumbnail?: string;
    duration?: number | string;
    published?: boolean;
    publishedAt?: string;
    videoFile?: File;
  }): Promise<VideoPodcast> => {
    const formData = new FormData();
    formData.append('title', data.title);

    if (typeof data.published !== 'undefined') {
      formData.append('published', String(data.published));
    }

    if (data.description) {
      formData.append('description', data.description);
    }

    if (data.thumbnail) {
      formData.append('thumbnail', data.thumbnail);
    }

    if (data.publishedAt) {
      formData.append('publishedAt', data.publishedAt);
    }

    if (typeof data.duration !== 'undefined' && data.duration !== null && data.duration !== '') {
      formData.append('duration', String(data.duration));
    }

    if (data.videoLink) {
      formData.append('videoFile', data.videoLink);
    }

    if (data.videoFile) {
      formData.append('video', data.videoFile);
    }

    return videoPodcastsService.createWithFile(formData);
  },

  createWithFile: async (formData: FormData, onProgress?: (progressEvent: any) => void): Promise<VideoPodcast> => {
    const response = await api.post('/video-podcasts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  update: async (id: string, data: {
    title?: string;
    description?: string;
    videoLink?: string;
    thumbnail?: string;
    duration?: number | string;
    published?: boolean;
    publishedAt?: string | null;
    videoFile?: File;
  }): Promise<VideoPodcast> => {
    const formData = new FormData();

    if (typeof data.title !== 'undefined') {
      formData.append('title', data.title);
    }

    if (typeof data.description !== 'undefined') {
      formData.append('description', data.description);
    }

    if (typeof data.thumbnail !== 'undefined') {
      formData.append('thumbnail', data.thumbnail);
    }

    if (typeof data.duration !== 'undefined' && data.duration !== null && data.duration !== '') {
      formData.append('duration', String(data.duration));
    }

    if (typeof data.published !== 'undefined') {
      formData.append('published', String(data.published));
    }

    if (typeof data.publishedAt !== 'undefined' && data.publishedAt !== null) {
      formData.append('publishedAt', data.publishedAt);
    }

    if (typeof data.videoLink !== 'undefined') {
      formData.append('videoFile', data.videoLink || '');
    }

    if (data.videoFile) {
      formData.append('video', data.videoFile);
    }

    return videoPodcastsService.updateWithFile(id, formData);
  },

  updateWithFile: async (id: string, formData: FormData, onProgress?: (progressEvent: any) => void): Promise<VideoPodcast> => {
    const response = await api.patch(`/video-podcasts/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/video-podcasts/${id}`);
  },
};

export const coursesService = {
  getAll: async (): Promise<Course[]> => {
    const response = await api.get('/courses');
    return response.data;
  },

  getPublished: async (): Promise<Course[]> => {
    const response = await api.get('/courses/published');
    return response.data;
  },

  getById: async (id: string): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  create: async (data: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'videos' | '_count'>): Promise<Course> => {
    const response = await api.post('/courses', data);
    return response.data;
  },

  createWithFiles: async (formData: FormData, onProgress?: (progressEvent: any) => void): Promise<Course> => {
    const response = await api.post('/courses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  update: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.patch(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },

  enrollUser: async (courseId: string, userId: string) => {
    const response = await api.post(`/courses/${courseId}/enroll`, { userId });
    return response.data;
  },

  unenrollUser: async (courseId: string, userId: string) => {
    await api.delete(`/courses/${courseId}/enroll/${userId}`);
  },

  getEnrollments: async (courseId: string) => {
    const response = await api.get(`/courses/${courseId}/enrollments`);
    return response.data;
  },

  transferEnrollments: async (courseId: string, targetCourseId: string) => {
    const response = await api.patch(`/courses/${courseId}/transfer-enrollments`, {
      targetCourseId,
    });
    return response.data;
  },

  getEnrolledUsers: async (courseId: string) => {
    const response = await api.get(`/courses/${courseId}/enrolled-users`);
    return response.data;
  },

  getCourseVideos: async (courseId: string) => {
    const response = await api.get(`/courses/${courseId}/videos`);
    return response.data;
  },

  addVideoToCourse: async (courseId: string, videoData: any) => {
    const response = await api.post(`/courses/${courseId}/videos`, videoData);
    return response.data;
  },

  bulkUpdate: async (courseIds: string[], data: Partial<Course>) => {
    const response = await api.patch('/courses/bulk', { courseIds, data });
    return response.data;
  },

  bulkDelete: async (courseIds: string[]) => {
    const response = await api.delete('/courses/bulk', { data: { courseIds } });
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.patch(`/courses/${id}/publish`);
    return response.data;
  },

  unpublish: async (id: string) => {
    const response = await api.patch(`/courses/${id}/unpublish`);
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/courses/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/courses/stats');
    return response.data;
  },

  exportCourses: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/courses/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const videosService = {
  getAll: async (courseId?: string): Promise<Video[]> => {
    const url = courseId ? `/videos?courseId=${courseId}` : '/videos';
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<Video> => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  create: async (data: Omit<Video, 'id' | 'createdAt' | 'updatedAt' | 'course'>): Promise<Video> => {
    const response = await api.post('/videos', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Video>): Promise<Video> => {
    const response = await api.patch(`/videos/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/videos/${id}`);
  },

  getStreamUrl: async (id: string) => {
    const response = await api.get(`/videos/${id}/stream-url`);
    return response.data;
  },

  grantAccess: async (videoId: string, userId: string) => {
    const response = await api.post(`/videos/${videoId}/access`, { userId });
    return response.data;
  },

  revokeAccess: async (videoId: string, userId: string) => {
    await api.delete(`/videos/${videoId}/access/${userId}`);
  },

  getAccessList: async (videoId: string) => {
    const response = await api.get(`/videos/${videoId}/access`);
    return response.data;
  },

  getUserAccessibleVideos: async () => {
    const response = await api.get('/videos/my-videos');
    return response.data;
  },

  bulkUpdate: async (videoIds: string[], data: Partial<Video>) => {
    const response = await api.patch('/videos/bulk', { videoIds, data });
    return response.data;
  },

  bulkDelete: async (videoIds: string[]) => {
    const response = await api.delete('/videos/bulk', { data: { videoIds } });
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.patch(`/videos/${id}/publish`);
    return response.data;
  },

  unpublish: async (id: string) => {
    const response = await api.patch(`/videos/${id}/unpublish`);
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/videos/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/videos/stats');
    return response.data;
  },

  exportVideos: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/videos/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const audiosService = {
  getAll: async (courseId?: string): Promise<Audio[]> => {
    const url = courseId ? `/audios?courseId=${courseId}` : '/audios';
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<Audio> => {
    const response = await api.get(`/audios/${id}`);
    return response.data;
  },

  create: async (data: Omit<Audio, 'id' | 'createdAt' | 'updatedAt' | 'course'>): Promise<Audio> => {
    const response = await api.post('/audios', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Audio>): Promise<Audio> => {
    const response = await api.patch(`/audios/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/audios/${id}`);
  },

  getStreamUrl: async (id: string) => {
    const response = await api.get(`/audios/${id}/stream-url`);
    return response.data;
  },

  grantAccess: async (audioId: string, userId: string) => {
    const response = await api.post(`/audios/${audioId}/access`, { userId });
    return response.data;
  },

  revokeAccess: async (audioId: string, userId: string) => {
    await api.delete(`/audios/${audioId}/access/${userId}`);
  },

  getAccessList: async (audioId: string) => {
    const response = await api.get(`/audios/${audioId}/access`);
    return response.data;
  },

  getUserAccessibleAudios: async () => {
    const response = await api.get('/audios/my-audios');
    return response.data;
  },

  bulkUpdate: async (audioIds: string[], data: Partial<Audio>) => {
    const response = await api.patch('/audios/bulk', { audioIds, data });
    return response.data;
  },

  bulkDelete: async (audioIds: string[]) => {
    const response = await api.delete('/audios/bulk', { data: { audioIds } });
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.patch(`/audios/${id}/publish`);
    return response.data;
  },

  unpublish: async (id: string) => {
    const response = await api.patch(`/audios/${id}/unpublish`);
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/audios/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/audios/stats');
    return response.data;
  },

  exportAudios: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/audios/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const workshopsService = {
  getAll: async (): Promise<Workshop[]> => {
    const response = await api.get('/workshops');
    return response.data;
  },

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

  getById: async (id: string): Promise<Workshop> => {
    const response = await api.get(`/workshops/${id}`);
    return response.data;
  },

  create: async (data: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt' | 'creator' | 'participants'>): Promise<Workshop> => {
    const response = await api.post('/workshops', data);
    return response.data;
  },

  createWithThumbnail: async (formData: FormData): Promise<Workshop> => {
    const response = await api.post('/workshops', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: string, data: Partial<Workshop>): Promise<Workshop> => {
    const response = await api.patch(`/workshops/${id}`, data);
    return response.data;
  },

  updateWithThumbnail: async (id: string, formData: FormData): Promise<Workshop> => {
    const response = await api.patch(`/workshops/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workshops/${id}`);
  },

  getParticipants: async (workshopId: string): Promise<WorkshopParticipant[]> => {
    const response = await api.get(`/workshops/${workshopId}/participants`);
    return response.data;
  },

  addParticipant: async (workshopId: string, data: Omit<WorkshopParticipant, 'id' | 'createdAt' | 'updatedAt' | 'workshop' | 'creator'>): Promise<WorkshopParticipant> => {
    const response = await api.post(`/workshops/${workshopId}/participants`, data);
    return response.data;
  },

  updateParticipant: async (workshopId: string, participantId: string, data: Partial<WorkshopParticipant>): Promise<WorkshopParticipant> => {
    const response = await api.patch(`/workshops/${workshopId}/participants/${participantId}`, data);
    return response.data;
  },

  deleteParticipant: async (workshopId: string, participantId: string): Promise<void> => {
    await api.delete(`/workshops/${workshopId}/participants/${participantId}`);
  },

  generatePaymentLink: async (workshopId: string, participantId: string): Promise<{ paymentLink: string }> => {
    const response = await api.post(`/workshops/${workshopId}/participants/${participantId}/payment-link`);
    return response.data;
  },

  generateInvitationCard: async (workshopId: string, participantId: string): Promise<{ invitationCard: string }> => {
    const response = await api.post(`/workshops/${workshopId}/participants/${participantId}/invitation-card`);
    return response.data;
  },

  getSalesPersonAccessible: async (): Promise<Workshop[]> => {
    const response = await api.get('/workshops/sales-person/accessible');
    return response.data;
  },

  getSalesManagerWorkshops: async (): Promise<Workshop[]> => {
    const response = await api.get('/workshops/sales-manager/my-workshops');
    return response.data;
  },

  getWorkshopSalesPersonAccess: async (workshopId: string): Promise<any[]> => {
    const response = await api.get(`/workshops/${workshopId}/sales-person-access`);
    return response.data;
  },

  grantSalesPersonAccess: async (workshopId: string, salesPersonId: string): Promise<any> => {
    const response = await api.post(`/workshops/${workshopId}/sales-person-access`, { salesPersonId });
    return response.data;
  },

  revokeSalesPersonAccess: async (workshopId: string, salesPersonId: string): Promise<void> => {
    await api.delete(`/workshops/${workshopId}/sales-person-access/${salesPersonId}`);
  },

  bulkUpdate: async (workshopIds: string[], data: Partial<Workshop>) => {
    const response = await api.patch('/workshops/bulk', { workshopIds, data });
    return response.data;
  },

  bulkDelete: async (workshopIds: string[]) => {
    const response = await api.delete('/workshops/bulk', { data: { workshopIds } });
    return response.data;
  },

  activate: async (id: string) => {
    const response = await api.patch(`/workshops/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: string) => {
    const response = await api.patch(`/workshops/${id}/deactivate`);
    return response.data;
  },

  search: async (query: string, filters?: any) => {
    const response = await api.get('/workshops/search', { 
      params: { q: query, ...filters } 
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/workshops/stats');
    return response.data;
  },

  exportWorkshops: async (format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/workshops/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getWorkshopAnalytics: async (workshopId: string) => {
    const response = await api.get(`/workshops/${workshopId}/analytics`);
    return response.data;
  },

  getParticipantAnalytics: async (workshopId: string) => {
    const response = await api.get(`/workshops/${workshopId}/participants/analytics`);
    return response.data;
  },

  getUserParticipatedWorkshops: async (): Promise<Workshop[]> => {
    const response = await api.get('/workshops/user/participated');
    return response.data;
  },

  uploadVideos: async (workshopId: string, files: File[], onProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('videos', file);
    });
    
    const response = await api.patch(`/workshops/${workshopId}/videos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  uploadAudios: async (workshopId: string, files: File[], onProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('audios', file);
    });
    
    const response = await api.patch(`/workshops/${workshopId}/audios`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },
};

export const salesService = {
  getSalesReport: async (period?: string) => {
    const url = period ? `/sales/report?period=${period}` : '/sales/report';
    const response = await api.get(url);
    return response.data;
  },

  getSalesTeam: async () => {
    const response = await api.get('/sales/team');
    return response.data;
  },

  getMySalesReport: async (period?: string) => {
    const url = period ? `/sales/my-report?period=${period}` : '/sales/my-report';
    const response = await api.get(url);
    return response.data;
  },

  getSalesAnalytics: async (filters?: any) => {
    const response = await api.get('/sales/analytics', { params: filters });
    return response.data;
  },

  getSalesTrends: async (period: string = 'monthly') => {
    const response = await api.get(`/sales/trends?period=${period}`);
    return response.data;
  },

  getTopPerformers: async (period?: string) => {
    const url = period ? `/sales/top-performers?period=${period}` : '/sales/top-performers';
    const response = await api.get(url);
    return response.data;
  },

  getSalesByRegion: async () => {
    const response = await api.get('/sales/by-region');
    return response.data;
  },

  getSalesByProduct: async () => {
    const response = await api.get('/sales/by-product');
    return response.data;
  },

  getCommissionReport: async (period?: string) => {
    const url = period ? `/sales/commission?period=${period}` : '/sales/commission';
    const response = await api.get(url);
    return response.data;
  },

  calculateCommission: async (salesPersonId: string, amount: number) => {
    const response = await api.post('/sales/calculate-commission', { salesPersonId, amount });
    return response.data;
  },

  getSalesTargets: async () => {
    const response = await api.get('/sales/targets');
    return response.data;
  },

  setSalesTarget: async (salesPersonId: string, target: number, period: string) => {
    const response = await api.post('/sales/targets', { salesPersonId, target, period });
    return response.data;
  },

  updateSalesTarget: async (targetId: string, target: number) => {
    const response = await api.patch(`/sales/targets/${targetId}`, { target });
    return response.data;
  },

  exportSalesReport: async (format: 'csv' | 'excel' = 'csv', filters?: any) => {
    const response = await api.get(`/sales/export?format=${format}`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  getSalesForecast: async (period: string = 'monthly') => {
    const response = await api.get(`/sales/forecast?period=${period}`);
    return response.data;
  },

  getCustomerAnalytics: async () => {
    const response = await api.get('/sales/customer-analytics');
    return response.data;
  },

  getCustomerLifetimeValue: async () => {
    const response = await api.get('/sales/customer-lifetime-value');
    return response.data;
  },
};

export const uploadsService = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadVideo: async (formData: FormData, onProgress?: (progressEvent: any) => void) => {
    const response = await api.post('/uploads/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  uploadAudio: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/uploads/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/uploads/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadMultiple: async (files: File[], type: 'image' | 'video' | 'audio' | 'document' = 'image') => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    const response = await api.post(`/uploads/multiple/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (fileId: string) => {
    await api.delete(`/uploads/${fileId}`);
  },

  getFileInfo: async (fileId: string) => {
    const response = await api.get(`/uploads/${fileId}`);
    return response.data;
  },

  validateFile: async (file: File, type: 'image' | 'video' | 'audio' | 'document') => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/uploads/validate/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUploadStats: async () => {
    const response = await api.get('/uploads/stats');
    return response.data;
  },

  cleanupUnusedFiles: async () => {
    const response = await api.post('/uploads/cleanup');
    return response.data;
  },
};

export const systemService = {
  getHealth: async () => {
    const response = await api.get('/system/health');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/system/stats');
    return response.data;
  },

  backupDatabase: async () => {
    const response = await api.post('/system/backup');
    return response.data;
  },

  restoreDatabase: async (backupFile: File) => {
    const formData = new FormData();
    formData.append('backup', backupFile);
    
    const response = await api.post('/system/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  clearCache: async () => {
    const response = await api.post('/system/clear-cache');
    return response.data;
  },

  getLogs: async (level?: string, limit?: number) => {
    const params: any = {};
    if (level) params.level = level;
    if (limit) params.limit = limit;
    
    const response = await api.get('/system/logs', { params });
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/system/settings');
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await api.patch('/system/settings', settings);
    return response.data;
  },

  enableMaintenanceMode: async () => {
    const response = await api.post('/system/maintenance/enable');
    return response.data;
  },

  disableMaintenanceMode: async () => {
    const response = await api.post('/system/maintenance/disable');
    return response.data;
  },

  checkUpdates: async () => {
    const response = await api.get('/system/updates/check');
    return response.data;
  },

  installUpdates: async () => {
    const response = await api.post('/system/updates/install');
    return response.data;
  },
};

export const salesTeamsService = {
  getAll: async () => {
    const response = await api.get('/sales-teams');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/sales-teams/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    managerId: string;
    description?: string;
    salesPersonIds?: string[];
  }) => {
    const response = await api.post('/sales-teams', data);
    return response.data;
  },

  update: async (id: string, data: {
    name?: string;
    managerId?: string;
    description?: string;
    isActive?: boolean;
  }) => {
    const response = await api.patch(`/sales-teams/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/sales-teams/${id}`);
    return response.data;
  },

  addMember: async (teamId: string, salesPersonId: string) => {
    const response = await api.post(`/sales-teams/${teamId}/members`, {
      salesPersonId,
    });
    return response.data;
  },

  removeMember: async (teamId: string, salesPersonId: string) => {
    const response = await api.delete(`/sales-teams/${teamId}/members`, {
      data: { salesPersonId },
    });
    return response.data;
  },

  getAvailableSalesPersons: async () => {
    const response = await api.get('/sales-teams/available-sales-persons');
    return response.data;
  },

  getSalesManagers: async () => {
    const response = await api.get('/sales-teams/sales-managers');
    return response.data;
  },
};

export const logsService = {
  getLogs: async (filters?: {
    level?: 'LOG' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE';
    context?: string;
    url?: string;
    statusCode?: number;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/logs', { params: filters });
    return response.data;
  },

  getLogStats: async () => {
    const response = await api.get('/logs/stats');
    return response.data;
  },

  deleteOldLogs: async (days: number) => {
    const response = await api.delete(`/logs/old/${days}`);
    return response.data;
  },

  deleteAllLogs: async () => {
    const response = await api.delete('/logs/all');
    return response.data;
  },
};

export const adminService = {
  createDatabaseBackup: async (): Promise<Blob> => {
    const response = await api.get('/admin/backup', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await api.patch('/settings', settings);
    return response.data;
  },
};

export const uploadCenterService = {
  getAllFiles: async () => {
    const response = await api.get('/upload-center');
    return response.data;
  },

  getVideos: async () => {
    const response = await api.get('/upload-center/videos');
    return response.data;
  },

  getAudios: async () => {
    const response = await api.get('/upload-center/audios');
    return response.data;
  },

  deleteFile: async (filename: string, force: boolean = false) => {
    const url = `/upload-center/${encodeURIComponent(filename)}${force ? '?force=true' : ''}`;
    await api.delete(url);
  },

  assignFileToCourse: async (filename: string, courseId: string, title?: string, description?: string, forceReassign: boolean = false) => {
    const url = `/upload-center/${encodeURIComponent(filename)}/assign${forceReassign ? '?forceReassign=true' : ''}`;
    const response = await api.post(url, {
      courseId,
      title,
      description,
    });
    return response.data;
  },
};

