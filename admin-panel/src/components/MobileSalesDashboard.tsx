import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PaymentLinks from '../pages/PaymentLinks';
import SalesPersons from '../pages/SalesPersons';
import PaymentReports from '../pages/PaymentReports';

type TabType = 'payment-links' | 'sales-persons' | 'reports';

const MobileSalesDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('payment-links');

  const getTabs = () => {
    const baseTabs = [
      { id: 'payment-links' as TabType, label: 'لینک‌های پرداخت', icon: '💳' },
    ];

    if (user?.role === 'ADMIN') {
      return [
        ...baseTabs,
        { id: 'sales-persons' as TabType, label: 'فروشندگان', icon: '👥' },
        { id: 'reports' as TabType, label: 'گزارش‌ها', icon: '📊' },
      ];
    } else if (user?.role === 'SALES_MANAGER') {
      return [
        ...baseTabs,
        { id: 'reports' as TabType, label: 'گزارش‌ها', icon: '📊' },
      ];
    }

    return baseTabs;
  };

  const tabs = getTabs();

  const renderContent = () => {
    switch (activeTab) {
      case 'payment-links':
        return <PaymentLinks />;
      case 'sales-persons':
        return user?.role === 'ADMIN' ? <SalesPersons /> : null;
      case 'reports':
        return <PaymentReports />;
      default:
        return <PaymentLinks />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 text-center">داشبورد فروش</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          مدیریت لینک‌های پرداخت و فروشندگان
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 pb-20">
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileSalesDashboard;
