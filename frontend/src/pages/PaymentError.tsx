import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentError: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error') || 'خطای نامشخص در فرآیند پرداخت';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">پرداخت ناموفق بود</h1>
        <p className="text-gray-600 mb-8">{error}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            تلاش مجدد
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            تماس با پشتیبانی
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentError;

