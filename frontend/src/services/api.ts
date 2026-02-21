import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterCredentials, UpdateProfilePayload, User, Slider, Article, Podcast, VideoPodcast, Course, Video, VideoStreamInfo, Audio, AudioStreamInfo, Workshop, Comment, UserMessage } from '../types';
import { ApiError } from '../contexts/ErrorContext';

const DEFAULT_LOCAL_API = 'http://localhost:3000/api';
const DEFAULT_SERVER_API = 'https://api.manehaghighi.com/api';

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const isLocalHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1';

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isHttps = window.location.protocol === 'https:';

    // If on localhost, use local API
    if (isLocalHost(hostname)) {
      if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
        return normalizeUrl(envUrl);
      }
      return DEFAULT_LOCAL_API;
    }

    // Production: ترجیحاً همان دامنه (/api) تا nginx همان سایت پراکسی کند و ERR_FAILED ندهد
    if (envUrl) {
      const url = normalizeUrl(envUrl);
      return url.replace(/^http:\/\//, 'https://');
    }
    return '/api';
  }

  if (envUrl) {
    return normalizeUrl(envUrl);
  }

  return DEFAULT_SERVER_API;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN =
  API_BASE_URL === '/api' || API_BASE_URL.startsWith('/')
    ? (typeof window !== 'undefined' ? window.location.origin : '')
    : API_BASE_URL.endsWith('/api')
      ? API_BASE_URL.slice(0, -4)
      : API_BASE_URL;

// Global error handler that can be set by React components
let globalErrorHandler: ((error: ApiError) => void) | null = null;

export const setGlobalErrorHandler = (handler: (error: ApiError) => void) => {
  globalErrorHandler = handler;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  // List of public endpoints that don't require authentication
  const publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/send-otp',
    '/auth/verify-otp',
  ];
  
  // Check if the current request is to a public endpoint
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    config.url?.includes(endpoint)
  );
  
  // Only add token if it's not a public endpoint
  if (!isPublicEndpoint) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    // Handle API errors globally
    if (error.response?.data) {
      const apiError: ApiError = {
        message: error.response.data.message || 'خطای نامشخص سرور',
        statusCode: error.response.data.statusCode,
        path: error.response.data.path,
        method: error.response.data.method,
        timestamp: error.response.data.timestamp,
        error: error.response.data.error,
        stack: error.response.data.stack,
      };

      // Call global error handler if set
      if (globalErrorHandler) {
        globalErrorHandler(apiError);
      }
    }

    // Only redirect to login for 401 errors, not validation errors (400)
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      const message = error.response?.data?.message;
      if (typeof message === 'string' && message.trim()) {
        try {
          sessionStorage.setItem('login_401_message', message.trim());
        } catch (_) {}
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials & { deviceType?: string }): Promise<AuthResponse> => {
    const payload = { ...credentials, deviceType: credentials.deviceType ?? 'DESKTOP' };
    const response = await api.post('/auth/login', payload);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  sendOtp: async (phone: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
  },

  verifyOtp: async (phone: string, otp: string, deviceType: string = 'DESKTOP'): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-otp', { phone, otp, deviceType });
    return response.data;
  },

  forceLogoutAll: async (payload: { forceLogoutToken?: string; login?: string; password?: string; phone?: string; otp?: string }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/force-logout-all', payload);
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

  changePassword: async (data: { currentPassword?: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.patch('/auth/password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
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
  getPublished: async (params?: { limit?: number; page?: number }): Promise<{ data: Article[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const response = await api.get('/articles/published', { params });
    const body = response.data || {};
    return {
      data: Array.isArray(body.data) ? body.data : [],
      meta: body.meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
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

  getById: async (id: string): Promise<Podcast> => {
    const response = await api.get(`/podcasts/${id}`);
    return response.data;
  },
};

export const commentsService = {
  getArticleComments: async (articleId: string): Promise<Comment[]> => {
    const response = await api.get(`/comments/articles/${articleId}`);
    return response.data;
  },
  createArticleComment: async (articleId: string, data: { authorName: string; authorPhone?: string; content: string; parentId?: string }): Promise<Comment> => {
    const response = await api.post(`/comments/articles/${articleId}`, data);
    return response.data;
  },

  getPodcastComments: async (podcastId: string): Promise<Comment[]> => {
    const response = await api.get(`/comments/podcasts/${podcastId}`);
    return response.data;
  },
  createPodcastComment: async (podcastId: string, data: { authorName: string; authorPhone?: string; content: string; parentId?: string }): Promise<Comment> => {
    const response = await api.post(`/comments/podcasts/${podcastId}`, data);
    return response.data;
  },

  getCourseComments: async (courseId: string): Promise<Comment[]> => {
    const response = await api.get(`/comments/courses/${courseId}`);
    return response.data;
  },
  createCourseComment: async (courseId: string, data: { authorName: string; authorPhone?: string; content: string; parentId?: string }): Promise<Comment> => {
    const response = await api.post(`/comments/courses/${courseId}`, data);
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

  getForHomepage: async (): Promise<Course[]> => {
    const response = await api.get('/courses/homepage');
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

export const paymentsService = {
  initiateCoursePayment: async (courseId: string) => {
    const response = await api.post(`/payments/course/${courseId}`);
    return response.data;
  },

  getTransactionById: async (transactionId: string) => {
    const response = await api.get(`/payments/transactions/${transactionId}`);
    return response.data;
  },

  getMyInvoices: async (limit = 50) => {
    const response = await api.get(`/payments/invoices?limit=${limit}`);
    return response.data;
  },

  getInvoiceById: async (invoiceId: string) => {
    const response = await api.get(`/payments/invoices/${invoiceId}`);
    return response.data;
  },

  getPaymentLinkByCode: async (linkCode: string) => {
    const response = await api.get(`/api/payments/pay/${linkCode}`);
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

  getMyWorkshopParticipants: async (): Promise<any[]> => {
    const response = await api.get('/workshops/my-workshops');
    return response.data;
  },

  getParticipantPayments: async (participantId: string): Promise<any> => {
    const response = await api.get(`/workshops/participants/${participantId}/payments`);
    return response.data;
  },

  completeWorkshopPayment: async (participantId: string, paymentData: {
    amount: number;
    paymentMethod?: string;
  }): Promise<any> => {
    const response = await api.post(`/workshops/participants/${participantId}/complete-payment`, paymentData);
    return response.data;
  },
};

export const messagesService = {
  getMyMessages: async (): Promise<UserMessage[]> => {
    const response = await api.get('/messages/my');
    return response.data;
  },
  markAsRead: async (userMessageId: string): Promise<UserMessage> => {
    const response = await api.patch(`/messages/my/${userMessageId}/read`);
    return response.data;
  },
};
