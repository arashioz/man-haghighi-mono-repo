import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-sm sm:max-w-md',
    medium: 'max-w-md sm:max-w-2xl',
    large: 'max-w-lg sm:max-w-4xl',
    xl: 'max-w-xl sm:max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen pt-4 px-2 pb-20 text-center sm:block sm:p-0">
        {/* Mobile-friendly overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Mobile-first modal positioning */}
        <div className={`relative inline-block align-bottom bg-white rounded-t-2xl sm:rounded-lg text-right overflow-hidden shadow-xl transform transition-all w-full mx-2 sm:my-8 sm:align-middle ${sizeClasses[size]} sm:mx-0`}>
          {/* Mobile handle bar */}
          <div className="sm:hidden flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 flex-1 text-right mr-2 sm:mr-0">{title}</h3>
            </div>
            <div className="max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
