import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { workshopsService } from '../services/api';
import { Workshop } from '../types';
import { formatPersianDate } from '../utils/dateUtils';

const MyWorkshops: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [participantData, setParticipantData] = useState({
    customerName: '',
    customerPhone: '',
    prepaymentAmount: 0,
  });

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const data = await workshopsService.getSalesPersonAccessible();
        setWorkshops(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت کارگاه‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshops();
  }, []);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;

    try {
      await workshopsService.addParticipant(selectedWorkshop.id, {
        ...participantData,
        workshopId: selectedWorkshop.id,
        paymentStatus: 'PENDING',
        createdBy: 'current-user-id',
      });
      
      const data = await workshopsService.getSalesPersonAccessible();
      setWorkshops(data);
      
      setIsModalOpen(false);
      setSelectedWorkshop(null);
      setParticipantData({
        customerName: '',
        customerPhone: '',
        prepaymentAmount: 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در اضافه کردن شرکت‌کننده');
    }
  };

  const openParticipantModal = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setIsModalOpen(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="کارگاه‌های من"
        description="کارگاه‌هایی که دسترسی به آن‌ها دارید"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {workshops.length === 0 ? (
        <EmptyState
          icon="Workshop"
          title="کارگاه‌ای یافت نشد"
          description="در حال حاضر هیچ کارگاه فعالی برای شما تعریف نشده است."
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {workshops.map((workshop) => (
              <li key={workshop.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {workshop.title}
                        </h3>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            workshop.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {workshop.isActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>
                      </div>
                      
                      {workshop.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {workshop.description}
                        </p>
                      )}
                      
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatPersianDate(workshop.date)}
                        </div>
                        
                        {workshop.location && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {workshop.location}
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {workshop.price ? `${workshop.price.toLocaleString()} تومان` : 'رایگان'}
                        </div>
                      </div>
                      
                      {workshop.maxParticipants && (
                        <div className="mt-2 text-sm text-gray-500">
                          <span className="font-medium">ظرفیت:</span> {workshop.participants?.length || 0} / {workshop.maxParticipants}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => openParticipantModal(workshop)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        اضافه کردن شرکت‌کننده
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWorkshop(null);
        }}
        title="اضافه کردن شرکت‌کننده"
      >
        {selectedWorkshop && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900">{selectedWorkshop.title}</h4>
            <p className="text-sm text-gray-600 mt-1">
              تاریخ: {formatPersianDate(selectedWorkshop.date)}
            </p>
            {selectedWorkshop.location && (
              <p className="text-sm text-gray-600">مکان: {selectedWorkshop.location}</p>
            )}
          </div>
        )}
        
        <form onSubmit={handleAddParticipant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              value={participantData.customerName}
              onChange={(e) => setParticipantData({...participantData, customerName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              شماره تماس
            </label>
            <input
              type="tel"
              value={participantData.customerPhone}
              onChange={(e) => setParticipantData({...participantData, customerPhone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مبلغ پیش‌پرداخت (تومان)
            </label>
            <input
              type="number"
              value={participantData.prepaymentAmount}
              onChange={(e) => setParticipantData({...participantData, prepaymentAmount: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedWorkshop(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
            >
              اضافه کردن
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyWorkshops;
