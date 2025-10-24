import moment from 'moment-jalaali';

export const formatPersianDate = (date: string | Date): string => {
  if (!date) return 'نامشخص';
  
  const momentDate = moment(date);
  return momentDate.format('jYYYY/jMM/jDD');
};

export const formatPersianDateTime = (date: string | Date): string => {
  if (!date) return 'نامشخص';
  
  const momentDate = moment(date);
  return momentDate.format('jYYYY/jMM/jDD - HH:mm');
};

export const formatPersianDateWithTime = (date: string | Date): string => {
  if (!date) return 'نامشخص';
  
  const momentDate = moment(date);
  return momentDate.format('jYYYY/jMM/jDD HH:mm');
};
