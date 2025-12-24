import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { paymentsService, usersService, workshopsService, coursesService, API_ORIGIN } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPersianDateTime } from '../utils/dateUtils';
import { Workshop, Course } from '../types';

interface PaymentLink {
  id: string;
  linkCode: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  description?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    username: string;
  };
  invoices?: Array<{
    id: string;
    status: string;
    paidAt?: string;
    transactions?: Array<{
      id: string;
      status: string;
      createdAt: string;
    }>;
  }>;
}

const PaymentLinks: React.FC = () => {
  const { user } = useAuth();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'paid'>('all');
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>('');
  const [customerLinks, setCustomerLinks] = useState<PaymentLink[]>([]);
  const [isCustomerLinksModalOpen, setIsCustomerLinksModalOpen] = useState(false);

  const [newLink, setNewLink] = useState({
    customerName: '',
    customerMobile: '',
    amount: '',
    description: '',
    workshopId: '',
    courseId: '',
  });
  const [availableWorkshops, setAvailableWorkshops] = useState<Workshop[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [linkType, setLinkType] = useState<'manual' | 'workshop' | 'course'>('manual');

  useEffect(() => {
    fetchPaymentLinks();
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      if (user?.role === 'SALES_PERSON') {
        // For sales persons, get only accessible workshops
        const workshops = await workshopsService.getSalesPersonAccessible();
        setAvailableWorkshops(workshops);
      } else if (user?.role === 'SALES_MANAGER' || user?.role === 'ADMIN') {
        // For managers and admins, get all active workshops and published courses
        const [workshops, courses] = await Promise.all([
          workshopsService.getActive(),
          coursesService.getPublished(),
        ]);
        setAvailableWorkshops(workshops);
        setAvailableCourses(courses);
      }
    } catch (err: any) {
      console.error('Error fetching available items:', err);
    }
  };

  const fetchPaymentLinks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await paymentsService.getPaymentLinks();
      setPaymentLinks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت لینک‌های پرداخت');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Amount is always manual - workshop/course prices are just for reference
      const amount = parseFloat(newLink.amount.replace(/,/g, ''));
      if (isNaN(amount) || amount < 1000) {
        setError('مبلغ باید حداقل 1000 ریال باشد');
        return;
      }

      if (!/^09[0-9]{9}$/.test(newLink.customerMobile)) {
        setError('شماره موبایل نامعتبر است');
        return;
      }

      let description = newLink.description || '';
      if (linkType === 'workshop' && newLink.workshopId) {
        const workshop = availableWorkshops.find(w => w.id === newLink.workshopId);
        description = `پرداخت کارگاه: ${workshop?.title}${description ? ` - ${description}` : ''}`;
      } else if (linkType === 'course' && newLink.courseId) {
        const course = availableCourses.find(c => c.id === newLink.courseId);
        description = `پرداخت دوره: ${course?.title}${description ? ` - ${description}` : ''}`;
      }

      await paymentsService.createPaymentLink({
        customerName: newLink.customerName,
        customerMobile: newLink.customerMobile,
        amount: amount,
        description: description || undefined,
      });

      setIsCreateModalOpen(false);
      setNewLink({
        customerName: '',
        customerMobile: '',
        amount: '',
        description: '',
        workshopId: '',
        courseId: '',
      });
      setLinkType('manual');
      await fetchPaymentLinks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد لینک پرداخت');
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fa-IR');
  };

  const getPaymentUrl = (linkCode: string) => {
    // Use main site URL instead of admin panel URL
    // Convert api.manehaghighi.com to manehaghighi.com
    let siteUrl = API_ORIGIN;
    if (siteUrl.includes('api.manehaghighi.com')) {
      siteUrl = siteUrl.replace('api.manehaghighi.com', 'manehaghighi.com');
    } else if (siteUrl.includes('api.')) {
      // For other domains, remove api. subdomain
      siteUrl = siteUrl.replace(/api\./, '');
    }
    
    return `${siteUrl}/api/payments/pay/${linkCode}`;
  };

  const copyToClipboard = async (text: string, message: string = 'کپی شد!') => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(message);
    }
  };

  const sendWhatsApp = (phone: string, name: string, amount: number, link: string) => {
    const cleanPhone = phone.startsWith('0') ? phone.substring(1) : phone;
    const whatsappPhone = `98${cleanPhone}`;
    const message = `سلام ${name}\nمبلغ پرداختی: ${formatAmount(amount)} ریال (${formatAmount(Math.round(amount / 10))} تومان)\nلینک پرداخت:\n${link}`;
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getPaymentStatus = (link: PaymentLink): 'paid' | 'pending' | 'failed' => {
    // Check if invoice has PAID status
    const paidInvoice = link.invoices?.find(inv => inv.status === 'PAID');
    if (paidInvoice) {
      return 'paid';
    }

    // Check if there's a transaction with PAID status
    const paidTransaction = link.invoices?.some(inv => 
      inv.transactions?.some((t: any) => t.status === 'PAID')
    );
    if (paidTransaction) {
      return 'paid';
    }

    // Check if there's a pending transaction
    const pendingTransaction = link.invoices?.some(inv => 
      inv.transactions?.some((t: any) => t.status === 'PENDING')
    );
    if (pendingTransaction) {
      return 'pending';
    }

    return 'pending';
  };

  const openCustomerLinksModal = async (phone: string, name: string) => {
    try {
      setLoading(true);
      const links = await paymentsService.getCustomerPaymentLinks(phone);
      setCustomerLinks(links);
      setSelectedCustomerPhone(phone);
      setIsCustomerLinksModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت لینک‌های مشتری');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLink = async (linkId: string) => {
    try {
      await paymentsService.togglePaymentLink(linkId);
      await fetchPaymentLinks();
      // Also refresh customer links if modal is open
      if (isCustomerLinksModalOpen && selectedCustomerPhone) {
        const links = await paymentsService.getCustomerPaymentLinks(selectedCustomerPhone);
        setCustomerLinks(links);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در تغییر وضعیت لینک');
    }
  };

  const getFilteredLinks = () => {
    let filtered = paymentLinks;

    if (searchTerm) {
      filtered = filtered.filter(
        link =>
          link.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.customerPhone.includes(searchTerm) ||
          link.linkCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (filterStatus) {
      case 'active':
        filtered = filtered.filter(link => link.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(link => !link.isActive);
        break;
      case 'paid':
        filtered = filtered.filter(link => getPaymentStatus(link) === 'paid');
        break;
    }

    return filtered;
  };

  const getStats = () => {
    const total = paymentLinks.length;
    const active = paymentLinks.filter(l => l.isActive).length;
    const paid = paymentLinks.filter(l => l.invoices?.some(inv => inv.status === 'PAID')).length;
    const totalAmount = paymentLinks.reduce((sum, link) => sum + link.amount, 0);
    const paidAmount = paymentLinks
      .filter(l => l.invoices?.some(inv => inv.status === 'PAID'))
      .reduce((sum, link) => sum + link.amount, 0);

    return { total, active, paid, totalAmount, paidAmount };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = getStats();
  const filteredLinks = getFilteredLinks();

  const isInDashboard = window.location.pathname.includes('sales-dashboard');

  return (
    <div>
      {!isInDashboard && (
        <PageHeader
          title="لینک‌های پرداخت"
          description="مدیریت و ایجاد لینک‌های پرداخت برای مشتریان"
          action={
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ایجاد لینک پرداخت
            </button>
          }
        />
      )}
      
      {isInDashboard && (
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">لینک‌های پرداخت</h2>
            <p className="text-gray-600 mt-1">مدیریت و ایجاد لینک‌های پرداخت برای مشتریان</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            ایجاد لینک پرداخت
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-fade-in">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* آمار کلی */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">کل لینک‌ها</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">فعال</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">پرداخت شده</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats.paid}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">کل فروش (تومان)</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{formatAmount(Math.round(stats.paidAmount / 10))}</p>
        </div>
      </div>

      {/* فیلتر و جستجو */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو بر اساس نام، موبایل یا کد لینک..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="md:w-64">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="paid">پرداخت شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* لیست لینک‌ها */}
      {filteredLinks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
          <EmptyState
            icon={
              <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="لینک پرداختی یافت نشد"
            description={searchTerm ? 'نتیجه‌ای برای جستجوی شما یافت نشد' : 'هنوز لینک پرداختی ایجاد نشده است'}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">مشتری</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">مبلغ</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">وضعیت لینک</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">وضعیت پرداخت</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">تاریخ ایجاد</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLinks.map((link) => {
                  const paymentUrl = getPaymentUrl(link.linkCode);
                  const isPaid = link.invoices?.some(inv => inv.status === 'PAID');
                  
                  return (
                    <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {link.customerName?.[0] || '?'}
                          </div>
                          <div className="mr-4">
                            <button
                              onClick={() => openCustomerLinksModal(link.customerPhone, link.customerName)}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-right"
                            >
                              {link.customerName}
                            </button>
                            <div className="text-sm text-gray-500">{link.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatAmount(link.amount)} ریال</div>
                        <div className="text-sm text-gray-500">{formatAmount(Math.round(link.amount / 10))} تومان</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          link.isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {link.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const paymentStatus = getPaymentStatus(link);
                          return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              paymentStatus === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : paymentStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {paymentStatus === 'paid' ? '✅ پرداخت شده' : paymentStatus === 'pending' ? '⏳ در انتظار' : '❌ ناموفق'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPersianDateTime(link.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedLink(link);
                              setIsDetailsModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="جزئیات"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => copyToClipboard(paymentUrl, 'لینک پرداخت کپی شد!')}
                            className="text-purple-600 hover:text-purple-900 p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title="کپی لینک"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => sendWhatsApp(link.customerPhone, link.customerName, link.amount, paymentUrl)}
                            className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="ارسال واتساپ"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مودال ایجاد لینک */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewLink({
            customerName: '',
            customerMobile: '',
            amount: '',
            description: '',
            workshopId: '',
            courseId: '',
          });
          setLinkType('manual');
          setError('');
        }}
        title="ایجاد لینک پرداخت جدید"
      >
        <form onSubmit={handleCreateLink} className="space-y-4">
          {/* نوع لینک */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع لینک</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkType('manual');
                  setNewLink({...newLink, workshopId: '', courseId: '', amount: ''});
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  linkType === 'manual'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                دستی
              </button>
              {availableWorkshops.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLinkType('workshop');
                    setNewLink({...newLink, courseId: '', amount: ''});
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    linkType === 'workshop'
                      ? 'bg-purple-50 border-purple-500 text-purple-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  کارگاه
                </button>
              )}
              {availableCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLinkType('course');
                    setNewLink({...newLink, workshopId: '', amount: ''});
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    linkType === 'course'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  دوره
                </button>
              )}
            </div>
          </div>

          {/* انتخاب کارگاه */}
          {linkType === 'workshop' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">انتخاب کارگاه</label>
              <select
                value={newLink.workshopId}
                onChange={(e) => {
                  const workshopId = e.target.value;
                  const workshop = availableWorkshops.find(w => w.id === workshopId);
                  setNewLink({
                    ...newLink,
                    workshopId,
                    amount: workshop ? Math.round(workshop.price).toString() : '',
                  });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">انتخاب کارگاه...</option>
                {availableWorkshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.title} - {workshop.price.toLocaleString('fa-IR')} تومان
                  </option>
                ))}
              </select>
              {newLink.workshopId && (
                <p className="text-sm text-gray-500 mt-1">
                  مبلغ: {formatAmount(availableWorkshops.find(w => w.id === newLink.workshopId)?.price || 0)} تومان
                  ({formatAmount((availableWorkshops.find(w => w.id === newLink.workshopId)?.price || 0) * 10)} ریال)
                </p>
              )}
            </div>
          )}

          {/* انتخاب دوره */}
          {linkType === 'course' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">انتخاب دوره</label>
              <select
                value={newLink.courseId}
                onChange={(e) => {
                  const courseId = e.target.value;
                  const course = availableCourses.find(c => c.id === courseId);
                  setNewLink({
                    ...newLink,
                    courseId,
                    amount: course ? Math.round(course.price).toString() : '',
                  });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">انتخاب دوره...</option>
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} - {course.price.toLocaleString('fa-IR')} تومان
                  </option>
                ))}
              </select>
              {newLink.courseId && (
                <p className="text-sm text-gray-500 mt-1">
                  مبلغ: {formatAmount(availableCourses.find(c => c.id === newLink.courseId)?.price || 0)} تومان
                  ({formatAmount((availableCourses.find(c => c.id === newLink.courseId)?.price || 0) * 10)} ریال)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نام و نام خانوادگی مشتری</label>
            <input
              type="text"
              value={newLink.customerName}
              onChange={(e) => setNewLink({...newLink, customerName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="مثال: علی احمدی"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">شماره موبایل</label>
            <input
              type="text"
              value={newLink.customerMobile}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                if (value.length <= 11) {
                  setNewLink({...newLink, customerMobile: value});
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="09123456789"
              pattern="09[0-9]{9}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ (تومان) *</label>
            <input
              type="text"
              value={newLink.amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                setNewLink({...newLink, amount: value});
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="100000"
            />
            {newLink.amount && (
              <p className="text-sm text-gray-500 mt-1">
                معادل: {formatAmount(parseFloat(newLink.amount.replace(/,/g, '')) * 10)} ریال
              </p>
            )}
            {(linkType === 'workshop' && newLink.workshopId) || (linkType === 'course' && newLink.courseId) ? (
              <p className="text-sm text-blue-600 mt-1">
                💡 مبلغ کارگاه/دوره فقط برای نمایش است. می‌توانید هر مبلغی که می‌خواهید وارد کنید.
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات (اختیاری)</label>
            <textarea
              value={newLink.description}
              onChange={(e) => setNewLink({...newLink, description: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="توضیحات سفارش..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewLink({
                  customerName: '',
                  customerMobile: '',
                  amount: '',
                  description: '',
                  workshopId: '',
                  courseId: '',
                });
                setLinkType('manual');
                setError('');
              }}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              ایجاد لینک
            </button>
          </div>
        </form>
      </Modal>

      {/* مودال جزئیات */}
      {selectedLink && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedLink(null);
          }}
          title="جزئیات لینک پرداخت"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedLink.customerName}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">شماره موبایل</p>
                  <p className="text-base font-medium text-gray-900">{selectedLink.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">مبلغ</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatAmount(selectedLink.amount)} ریال ({formatAmount(Math.round(selectedLink.amount / 10))} تومان)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">کد لینک</p>
                  <p className="text-base font-medium text-gray-900 font-mono">{selectedLink.linkCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">وضعیت</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    selectedLink.invoices?.some(inv => inv.status === 'PAID')
                      ? 'bg-green-100 text-green-800'
                      : selectedLink.isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedLink.invoices?.some(inv => inv.status === 'PAID') ? '✅ پرداخت شده' : selectedLink.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                  </span>
                </div>
              </div>
              {selectedLink.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">توضیحات</p>
                  <p className="text-base text-gray-900">{selectedLink.description}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">لینک پرداخت</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getPaymentUrl(selectedLink.linkCode)}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(getPaymentUrl(selectedLink.linkCode), 'لینک کپی شد!')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  کپی
                </button>
              </div>
            </div>

            {selectedLink.invoices && selectedLink.invoices.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">فاکتورها</h4>
                <div className="space-y-2">
                  {selectedLink.invoices.map((invoice) => (
                    <div key={invoice.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700">فاکتور #{invoice.id.slice(0, 8)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'PAID' ? 'پرداخت شده' : 'در انتظار'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => sendWhatsApp(selectedLink.customerPhone, selectedLink.customerName, selectedLink.amount, getPaymentUrl(selectedLink.linkCode))}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                ارسال واتساپ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* مودال لینک‌های مشتری */}
      <Modal
        isOpen={isCustomerLinksModalOpen}
        onClose={() => {
          setIsCustomerLinksModalOpen(false);
          setSelectedCustomerPhone('');
          setCustomerLinks([]);
        }}
        title={`لینک‌های پرداخت: ${customerLinks[0]?.customerName || ''}`}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>شماره موبایل:</strong> {selectedCustomerPhone}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>تعداد لینک‌ها:</strong> {customerLinks.length}
            </p>
          </div>

          {customerLinks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لینکی برای این مشتری یافت نشد</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {customerLinks.map((link) => {
                const paymentStatus = getPaymentStatus(link);
                return (
                  <div
                    key={link.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            مبلغ: {formatAmount(link.amount)} ریال ({formatAmount(Math.round(link.amount / 10))} تومان)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            link.isActive
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {link.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {paymentStatus === 'paid' ? '✅ پرداخت شده' : paymentStatus === 'pending' ? '⏳ در انتظار' : '❌ ناموفق'}
                          </span>
                        </div>
                        {link.description && (
                          <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          ایجاد شده: {formatPersianDateTime(link.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleToggleLink(link.id)}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            link.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {link.isActive ? 'غیرفعال' : 'فعال'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLink(link);
                            setIsDetailsModalOpen(true);
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          جزئیات
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PaymentLinks;

