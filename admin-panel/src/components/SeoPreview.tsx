import React from 'react';

interface SeoPreviewProps {
  title: string;
  metaDescription: string;
  slug: string;
  baseUrl?: string;
}

const SeoPreview: React.FC<SeoPreviewProps> = ({ 
  title, 
  metaDescription, 
  slug, 
  baseUrl = 'http://185.231.112.84:8081' 
}) => {
  const displayUrl = `${baseUrl}/articles/${slug}`;
  const truncatedTitle = title.length > 60 ? title.substring(0, 60) + '...' : title;
  const truncatedDescription = metaDescription.length > 160 
    ? metaDescription.substring(0, 160) + '...' 
    : metaDescription;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        پیش‌نمایش در گوگل
      </h3>
      
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        {/* Google Search Result Preview */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-gray-600 mb-1">
            <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 10a2 2 0 114 0 2 2 0 01-4 0z" />
            </svg>
            <span className="truncate">{displayUrl}</span>
          </div>
          
          <div className="text-blue-800 text-xl hover:underline cursor-pointer mb-1">
            {truncatedTitle || 'عنوان مقاله'}
          </div>
          
          <div className="text-sm text-gray-600 leading-relaxed">
            {truncatedDescription || 'توضیحات متا مقاله در اینجا نمایش داده می‌شود...'}
          </div>
        </div>
      </div>

      {/* SEO Score Indicators */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">طول عنوان:</span>
          <span className={`font-medium ${
            title.length >= 30 && title.length <= 60 
              ? 'text-green-600' 
              : 'text-orange-600'
          }`}>
            {title.length} / 60 کاراکتر
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">طول توضیحات:</span>
          <span className={`font-medium ${
            metaDescription.length >= 120 && metaDescription.length <= 160 
              ? 'text-green-600' 
              : 'text-orange-600'
          }`}>
            {metaDescription.length} / 160 کاراکتر
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">طول URL:</span>
          <span className={`font-medium ${
            slug.length <= 50 
              ? 'text-green-600' 
              : 'text-orange-600'
          }`}>
            {slug.length} کاراکتر
          </span>
        </div>
      </div>
    </div>
  );
};

export default SeoPreview;

