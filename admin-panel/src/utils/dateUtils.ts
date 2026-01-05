import moment, { Moment } from 'moment-jalaali';

const KNOWN_INPUT_FORMATS = [
  'jYYYY/jMM/jDD HH:mm',
  'jYYYY/jMM/jDD - HH:mm',
  'jYYYY/jMM/jDD',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DD HH:mm:ss',
  'YYYY/MM/DD HH:mm',
  'YYYY/MM/DD',
];

const toMoment = (date: string | Date): Moment | null => {
  if (!date) {
    return null;
  }

  if (moment.isMoment(date)) {
    return date.clone();
  }

  if (date instanceof Date || typeof date === 'number') {
    return moment(date);
  }

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) {
      return null;
    }

    // First check if it's an ISO string (contains T and Z or +)
    if (trimmed.includes('T') && (trimmed.includes('Z') || trimmed.includes('+') || trimmed.includes('-'))) {
      return moment.utc(trimmed);
    }

    // Check if it's a local datetime string (YYYY-MM-DDTHH:mm:ss)
    if (trimmed.includes('T') && trimmed.length === 19 && !trimmed.includes('Z') && !trimmed.includes('+')) {
      return moment(trimmed);
    }

    // Then try to parse as Persian date
    const parsed = moment(trimmed, KNOWN_INPUT_FORMATS, true);
    if (parsed.isValid()) {
      // For Persian dates, we need to ensure they display correctly
      // by treating them as local dates without timezone conversion
      return parsed;
    }

    const fallback = moment(trimmed);
    return fallback.isValid() ? fallback : null;
  }

  return null;
};

export const formatPersianDate = (date: string | Date): string => {
  const momentDate = toMoment(date);
  if (!momentDate) {
    return 'نامشخص';
  }

  // For UTC ISO strings, ensure we're displaying the correct local date
  if (typeof date === 'string' && (date.includes('T') && (date.includes('Z') || date.includes('+') || date.includes('-')))) {
    // This is a UTC ISO string, convert to local time
    return moment.utc(date).local().format('jYYYY/jMM/jDD');
  }

  // For local datetime strings (YYYY-MM-DDTHH:mm:ss), display directly
  if (typeof date === 'string' && date.includes('T') && date.length === 19 && !date.includes('Z') && !date.includes('+')) {
    return moment(date).format('jYYYY/jMM/jDD');
  }

  return momentDate.format('jYYYY/jMM/jDD');
};

export const formatPersianDateTime = (date: string | Date): string => {
  const momentDate = toMoment(date);
  if (!momentDate) {
    return 'نامشخص';
  }

  // For UTC ISO strings, ensure we're displaying the correct local date
  if (typeof date === 'string' && (date.includes('T') && (date.includes('Z') || date.includes('+') || date.includes('-')))) {
    // This is a UTC ISO string, convert to local time
    return moment.utc(date).local().format('jYYYY/jMM/jDD - HH:mm');
  }

  // For local datetime strings (YYYY-MM-DDTHH:mm:ss), display directly
  if (typeof date === 'string' && date.includes('T') && date.length === 19 && !date.includes('Z') && !date.includes('+')) {
    return moment(date).format('jYYYY/jMM/jDD - HH:mm');
  }

  return momentDate.format('jYYYY/jMM/jDD - HH:mm');
};

export const formatPersianDateWithTime = (date: string | Date): string => {
  const momentDate = toMoment(date);
  if (!momentDate) {
    return 'نامشخص';
  }

  // For UTC ISO strings, ensure we're displaying the correct local date
  if (typeof date === 'string' && (date.includes('T') && (date.includes('Z') || date.includes('+') || date.includes('-')))) {
    // This is a UTC ISO string, convert to local time
    return moment.utc(date).local().format('jYYYY/jMM/jDD HH:mm');
  }

  // For local datetime strings (YYYY-MM-DDTHH:mm:ss), display directly
  if (typeof date === 'string' && date.includes('T') && date.length === 19 && !date.includes('Z') && !date.includes('+')) {
    return moment(date).format('jYYYY/jMM/jDD HH:mm');
  }

  return momentDate.format('jYYYY/jMM/jDD HH:mm');
};
