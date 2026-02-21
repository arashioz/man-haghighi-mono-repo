import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import MobileCard from '../components/MobileCard';
import { paymentsService } from '../services/api';

/** مبلغ فاکتور در API به تومان است؛ فقط فرمت نمایش */
const formatToman = (tomanAmount: number): string =>
  Number(tomanAmount).toLocaleString('fa-IR');

interface SalesPersonStats {
  salesPerson: {
    id: string;
    fullName: string;
    phone: string;
  };
  statistics: {
    totalLinks: number;
    paidLinks: number;
    unpaidLinks: number;
    totalRevenue: number;
    conversionRate: number;
    todayLinks: number;
    lastActivity: string | null;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
  description?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  paidAt?: string | null;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  salesPerson?: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  paymentLink?: { linkCode?: string } | null;
}

type TabType = 'courses' | 'payment-links' | 'salespersons';

const Invoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [courseInvoices, setCourseInvoices] = useState<{ data: Invoice[]; meta: any }>({ data: [], meta: {} });
  const [paymentLinkInvoices, setPaymentLinkInvoices] = useState<{ data: Invoice[]; meta: any }>({ data: [], meta: {} });
  const [salesPersonsStats, setSalesPersonsStats] = useState<{ salesPersons: SalesPersonStats[]; summary: any }>({ salesPersons: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('');
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>('');
  const [paymentLinkStatusFilter, setPaymentLinkStatusFilter] = useState<string>('');
  const [coursePage, setCoursePage] = useState(1);
  const [paymentLinkPage, setPaymentLinkPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const limit = 20;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseData, paymentLinkData, statsData] = await Promise.all([
        paymentsService.getAllCourseInvoices({
          page: coursePage,
          limit,
          status: courseStatusFilter || undefined,
        }),
        paymentsService.getPaymentLinkInvoices({
          page: paymentLinkPage,
          limit,
          status: paymentLinkStatusFilter || undefined,
          salesPersonId: selectedSalesPerson || undefined,
        }),
        paymentsService.getSalesPersonsPaymentStats()
      ]);

      setCourseInvoices(courseData);
      setPaymentLinkInvoices(paymentLinkData);
      setSalesPersonsStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [coursePage, paymentLinkPage, courseStatusFilter, paymentLinkStatusFilter, selectedSalesPerson]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID': return 'پرداخت شده';
      case 'PENDING': return 'در انتظار';
      case 'FAILED': return 'ناموفق';
      case 'CANCELLED': return 'لغو شده';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'COURSE_PURCHASE': return 'خرید دوره';
      case 'WALLET_CHARGE': return 'شارژ کیف پول';
      case 'PAYMENT_LINK': return 'لینک پرداخت';
      default: return type;
    }
  };

  const tabs = [
    { id: 'courses' as TabType, label: 'فاکتورهای دوره‌ها', count: courseInvoices.meta?.total || 0 },
    { id: 'payment-links' as TabType, label: 'فاکتورهای فروشندگان', count: paymentLinkInvoices.meta?.total || 0 },
    { id: 'salespersons' as TabType, label: 'آمار فروشندگان', count: salesPersonsStats.salesPersons?.length || 0 },
  ];

