import React, { useState, useEffect } from 'react';
import { paymentsService, usersService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatPersianDateTime } from '../utils/dateUtils';

// تابع تبدیل تاریخ به فارسی
const formatPersianDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatPersianTime = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

interface ReportItem {
  gatewayName: string;
  customerPhone: string;
  orderId: string;
  transactionDate: string;
  requestTime: string;
  amount: number;
  cardNumber: string;
  trackingNumber: string;
  status: string;
  description: string;
  salesPerson: string;
}

interface SalesPerson {
  id: string;
  firstName?: string;
  lastName?: string;
  username: string;
}

const PaymentReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    salesPersonId: '',
    status: '',
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchSalesPersons();
    }
  }, [user]);

  const fetchSalesPersons = async () => {
    try {
      const response = await usersService.getUsersByRole('SALES_PERSON');
      setSalesPersons(response);
    } catch (error) {
      console.error('Error fetching sales persons:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.salesPersonId) params.append('salesPersonId', filters.salesPersonId);
      if (filters.status) params.append('status', filters.status);

      const data = await paymentsService.getPaymentLinksReport(params.toString());
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.salesPersonId) params.append('salesPersonId', filters.salesPersonId);
      if (filters.status) params.append('status', filters.status);
      params.append('format', 'excel');

      // Create download link
      const link = document.createElement('a');
      link.href = `${process.env.REACT_APP_API_URL}/payments/reports/payment-links?${params.toString()}`;
      link.download = 'payment-links-report.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { label: 'در انتظار', color: 'bg-yellow-100 text-yellow-800' },
      'PAID': { label: 'پرداخت شده', color: 'bg-green-100 text-green-800' },
      'FAILED': { label: 'ناموفق', color: 'bg-red-100 text-red-800' },
      'CANCELLED': { label: 'لغو شده', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fa-IR') + ' تومان';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">گزارش‌گیری واریزی‌ها</h2>
          <p className="text-gray-600 mt-1">گزارش کامل تراکنش‌های لینک‌های پرداخت</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>}
            جستجو
          </button>
          <button
            onClick={() => {
              setFilters({
                startDate: '',
                endDate: '',
                salesPersonId: '',
                status: '',
              });
              fetchReports();
            }}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            گزارش کلی
          </button>
          <button
            onClick={exportToExcel}
            disabled={exporting || reports.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {exporting && <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            خروجی اکسل
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">فیلترها</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ شروع</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ پایان</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {user?.role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">کارشناس فروش</label>
              <select
                value={filters.salesPersonId}
                onChange={(e) => setFilters({...filters, salesPersonId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">همه کارشناسان</option>
                {salesPersons.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName} ({person.username})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">وضعیت</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="PENDING">در انتظار</option>
              <option value="PAID">پرداخت شده</option>
              <option value="FAILED">ناموفق</option>
              <option value="CANCELLED">لغو شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    بابت (درگاه)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شماره همراه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شماره درخواست
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ تراکنش
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    زمان درخواست
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مبلغ (تومان)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شماره کارت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شماره پیگیری
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کارشناس فروش
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.gatewayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {report.customerPhone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {report.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {formatPersianDate(report.transactionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {formatPersianTime(report.requestTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatAmount(report.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {report.cardNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {report.trackingNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.salesPerson}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">گزارشی یافت نشد</h3>
          <p className="mt-1 text-sm text-gray-500">
            فیلترهای خود را تنظیم کنید و جستجو را انجام دهید.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentReports;
