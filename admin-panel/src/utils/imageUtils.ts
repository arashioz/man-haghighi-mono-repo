import { API_ORIGIN } from '../services/api';

export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) {
    return null;
  }
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('/uploads/')) {
    return `${API_ORIGIN}${imagePath}`;
  }
  
  return `${API_ORIGIN}/uploads/${imagePath}`;
};


export const getImageUrlWithFallback = (
  imagePath: string | null | undefined,
  fallback?: string
): string => {
  const url = getImageUrl(imagePath);
  return url || fallback || '/images/placeholder.jpg';
};

