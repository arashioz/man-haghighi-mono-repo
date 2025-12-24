import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { usersService, paymentsService, api } from '../services/api';
import { User } from '../types';
import { formatPersianDateTime } from '../utils/dateUtils';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

interface UserDetails {
  user: User;
  paymentLinks: any[];
  invoices: any[];
  workshops: any[];
  courses: any[];
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'links' | 'invoices' | 'workshops' | 'courses'>('info');

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const [user, invoices] = await Promise.all([
        usersService.getById(userId),
        paymentsService.getAllInvoices({ limit: 100, userId }),
      ]);

      // فاکتورها قبلاً فیلتر شده‌اند
      const userInvoices = invoices || [];

      // دریافت لینک‌های پرداخت (اگر کاربر فروشنده باشد)
      let paymentLinks: any[] = [];
      try {
        const links = await paymentsService.getPaymentLinks();
        paymentLinks = links.filter((link: any) => link.createdBy?.id === userId);
      } catch (err) {
        // اگر دسترسی نداشت، نادیده بگیر
      }

      // دریافت کارگاه‌های کاربر (کارگاه‌هایی که کاربر در آن شرکت کرده)
      let workshops: any[] = [];
      try {
        // استفاده از endpoint my-workshops با userId query parameter
        const response = await api.get('/workshops/my-workshops', {
          params: { userId }
        });
        workshops = response.data || [];
      } catch (err) {
        // اگر دسترسی نداشت، نادیده بگیر
      }

      // دریافت دوره‌های کاربر
      let courses: any[] = [];
      try {
        const userCourses = await usersService.getUserCourses(userId);
        courses = userCourses || [];
      } catch (err) {
        // اگر دسترسی نداشت، نادیده بگیر
      }

      setDetails({
        user,
        paymentLinks,
        invoices: userInvoices,
        workshops,
        courses,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت اطلاعات کاربر');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fa-IR');
  };

  const getPaymentUrl = (linkCode: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/payments/pay/${linkCode}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('کپی شد!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('کپی شد!');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userName || 'جزئیات کاربر'}
      size="large"
    >
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : details ? (
        <div>
          {/* تب‌ها */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8 space-x-reverse">
              {[
                { id: 'info', label: 'اطلاعات', icon: '👤' },
                { id: 'links', label: 'لینک‌های پرداخت', icon: '🔗', count: details.paymentLinks.length },
                { id: 'invoices', label: 'فاکتورها', icon: '🧾', count: details.invoices.length },
                { id: 'workshops', label: 'کارگاه‌ها', icon: '🏢', count: details.workshops.length },
                { id: 'courses', label: 'دوره‌ها', icon: '📚', count: details.courses.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="ml-2">{tab.icon}</span>
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="mr-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* محتوای تب‌ها */}
          <div className="max-h-[600px] overflow-y-auto">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {details.user.firstName?.[0] || details.user.username[0] || '?'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {details.user.firstName} {details.user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">@{details.user.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">ایمیل</p>
                      <p className="text-base font-medium text-gray-900">{details.user.email}</p>
                    </div>
                    {details.user.phone && (
                      <div>
                        <p className="text-sm text-gray-600">شماره موبایل</p>
                        <p className="text-base font-medium text-gray-900">{details.user.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">نقش</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        details.user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                        details.user.role === 'SALES_MANAGER' ? 'bg-purple-100 text-purple-800' :
                        details.user.role === 'SALES_PERSON' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {details.user.role === 'ADMIN' ? 'مدیر' :
                         details.user.role === 'SALES_MANAGER' ? 'مدیر فروش' :
                         details.user.role === 'SALES_PERSON' ? 'فروشنده' :
                         'کاربر'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">وضعیت</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        details.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {details.user.isActive ? '✅ فعال' : '❌ غیرفعال'}
                      </span>
                    </div>
                    {details.user.education && (
                      <div>
                        <p className="text-sm text-gray-600">تحصیلات</p>
                        <p className="text-base text-gray-900">{details.user.education}</p>
                      </div>
                    )}
                    {details.user.job && (
                      <div>
                        <p className="text-sm text-gray-600">شغل</p>
                        <p className="text-base text-gray-900">{details.user.job}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-4">
                {details.paymentLinks.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">هیچ لینک پرداختی ایجاد نشده</p>
                  </div>
                ) : (
                  details.paymentLinks.map((link) => (
                    <div key={link.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{link.customerName}</h4>
                          <p className="text-sm text-gray-500">{link.customerPhone}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          link.invoices?.some((inv: any) => inv.status === 'PAID')
                            ? 'bg-green-100 text-green-800'
                            : link.isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {link.invoices?.some((inv: any) => inv.status === 'PAID') ? '✅ پرداخت شده' : link.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">مبلغ</p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatAmount(link.amount)} ریال ({formatAmount(Math.round(link.amount / 10))} تومان)
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(getPaymentUrl(link.linkCode))}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          کپی لینک
                        </button>
                      </div>
                      {link.description && (
                        <p className="text-sm text-gray-600 mt-2">{link.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {details.invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">هیچ فاکتوری یافت نشد</p>
                  </div>
                ) : (
                  details.invoices.map((invoice: any) => (
                    <div key={invoice.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">فاکتور #{invoice.invoiceNumber || invoice.id.slice(0, 8)}</h4>
                          {invoice.course && (
                            <p className="text-sm text-gray-500 mt-1">دوره: {invoice.course.title}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status === 'PAID' ? '✅ پرداخت شده' :
                           invoice.status === 'FAILED' ? '❌ ناموفق' :
                           '⏳ در انتظار'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">مبلغ</p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatAmount(Number(invoice.amount))} ریال
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">تاریخ</p>
                          <p className="text-base text-gray-900">
                            {invoice.paidAt ? formatPersianDateTime(invoice.paidAt) : formatPersianDateTime(invoice.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'workshops' && (
              <div className="space-y-4">
                {details.workshops.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">هیچ کارگاهی یافت نشد</p>
                  </div>
                ) : (
                  details.workshops.map((workshop: any) => (
                    <div key={workshop.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{workshop.title}</h4>
                          {workshop.location && (
                            <p className="text-sm text-gray-500 mt-1">📍 {workshop.location}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          workshop.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {workshop.isActive ? '✅ فعال' : '⚫ غیرفعال'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">تاریخ</p>
                          <p className="text-base text-gray-900">{formatPersianDateTime(workshop.date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">قیمت</p>
                          <p className="text-base font-semibold text-gray-900">
                            {workshop.price ? `${formatAmount(workshop.price)} تومان` : 'رایگان'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="space-y-4">
                {details.courses.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">هیچ دوره‌ای یافت نشد</p>
                  </div>
                ) : (
                  details.courses.map((course: any) => (
                    <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{course.title}</h4>
                          {course.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          course.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {course.published ? '✅ منتشر شده' : '⚫ منتشر نشده'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">قیمت</p>
                          <p className="text-base font-semibold text-gray-900">
                            {course.price ? `${formatAmount(course.price)} تومان` : 'رایگان'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">تاریخ ثبت‌نام</p>
                          <p className="text-base text-gray-900">
                            {course.enrolledAt ? formatPersianDateTime(course.enrolledAt) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default UserDetailsModal;

