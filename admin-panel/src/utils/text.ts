export const truncateWords = (text: string, limit: number = 20): string => {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) {
    return text;
  }
  return `${words.slice(0, limit).join(' ')}...`;
};