  const filteredPaymentLinkInvoices = paymentLinkInvoices.data;
  const handlePrintInvoice = () => {
    window.print();
    setSelectedInvoice(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="ios-fade-in">
      <PageHeader
        title="مدیریت فاکتورها"
        description="دسته‌بندی و رهگیری تراکنش‌های مالی. همه مبالغ به تومان هستند؛ درگاه پرداخت به ریال کار می‌کند."
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 mb-6">
        <div className="flex space-x-1 space-x-reverse">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2 space-x-reverse">
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">فاکتورهای دوره‌ها</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={courseStatusFilter}
                  onChange={(e) => { setCourseStatusFilter(e.target.value); setCoursePage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="PENDING">در انتظار</option>
                  <option value="PAID">پرداخت شده</option>
                  <option value="FAILED">ناموفق</option>
                  <option value="CANCELLED">لغو شده</option>
                </select>
                <span className="text-sm text-gray-500">
                  مجموع: {courseInvoices.meta?.total ?? 0} فاکتور
                </span>
              </div>
            </div>

            {courseInvoices.data.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                }
                title="فاکتور دوره‌ای یافت نشد"
                description="هنوز دوره‌ای خریداری نشده است"
              />
            ) : (
              <div className="space-y-4">
                {courseInvoices.data.map((invoice) => (
                  <MobileCard
                    key={invoice.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 space-x-reverse mb-2">
                          <div className="text-sm font-medium text-gray-900">
                            #{invoice.invoiceNumber}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <div>👤 {invoice.user?.firstName} {invoice.user?.lastName}</div>
                          <div>📱 {invoice.user?.phone}</div>
                        </div>

                        <div className="text-xs text-gray-500">
                          {new Date(invoice.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-lg font-bold text-gray-900">
                          {formatToman(invoice.amount)} تومان
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getTypeText(invoice.type)}
                        </div>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            )}
            {courseInvoices.meta?.totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={coursePage <= 1}
                  onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  قبلی
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {coursePage} از {courseInvoices.meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={coursePage >= (courseInvoices.meta?.totalPages ?? 1)}
                  onClick={() => setCoursePage(p => p + 1)}
                  className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  بعدی
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payment-links' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">فاکتورهای فروشندگان</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={paymentLinkStatusFilter}
                  onChange={(e) => { setPaymentLinkStatusFilter(e.target.value); setPaymentLinkPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="PENDING">در انتظار</option>
                  <option value="PAID">پرداخت شده</option>
                  <option value="FAILED">ناموفق</option>
                  <option value="CANCELLED">لغو شده</option>
                </select>
                <select
                  value={selectedSalesPerson}
                  onChange={(e) => { setSelectedSalesPerson(e.target.value); setPaymentLinkPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">همه فروشندگان</option>
                  {salesPersonsStats.salesPersons?.map((sp) => (
                    <option key={sp.salesPerson.id} value={sp.salesPerson.id}>
                      {sp.salesPerson.fullName}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">
                  مجموع: {paymentLinkInvoices.meta?.total ?? 0} فاکتور
                </span>
              </div>
            </div>

            {filteredPaymentLinkInvoices.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                }
                title="فاکتور فروشنده یافت نشد"
                description="هیچ لینکی توسط فروشندگان ایجاد نشده است"
              />
            ) : (
              <div className="space-y-4">
                {filteredPaymentLinkInvoices.map((invoice) => (
                  <MobileCard
                    key={invoice.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 space-x-reverse mb-2">
                          <div className="text-sm font-medium text-gray-900">
                            #{invoice.invoiceNumber}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <div>👤 {invoice.user?.firstName} {invoice.user?.lastName}</div>
                          <div>📱 {invoice.user?.phone}</div>
                          {invoice.salesPerson && (
                            <div className="text-purple-600">
                              👨‍💼 فروشنده: {invoice.salesPerson.fullName}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          {new Date(invoice.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-lg font-bold text-gray-900">
                          {formatToman(invoice.amount)} تومان
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getTypeText(invoice.type)}
                        </div>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            )}
            {paymentLinkInvoices.meta?.totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={paymentLinkPage <= 1}
                  onClick={() => setPaymentLinkPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  قبلی
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {paymentLinkPage} از {paymentLinkInvoices.meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={paymentLinkPage >= (paymentLinkInvoices.meta?.totalPages ?? 1)}
                  onClick={() => setPaymentLinkPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  بعدی
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'salespersons' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {salesPersonsStats.summary?.totalSalesPersons || 0}
              </div>
              <div className="text-sm text-blue-700">کل فروشندگان</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {salesPersonsStats.summary?.totalLinks || 0}
              </div>
              <div className="text-sm text-green-700">کل لینک‌ها</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {salesPersonsStats.summary?.totalPaidLinks || 0}
              </div>
              <div className="text-sm text-purple-700">پرداخت موفق</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {((salesPersonsStats.summary?.totalRevenue || 0) / 10).toLocaleString()} تومان
              </div>
              <div className="text-sm text-orange-700">مجموع درآمد</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">آمار فروشندگان</h3>

            {salesPersonsStats.salesPersons?.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                }
                title="فروشنده‌ای یافت نشد"
                description="هنوز فروشنده‌ای در سیستم ثبت نشده است"
              />
            ) : (
              <div className="space-y-4">
                {salesPersonsStats.salesPersons?.map((sp, index) => (
                  <MobileCard key={sp.salesPerson.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {sp.salesPerson.fullName}
                          </div>
                          <div className="text-sm text-gray-600">
                            📱 {sp.salesPerson.phone}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {sp.statistics.totalLinks}
                          </div>
                          <div className="text-xs text-gray-500">کل لینک</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {(sp.statistics.totalRevenue / 10).toLocaleString()} تومان
                          </div>
                          <div className="text-xs text-gray-500">درآمد</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-sm font-medium text-purple-600">
                          {sp.statistics.paidLinks}
                        </div>
                        <div className="text-xs text-gray-500">پرداخت موفق</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-orange-600">
                          {sp.statistics.conversionRate}%
                        </div>
                        <div className="text-xs text-gray-500">نرخ تبدیل</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-blue-600">
                          {sp.statistics.todayLinks}
                        </div>
                        <div className="text-xs text-gray-500">امروز</div>
                      </div>
                    </div>

                    {sp.statistics.lastActivity && (
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        آخرین فعالیت: {new Date(sp.statistics.lastActivity).toLocaleDateString('fa-IR')}
                      </div>
                    )}
                  </MobileCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* مودال جزئیات فاکتور */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">جزئیات فاکتور #{selectedInvoice.invoiceNumber}</h3>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="بستن"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div id="invoice-detail-print" className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">وضعیت:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusBadgeClass(selectedInvoice.status)}`}>
                  {getStatusText(selectedInvoice.status)}
                </span>
                <span className="text-gray-500">نوع:</span>
                <span>{getTypeText(selectedInvoice.type)}</span>
                <span className="text-gray-500">مبلغ (تومان):</span>
                <span className="font-bold">{formatToman(selectedInvoice.amount)} تومان</span>
                <span className="text-gray-500">تاریخ ایجاد:</span>
                <span>{new Date(selectedInvoice.createdAt).toLocaleDateString('fa-IR')}</span>
                {selectedInvoice.paidAt && (
                  <>
                    <span className="text-gray-500">تاریخ پرداخت:</span>
                    <span>{new Date(selectedInvoice.paidAt).toLocaleDateString('fa-IR')}</span>
                  </>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">مشتری</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p><span className="text-gray-500">نام:</span> {selectedInvoice.customerName || `${selectedInvoice.user?.firstName || ''} ${selectedInvoice.user?.lastName || ''}`.trim() || '-'}</p>
                  <p><span className="text-gray-500">موبایل:</span> {selectedInvoice.customerPhone || selectedInvoice.user?.phone || '-'}</p>
                  {selectedInvoice.user?.email && <p><span className="text-gray-500">ایمیل:</span> {selectedInvoice.user.email}</p>}
                </div>
              </div>
              {selectedInvoice.salesPerson && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">فروشنده</h4>
                  <p className="text-sm">{selectedInvoice.salesPerson.fullName} — {selectedInvoice.salesPerson.phone}</p>
                </div>
              )}
              {selectedInvoice.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">توضیحات</h4>
                  <p className="text-sm text-gray-600">{selectedInvoice.description}</p>
                </div>
              )}
              {selectedInvoice.paymentLink?.linkCode && (
                <p className="text-xs text-gray-500">کد لینک: {selectedInvoice.paymentLink.linkCode}</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { window.print(); setSelectedInvoice(null); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                چاپ فاکتور
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;

