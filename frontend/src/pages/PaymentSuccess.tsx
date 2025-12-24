import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('transactionId');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">پرداخت با موفقیت انجام شد</h1>
        <p className="text-gray-600 mb-6">
          دوره مورد نظر فعال شد. اکنون می‌توانید از پنل کاربری به محتوای دوره دسترسی داشته باشید.
        </p>
        {transactionId && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm font-mono text-gray-500">
            شماره تراکنش: {transactionId}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            برو به داشبورد من
          </button>
          <button
            onClick={() => navigate('/courses')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            مشاهده سایر دوره‌ها
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

