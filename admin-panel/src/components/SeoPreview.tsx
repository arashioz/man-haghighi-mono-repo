import React from 'react';

interface SeoPreviewProps {
  title: string;
  description: string;
  slug: string;
  baseUrl?: string;
}

const SeoPreview: React.FC<SeoPreviewProps> = ({ 
  title, 
  description, 
  slug, 
  baseUrl = 'https://haghighi.com/articles/' 
}) => {
  const displayUrl = `${baseUrl}${slug}`.toLowerCase();
  const displayTitle = title || 'عنوان مقاله شما';
  const displayDescription = description || 'توضیحات متا برای مقاله شما. این متن در نتایج جستجوی گوگل نمایش داده می‌شود و باید جذاب و توصیفی باشد.';

  // محاسبه طول کاراکترها
  const titleLength = title.length;
  const descriptionLength = description.length;

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">پیش‌نمایش نتایج جستجو</h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
          </svg>
          <span className="text-sm font-medium text-gray-700">Google</span>
        </div>
      </div>

      {/* پیش‌نمایش نتیجه جستجو */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4" dir="rtl">
        <div className="text-blue-700 text-xl font-normal mb-1 hover:underline cursor-pointer">
          {displayTitle}
        </div>
        <div className="text-green-700 text-sm mb-2">
          {displayUrl}
        </div>
        <div className="text-gray-700 text-sm leading-relaxed">
          {displayDescription}
        </div>
      </div>

      {/* اطلاعات طول کاراکترها */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">طول عنوان</span>
            <span className={`text-sm font-bold ${
              titleLength === 0 ? 'text-red-600' :
              titleLength <= 60 ? 'text-green-600' : 
              titleLength <= 70 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {titleLength} / 60
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                titleLength === 0 ? 'bg-red-500' :
                titleLength <= 60 ? 'bg-green-500' : 
                titleLength <= 70 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${Math.min((titleLength / 60) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {titleLength === 0 ? '⚠️ عنوان خالی است' :
             titleLength <= 60 ? '✓ عالی! طول مناسب' : 
             titleLength <= 70 ? '⚠️ کمی طولانی است' : 
             '✗ خیلی طولانی است'}
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">طول توضیحات</span>
            <span className={`text-sm font-bold ${
              descriptionLength === 0 ? 'text-red-600' :
              descriptionLength >= 120 && descriptionLength <= 160 ? 'text-green-600' :
              descriptionLength <= 180 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {descriptionLength} / 160
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                descriptionLength === 0 ? 'bg-red-500' :
                descriptionLength >= 120 && descriptionLength <= 160 ? 'bg-green-500' :
                descriptionLength <= 180 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${Math.min((descriptionLength / 160) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {descriptionLength === 0 ? '⚠️ توضیحات خالی است' :
             descriptionLength >= 120 && descriptionLength <= 160 ? '✓ عالی! طول مناسب' :
             descriptionLength < 120 ? '⚠️ کمی کوتاه است' :
             descriptionLength <= 180 ? '⚠️ کمی طولانی است' : 
             '✗ خیلی طولانی است'}
          </p>
        </div>
      </div>

      {/* راهنمای سریع */}
      <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-indigo-600 mt-0.5 ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-xs text-gray-700">
            <p className="font-semibold mb-1">نکات SEO:</p>
            <ul className="space-y-1">
              <li>• عنوان: 50-60 کاراکتر (حداکثر 70)</li>
              <li>• توضیحات: 120-160 کاراکتر (حداکثر 180)</li>
              <li>• از کلمه کلیدی اصلی در عنوان و توضیحات استفاده کنید</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeoPreview;
