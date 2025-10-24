import React, { useState, useEffect } from 'react';
import { workshopsService } from '../services/api';
import { Workshop } from '../types';
import { formatPersianDate } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const UserWorkshops: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserWorkshops = async () => {
      try {
        const data = await workshopsService.getUserParticipatedWorkshops();
        setWorkshops(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت کارگاه‌های شما');
      } finally {
        setLoading(false);
      }
    };

    fetchUserWorkshops();
  }, []);

  const WorkshopIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">کارگاه‌های شرکت کرده</h3>
        <p className="text-sm text-gray-600 mt-1">لیست کارگاه‌هایی که در آن‌ها شرکت کرده‌اید</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {workshops.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {workshops.map((workshop) => (
            <div key={workshop.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center text-white font-medium mr-3">
                      {workshop.title?.[0] || 'W'}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{workshop.title}</h4>
                      <p className="text-sm text-gray-500">{workshop.location}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3 leading-relaxed">{workshop.description}</p>
                  
                  <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatPersianDate(workshop.date)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      {workshop.price ? `${workshop.price.toLocaleString()} تومان` : 'رایگان'}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    workshop.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {workshop.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                  
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    شرکت کرده
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6">
          <EmptyState
            icon={<WorkshopIcon />}
            title="کارگاهی یافت نشد"
            description="شما هنوز در هیچ کارگاهی شرکت نکرده‌اید."
          />
        </div>
      )}
    </div>
  );
};

export default UserWorkshops;
