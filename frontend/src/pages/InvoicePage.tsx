import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { paymentsService } from '../services/api';

const InvoicePage: React.FC = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentLink = async () => {
      try {
        const response = await paymentsService.getPaymentLinkByCode(String(linkCode));
        setPaymentLink(response.paymentLink);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'لینک پرداخت نامعتبر است یا منقضی شده است');
        setLoading(false);
      }
    };

    if (linkCode) {
      fetchPaymentLink();
    }
  }, [linkCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-700">در حال بارگذاری اطلاعات...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">خطا</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex justify-center">
            <img src="/images/logo.png" alt="Logo" className="h-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">فاکتور پرداخت</h1>
              <p className="text-blue-100 mt-1">لینک پرداخت شماره: {paymentLink.linkCode}</p>
            </div>
            <div className="h-12 w-12">
              <img src="/images/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">اطلاعات مشتری</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">نام مشتری</p>
                  <p className="font-medium">{paymentLink.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">شماره موبایل</p>
                  <p className="font-medium">{paymentLink.customerPhone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">جزئیات فاکتور</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600">مبلغ قابل پرداخت</span>
                <span className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat('fa-IR').format(paymentLink.amount)} تومان
                </span>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600">توضیحات</span>
                <span className="font-medium">{paymentLink.description || 'فاکتور پرداخت لینک'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">تاریخ ایجاد</span>
                <span className="font-medium">
                  {new Date(paymentLink.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">وضعیت</h2>
            <div className="flex items-center">
              <div className={`px-4 py-2 rounded-full ${
                paymentLink.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <span className="font-medium">
                  {paymentLink.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              {paymentLink.expiresAt && (
                <span className="text-sm text-gray-500 mr-4">
                  منقضی می‌شود در {new Date(paymentLink.expiresAt).toLocaleDateString('fa-IR')}
                </span>
              )}
            </div>
          </div>

          <div className="mt-10">
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">روش پرداخت</h2>
              <p className="text-gray-600 mb-4">
                برای پرداخت این فاکتور، دکمه "پرداخت این مبلغ" را کلیک کنید تا به درگاه پرداخت امن منتقل شوید.
              </p>
              <div className="bg-blue-100 border border-blue-200 p-4 rounded-md text-sm text-blue-800 mb-4">
                <p className="font-medium mb-2">اطلاعات امنیتی:</p>
                <p>تمامی اطلاعات کارت شما در درگاه امن پرداخت رمزگذاری می‌شوند و از استانداردهای امنیتی PCI-DSS پیروی می‌کنند.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  window.location.href = `/api/payments/pay/${paymentLink.linkCode}`;
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center"
              >
                <span className="text-lg">پرداخت این مبلغ</span>
                <span className="ml-2 text-lg">→</span>
              </button>
              
              <button
                onClick={() => window.print()}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-sm hover:shadow transition duration-200"
              >
                چاپ فاکتور
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="font-semibold text-gray-700 mb-2">نیاز به کمک دارید؟</h3>
              <p className="text-sm text-gray-600">
                برای راهنمایی بیشتر با پشتیبانی ما تماس بگیرید
              </p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500">درگاه پرداخت امن</span>
              <div className="flex items-center ml-4">
                <img src="/images/ssl-badge.png" alt="SSL" className="h-6 mx-1" />
                <img src="/images/pci-badge.png" alt="PCI" className="h-6 mx-1" />
                <img src="/images/visa-badge.png" alt="Visa" className="h-6 mx-1" />
                <img src="/images/mastercard-badge.png" alt="Mastercard" className="h-6 mx-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
