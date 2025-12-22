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
  isOld?: boolean;
  isBlocked?: boolean;
  blockedUntil?: string;
  rateLimitViolations?: number;
  lastRateLimitViolation?: string;
  education?: string;
  university?: string;
  job?: string;
  state?: string;
  gender?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  parent?: User;
  children?: User[];
}

export type MessageStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Message {
  id: string;
  title: string;
  body: string;
  sendSms: boolean;
  sendInApp: boolean;
  status: MessageStatus;
  totalRecipients: number;
  inAppSentCount: number;
  smsSentCount: number;
  smsFailedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserMessage {
  id: string;
  userId: string;
  messageId: string;
  isRead: boolean;
  readAt?: string | null;
  deliveredAt?: string | null;
  smsStatus?: string | null;
  smsError?: string | null;
  createdAt: string;
  updatedAt: string;
  message?: Message;
}

export interface Workshop {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  maxParticipants?: number;
  price: number;
  thumbnail?: string;
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
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  focusKeyword?: string;
  author?: string;
  categoryId?: string;
  tags?: string[];
  published: boolean;
  allowComments?: boolean;
  viewCount: number;
  readingTime?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Podcast {
  id: string;
  title: string;
  description?: string;
  audioFile: string | null;
  thumbnail?: string | null;
  streamUrl?: string | null;
  duration?: number;
  published: boolean;
  allowComments?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoPodcast {
  id: string;
  title: string;
  description?: string;
  videoFile: string | null;
  streamUrl?: string | null;
  thumbnail?: string | null;
  duration?: number;
  published: boolean;
  publishedAt?: string | null;
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
  attachmentFiles?: string[];
  courseVideoFiles?: string[];
  published: boolean;
  showOnHomepage?: boolean;
  allowComments?: boolean;
  createdAt: string;
  updatedAt: string;
  videos?: Video[];
  audios?: Audio[];
  _count?: {
    enrollments: number;
  };
}

export type CommentTargetType = 'ARTICLE' | 'PODCAST' | 'COURSE';

export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  authorName: string;
  authorPhone?: string | null;
  content: string;
  isPublished: boolean;
  publishedAt?: string | null;
  publishedById?: string | null;
  editedContent?: string | null;
  editedAt?: string | null;
  editedById?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface Log {
  id: string;
  level: 'LOG' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE';
  message: string;
  context?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  errorStack?: string;
  requestBody?: any;
  response?: any;
  createdAt: string;
}

export interface UploadedFileInfo {
  filename: string;
  path: string;
  size: number;
  sizeFormatted: string;
  mimetype: string;
  type: 'video' | 'audio' | 'image' | 'document' | 'other';
  createdAt: string;
  assignedToCourse?: {
    courseId: string;
    courseTitle: string;
    videoId?: string;
    audioId?: string;
  };
}
