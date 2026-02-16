export interface User {
  id: string;
  phone?: string;
  email?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videos?: Video[];
  audios?: Audio[];
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  videoFile?: string;
  thumbnail?: string;
  duration?: number;
  order: number;
  courseId: string;
  streamUrl?: string;
}

export interface Audio {
  id: string;
  title: string;
  description?: string;
  audioFile?: string;
  thumbnail?: string;
  duration?: number;
  order: number;
  courseId: string;
  streamUrl?: string;
}
