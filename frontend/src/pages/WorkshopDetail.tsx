import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { workshopsService } from '../services/api';
import { Workshop } from '../types';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { getImageUrlWithFallback } from '../utils/imageUtils';
import { formatPersianDateWithTime } from '../utils/dateUtils';

const WorkshopDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPreRegisterModal, setShowPreRegisterModal] = useState(false);
  const [preRegisterData, setPreRegisterData] = useState({ customerName: '', customerPhone: '' });
  const [preRegisterLoading, setPreRegisterLoading] = useState(false);

  useEffect(() => {
    const fetchWorkshop = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError('');
        const data = await workshopsService.getById(id);
        setWorkshop(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت اطلاعات کارگاه');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshop();
  }, [id]);

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshop) return;

    setPreRegisterLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(preRegisterData.customerPhone);
      await workshopsService.preRegister(workshop.id, {
        customerName: preRegisterData.customerName,
        customerPhone: normalizedPhone,
      });
      
      alert('پیش‌ثبت‌نام با موفقیت انجام شد!');
      setShowPreRegisterModal(false);
      setPreRegisterData({ customerName: '', customerPhone: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در ثبت پیش‌ثبت‌نام');
    } finally {
      setPreRegisterLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatPersianDateWithTime(dateString);
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white/60 text-sm">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{error || 'کارگاه یافت نشد'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/30 rounded-full text-yellow-400 text-sm font-semibold transition-colors"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  const workshopImage = workshop.thumbnail
    ? getImageUrlWithFallback(workshop.thumbnail, '/assets/homeV2/Qodrat Namahdood5.jpg')
    : '/assets/homeV2/Qodrat Namahdood5.jpg';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[#0a0a0a]" />
        {workshop.thumbnail && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${workshopImage})` }}
          />
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="mb-6">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wider ${
                workshop.isActive
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
              }`}>
                {workshop.isActive ? 'رویداد فعال' : 'رویداد آتی'}
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl mb-6">
              {workshop.title}
            </h1>
            {workshop.description && (
              <p className="max-w-3xl mx-auto text-lg text-white/70 sm:text-xl leading-relaxed">
                {workshop.description}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 bg-[#0a0a0a]">
        <div className="grid gap-8 lg:grid-cols-3 py-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Workshop Image */}
            {workshop.thumbnail && (
              <div className="relative h-96 rounded-[32px] overflow-hidden border border-white/10">
                <img
                  src={workshopImage}
                  alt={workshop.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/homeV2/Qodrat Namahdood5.jpg';
                  }}
                />
              </div>
            )}

            {/* Description */}
            {workshop.description && (
              <div className="border border-white/10 rounded-[32px] p-8 bg-black/40 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-4 text-yellow-400">درباره کارگاه</h2>
                <p className="text-white/80 leading-relaxed whitespace-pre-line">
                  {workshop.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-white/10 rounded-[32px] p-6 bg-black/40 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-6 text-yellow-400">اطلاعات کارگاه</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-white/60 mb-1">تاریخ و زمان</p>
                  <p className="text-white font-semibold">{formatDate(workshop.date)}</p>
                </div>
                
                {workshop.location && (
                  <div>
                    <p className="text-sm text-white/60 mb-1">مکان</p>
                    <p className="text-white font-semibold">{workshop.location}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-white/60 mb-1">قیمت</p>
                  <p className="text-white font-semibold text-lg">
                    {workshop.price > 0
                      ? `${workshop.price.toLocaleString('fa-IR')} تومان`
                      : 'رایگان'}
                  </p>
                </div>
                
                {workshop.maxParticipants && (
                  <div>
                    <p className="text-sm text-white/60 mb-1">ظرفیت</p>
                    <p className="text-white font-semibold">
                      {workshop.maxParticipants} نفر
                    </p>
                  </div>
                )}
              </div>

              {/* Register Button */}
              <button
                onClick={() => setShowPreRegisterModal(true)}
                disabled={!workshop.isActive}
                className={`w-full rounded-full px-6 py-4 text-sm font-semibold uppercase tracking-widest transition-all duration-300 ${
                  workshop.isActive
                    ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.8)] hover:scale-105'
                    : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {workshop.isActive ? 'ثبت نام' : 'کارگاه غیرفعال'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Pre-register Modal */}
      {showPreRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">پیش‌ثبت‌نام در کارگاه</h3>
              <button
                onClick={() => setShowPreRegisterModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-white/80 mb-6">{workshop.title}</p>
            
            <form onSubmit={handlePreRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  value={preRegisterData.customerName}
                  onChange={(e) =>
                    setPreRegisterData({ ...preRegisterData, customerName: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                  required
                  placeholder="نام و نام خانوادگی خود را وارد کنید"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  شماره تماس
                </label>
                <input
                  type="tel"
                  value={preRegisterData.customerPhone}
                  onChange={(e) =>
                    setPreRegisterData({ ...preRegisterData, customerPhone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                  required
                  placeholder="09123456789"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPreRegisterModal(false)}
                  disabled={preRegisterLoading}
                  className="flex-1 px-4 py-3 text-white/80 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={preRegisterLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 disabled:opacity-50 font-semibold"
                >
                  {preRegisterLoading ? 'در حال ثبت...' : 'پیش‌ثبت‌نام'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorkshopDetail;








