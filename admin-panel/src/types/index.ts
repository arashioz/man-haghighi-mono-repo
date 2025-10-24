export interface User {
  id: string;
  email: string;
  username: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_PERSON' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  parent?: User;
  children?: User[];
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: User;
  participants?: WorkshopParticipant[];
}

export interface WorkshopParticipant {
  id: string;
  workshopId: string;
  customerPhone: string;
  customerName: string;
  prepaymentAmount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  paymentLink?: string;
  invitationCard?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  workshop?: Workshop;
  creator?: User;
}

export interface Slider {
  id: string;
  title: string;
  description?: string;
  image: string;
  videoFile?: string;
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
  videoFile?: string;
  attachments?: string[];
  courseVideos?: string[];
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

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  login: string;
  password: string;
}

export interface SalesTeam {
  id: string;
  name: string;
  managerId: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager: {
    id: string;
    firstName?: string;
    lastName?: string;
    username: string;
  };
  members: SalesTeamMember[];
}

export interface SalesTeamMember {
  id: string;
  teamId: string;
  salesPersonId: string;
  joinedAt: string;
  isActive: boolean;
  salesPerson: {
    id: string;
    firstName?: string;
    lastName?: string;
    username: string;
    phone?: string;
  };
}
