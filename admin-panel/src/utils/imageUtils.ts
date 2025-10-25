

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) {
    return null;
  }
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  return `${API_BASE_URL}/uploads/${imagePath}`;
};


export const getImageUrlWithFallback = (
  imagePath: string | null | undefined,
  fallback?: string
): string => {
  const url = getImageUrl(imagePath);
  return url || fallback || '/images/placeholder.jpg';
};

