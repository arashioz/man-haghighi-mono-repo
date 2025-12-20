/**
 * Converts Persian/Arabic digits to English digits
 * @param input - String that may contain Persian/Arabic digits
 * @returns String with all digits converted to English
 */
export function convertToEnglishDigits(input: string): string {
  if (!input) return input;
  
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let result = input;
  
  // Convert Persian digits
  persianDigits.forEach((persianDigit, index) => {
    result = result.replace(new RegExp(persianDigit, 'g'), index.toString());
  });
  
  // Convert Arabic digits
  arabicDigits.forEach((arabicDigit, index) => {
    result = result.replace(new RegExp(arabicDigit, 'g'), index.toString());
  });
  
  return result;
}

/**
 * Normalizes phone number by converting to English digits and removing non-digit characters
 * @param phone - Phone number string
 * @returns Normalized phone number with only English digits
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // First convert Persian/Arabic digits to English
  const englishDigits = convertToEnglishDigits(phone);
  
  // Remove all non-digit characters except + at the start
  let normalized = englishDigits.replace(/[^\d+]/g, '');
  
  // If it starts with +98, keep it, otherwise remove +
  if (normalized.startsWith('+98')) {
    return normalized;
  }
  
  // Remove any remaining + signs
  normalized = normalized.replace(/\+/g, '');
  
  return normalized;
}













