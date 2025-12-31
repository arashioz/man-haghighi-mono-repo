import React from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  onBack,
  actions
}) => {
  return (
    <div className="min-h-screen bg-gray-50 lg:hidden">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {showBackButton && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {actions}
          </div>
        </div>
      </header>

      {/* Mobile Content */}
      <main className="flex-1 p-4 pb-20">
        {children}
      </main>
    </div>
  );
};

export default MobileLayout;
