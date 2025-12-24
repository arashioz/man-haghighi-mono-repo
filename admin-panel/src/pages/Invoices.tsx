import React, { useState, useEffect } from 'react';
import { paymentsService } from '../services/api';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await paymentsService.getAllInvoices();
      setInvoices(data);
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
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="ios-fade-in">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-2">مدیریت فاکتورها</h1>
          <p className="text-[17px] text-[#8E8E93]">مشاهده و رهگیری تراکنش‌های مالی</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

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
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    هیچ فاکتوری یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;

