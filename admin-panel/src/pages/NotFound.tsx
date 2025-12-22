import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl">
          404
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">صفحه مورد نظر پیدا نشد</h1>
          <p className="text-gray-600">
            آدرسی که وارد کرده‌اید در دسترس نیست یا جابه‌جا شده است.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            بازگشت
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

