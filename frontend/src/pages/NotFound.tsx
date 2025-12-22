import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-3xl p-10 max-w-lg w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
          404
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">صفحه مورد نظر یافت نشد</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            آدرس وارد شده در دسترس نیست. شاید جابه‌جا شده باشد یا تایپ آن اشتباه است.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            بازگشت
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow transition"
          >
            صفحه اصلی
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

