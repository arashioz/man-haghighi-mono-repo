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
 * Normalizes phone number by converting to English digits, 
 * handling Iranian prefixes (+98, 98), and ensuring leading zero.
 * @param phone - Phone number string
 * @returns Normalized phone number (e.g., 09123456789)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // First convert Persian/Arabic digits to English
  const englishDigits = convertToEnglishDigits(phone);
  
  // Remove all non-digit characters except +
  let digits = englishDigits.trim().replace(/[^\d+]/g, '');
  
  if (!digits) return '';

  // Handle Iranian formats
  if (digits.startsWith('+98')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('98') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  } else if (!digits.startsWith('0') && digits.length === 10) {
    digits = '0' + digits;
  }

  // Handle extra long numbers (take first 11 if starts with 0, otherwise last 11)
  if (digits.length > 11) {
    digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
  }

  return digits;
}

/**
 * Validates if a phone number is a valid Iranian mobile or landline number
 * @param phone - Phone number string
 * @returns boolean
 */
export function isValidIranianPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^0\d{9,10}$/.test(normalized);
}
