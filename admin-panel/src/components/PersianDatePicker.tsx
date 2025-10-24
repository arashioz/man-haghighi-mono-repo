import React, { useState } from 'react';
import moment from 'moment-jalaali';

interface PersianDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'تاریخ را انتخاب کنید',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    value ? moment(value) : moment()
  );

  const handleDateSelect = (date: moment.Moment) => {
    setSelectedDate(date);
    const persianDateString = date.format('jYYYY/jMM/jDD HH:mm');
    onChange(persianDateString);
    setIsOpen(false);
  };

  const formatPersianDate = (date: moment.Moment) => {
    return date.format('jYYYY/jMM/jDD - HH:mm');
  };

  const generateCalendarDays = () => {
    const startOfMonth = selectedDate.clone().startOf('jMonth');
    const endOfMonth = selectedDate.clone().endOf('jMonth');
    const startOfCalendar = startOfMonth.clone().startOf('week');
    const endOfCalendar = endOfMonth.clone().endOf('week');

    const days = [];
    const day = startOfCalendar.clone();

    while (day.isSameOrBefore(endOfCalendar, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    return days;
  };

  const monthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const dayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value ? formatPersianDate(moment(value)) : ''}
        onClick={() => setIsOpen(!isOpen)}
        placeholder={placeholder}
        readOnly
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {}
          <div className="flex items-center justify-between p-3 border-b">
            <button
              onClick={() => setSelectedDate(selectedDate.clone().subtract(1, 'jMonth'))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-center">
              <div className="font-semibold">
                {monthNames[selectedDate.jMonth()]} {selectedDate.jYear()}
              </div>
            </div>
            
            <button
              onClick={() => setSelectedDate(selectedDate.clone().add(1, 'jMonth'))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {}
          <div className="grid grid-cols-7 gap-1 p-2">
            {dayNames.map((dayName) => (
              <div key={dayName} className="text-center text-sm font-medium text-gray-500 py-2">
                {dayName}
              </div>
            ))}
          </div>

          {}
          <div className="grid grid-cols-7 gap-1 p-2">
            {generateCalendarDays().map((day, index) => {
              const isCurrentMonth = day.jMonth() === selectedDate.jMonth();
              const isToday = day.isSame(moment(), 'day');
              const isSelected = value && day.isSame(moment(value), 'day');

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(day)}
                  className={`
                    p-2 text-sm rounded hover:bg-blue-100
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isToday ? 'bg-blue-200 font-semibold' : ''}
                    ${isSelected ? 'bg-blue-500 text-white' : ''}
                  `}
                >
                  {day.jDate()}
                </button>
              );
            })}
          </div>

          {}
          <div className="p-3 border-t">
            <div className="flex items-center space-x-2 space-x-reverse">
              <label className="text-sm text-gray-600">ساعت:</label>
              <input
                type="time"
                value={selectedDate.format('HH:mm')}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newDate = selectedDate.clone().hours(parseInt(hours)).minutes(parseInt(minutes));
                  setSelectedDate(newDate);
                  const persianDateString = newDate.format('jYYYY/jMM/jDD HH:mm');
                  onChange(persianDateString);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersianDatePicker;
