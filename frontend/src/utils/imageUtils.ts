/**
 * Utility functions for handling image URLs
 */

const API_BASE_URL = 'http://194.180.11.193:3000';

/**
 * Convert a file path to a full image URL
 * @param imagePath - The image path (can be relative or absolute)
 * @returns Full URL for the image
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) {
    return null;
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /uploads, return full URL
  if (imagePath.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  // If it's just a filename, add /uploads/ prefix
  return `${API_BASE_URL}/uploads/${imagePath}`;
};

/**
 * Get image URL with fallback
 * @param imagePath - The image path
 * @param fallback - Fallback image path or URL
 * @returns Image URL or fallback
 */
export const getImageUrlWithFallback = (
  imagePath: string | null | undefined,
  fallback?: string
): string => {
  const url = getImageUrl(imagePath);
  return url || fallback || '/images/placeholder.jpg';
};
