export function normalizePhone(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  let digits = String(input)
    .trim()
    .replace(/[^\d+]/g, '');

  if (!digits) {
    return null;
  }

  if (digits.startsWith('+98')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('98') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  } else if (!digits.startsWith('0') && digits.length === 10) {
    digits = '0' + digits;
  }

  if (digits.length > 11) {
    digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
  }

  if (!/^0\d{9,10}$/.test(digits)) {
    return null;
  }

  return digits;
}



