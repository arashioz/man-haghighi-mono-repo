import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import MobileLayout from '../components/MobileLayout';
import MobileTabNavigation from '../components/MobileTabNavigation';
import PaymentLinks from './PaymentLinks';
import SalesPersons from './SalesPersons';
import PaymentReports from './PaymentReports';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'payment-links' | 'sales-persons' | 'reports';

const SalesDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('payment-links');

  const getTabs = () => {
    const baseTabs = [
    { id: 'payment-links' as TabType, label: 'لینک‌های پرداخت', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )},
    ];

    if (user?.role === 'ADMIN') {
      return [
        ...baseTabs,
    { id: 'sales-persons' as TabType, label: 'فروشندگان', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
        { id: 'reports' as TabType, label: 'گزارش‌گیری', icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )},
      ];
    } else if (user?.role === 'SALES_MANAGER') {
      return [
        ...baseTabs,
        { id: 'reports' as TabType, label: 'گزارش‌گیری', icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )},
      ];
    }

    return baseTabs;
  };

  const tabs = getTabs();

  const mobileTabs = tabs.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: React.cloneElement(tab.icon as React.ReactElement, {
      className: 'w-5 h-5'
    })
  }));

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div>
          <PageHeader
            title="داشبورد"
            description="مدیریت لینک‌های پرداخت و فروشندگان"
          />

          {/* تب‌ها - Desktop */}
          <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 space-x-reverse" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* محتوای تب‌ها */}
          <div className="tab-content">
            {activeTab === 'payment-links' && (
              <div>
                <PaymentLinks />
              </div>
            )}
            {activeTab === 'sales-persons' && user?.role === 'ADMIN' && (
              <div>
                <SalesPersons />
              </div>
            )}
            {activeTab === 'reports' && (
              <div>
                <PaymentReports />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileLayout title="داشبورد فروش">
          <div className="space-y-4">
            {activeTab === 'payment-links' && <PaymentLinks />}
            {activeTab === 'sales-persons' && user?.role === 'ADMIN' && <SalesPersons />}
            {activeTab === 'reports' && <PaymentReports />}
          </div>
        </MobileLayout>

        {/* Mobile Tab Navigation */}
        <MobileTabNavigation
          tabs={mobileTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </>
  );
};

export default SalesDashboard;

