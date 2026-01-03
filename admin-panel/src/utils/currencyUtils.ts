/**
 * Currency conversion utilities for Iranian Rial and Toman
 * In Iran, 1 Toman = 10 Rial
 */

/**
 * Convert Rial to Toman
 * @param rialAmount - Amount in Rial
 * @returns Amount in Toman (rounded)
 */
export const rialToToman = (rialAmount: number): number => {
  return Math.round(rialAmount / 10);
};

/**
 * Convert Toman to Rial
 * @param tomanAmount - Amount in Toman
 * @returns Amount in Rial
 */
export const tomanToRial = (tomanAmount: number): number => {
  return Math.round(tomanAmount * 10);
};

/**
 * Format amount for display in Toman
 * @param rialAmount - Amount in Rial
 * @returns Formatted string in Toman
 */
export const formatAmountInToman = (rialAmount: number): string => {
  const tomanAmount = rialToToman(rialAmount);
  return tomanAmount.toLocaleString('fa-IR');
};

/**
 * Format amount for display in Rial
 * @param rialAmount - Amount in Rial
 * @returns Formatted string in Rial
 */
export const formatAmountInRial = (rialAmount: number): string => {
  return rialAmount.toLocaleString('fa-IR');
};

/**
 * Parse amount string and convert to Rial for API
 * @param tomanAmountString - Amount string in Toman (e.g., "10,000")
 * @returns Amount in Rial
 */
export const parseTomanAmount = (tomanAmountString: string): number => {
  const cleanAmount = tomanAmountString.replace(/,/g, '').replace(/\s/g, '');
  const tomanAmount = parseFloat(cleanAmount);
  if (isNaN(tomanAmount)) {
    throw new Error('مبلغ وارد شده معتبر نیست');
  }
  return tomanToRial(tomanAmount);
};
