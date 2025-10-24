export interface User {
  id: string;
  phone: string;
  email?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Slider {
  id: string;
  title: string;
  description?: string;
  image: string;
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Podcast {
  id: string;
  title: string;
  description?: string;
  audioFile: string;
  duration?: number;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  price: number;
  thumbnail?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  videos?: Video[];
  audios?: Audio[];
  _count?: {
    enrollments: number;
  };
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  videoFile: string;
  thumbnail?: string;
  duration?: number;
  order: number;
  courseId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
  };
}

export interface VideoStreamInfo {
  videoId: string;
  streamUrl: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  courseId: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Audio {
  id: string;
  title: string;
  description?: string;
  audioFile: string;
  thumbnail?: string;
  duration?: number;
  order: number;
  courseId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
  };
}

export interface AudioStreamInfo {
  audioId: string;
  streamUrl: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  courseId: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  login: string;
  password: string;
}

export interface RegisterCredentials {
  phone: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Workshop {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  maxParticipants?: number;
  price: number;
  isActive: boolean;
  thumbnail?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username: string;
  };
  participants?: Array<{
    id: string;
    customerPhone: string;
    customerName: string;
    prepaymentAmount: number;
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    createdAt: string;
  }>;
}
