import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  fullScreen = true 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };

  const LoadingContent = () => (
    <div className="relative">
      {/* Glassmorphism Container */}
      <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-gradient"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Main Spinner */}
          <div className={`relative ${sizeClasses[size]}`}>
            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"></div>
            
            {/* Middle Ring */}
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 animate-spin-slow"></div>
            
            {/* Inner Ring */}
            <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-pink-500 border-r-blue-500 animate-spin-reverse"></div>
            
            {/* Center Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse"></div>
          </div>
          
          {/* Loading Text */}
          <div className="text-center">
            <p className="text-white font-semibold text-lg mb-2">در حال بارگذاری...</p>
            <div className="flex gap-1 justify-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-2 h-2 bg-blue-400/40 rounded-full animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-400/40 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-pink-400/40 rounded-full animate-float-slow"></div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
        {/* Semi-transparent Glass Background */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div>

        {/* Subtle Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <LoadingContent />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center min-h-96 ${className}`}>
      <LoadingContent />
    </div>
  );
};

export default LoadingSpinner;
