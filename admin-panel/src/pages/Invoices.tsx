import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { paymentsService } from '../services/api';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await paymentsService.getAllInvoices();
      // Backend returns { invoices, pagination }
      setInvoices(data.invoices || data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت فاکتورها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="ios-fade-in">
      <PageHeader 
        title="مدیریت فاکتورها"
        description="مشاهده و رهگیری تراکنش‌های مالی"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          title="هیچ فاکتوری یافت نشد"
          description="هنوز فاکتوری در سیستم ثبت نشده است"
        />
      ) : (
        <div className="ios-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#F2F2F7] border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">شماره فاکتور</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">کاربر</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">نوع</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">مبلغ (تومان)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">وضعیت</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y border-gray-50">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.user?.firstName} {invoice.user?.lastName}
                      <div className="text-xs text-gray-400 mt-0.5">{invoice.user?.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{getTypeText(invoice.type)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {Number(invoice.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;

