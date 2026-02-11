import React from 'react';

interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  onClick,
  className = '',
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-gray-300 active:scale-[0.98]' : ''
      } ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

export default MobileCard;



