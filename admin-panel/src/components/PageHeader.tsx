import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** @deprecated Use description instead; kept for backward compatibility */
  subtitle?: string;
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, subtitle, action }) => {
  const secondaryText = description ?? subtitle;

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {secondaryText && (
          <p className="text-gray-600 mt-1">{secondaryText}</p>
        )}
      </div>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};

export default PageHeader;
