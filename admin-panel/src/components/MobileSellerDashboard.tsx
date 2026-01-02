import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService, paymentsService, workshopsService } from '../services/api';
// import { usersService, paymentsService, workshopsService } from '../services/api'; // Mocked for demo
import MobileLayout from './MobileLayout';
import MobileCard from './MobileCard';
import MobileModal from './MobileModal';
import { MobileFormField, MobileInput, MobileButton } from './MobileForm';
import MobileTabNavigation from './MobileTabNavigation';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PaymentLink {
  id: string;
  customerPhone: string;
  customerName?: string;
  amount: number;
  description?: string;
  isPaid: boolean;
  createdAt: string;
  paidAt?: string;
}

interface WorkshopAccess {
  workshopId: string;
  workshopTitle: string;
  workshopDate: string;
  workshopPrice: number;
}

interface SellerStats {
  totalLinks: number;
  paidLinks: number;
  unpaidLinks: number;
  totalRevenue: number;
  todayRevenue: number;
  workshopCount: number;
}

type TabType = 'dashboard' | 'links' | 'workshops' | 'profile';

const MobileSellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopAccess[]>([]);
  const [isCreateLinkModalOpen, setIsCreateLinkModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);

  // Form states for creating payment link
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, linksResponse, workshopsResponse] = await Promise.all([
        usersService.getSellerStats(),
        paymentsService.getPaymentLinks(),
        workshopsService.getSalesPersonAccessible()
      ]);

      setStats(statsResponse);
      setPaymentLinks(linksResponse);
      setWorkshops(workshopsResponse.map(workshop => ({
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        workshopDate: workshop.date,
        workshopPrice: workshop.price,
      })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Pull to refresh functionality
  const { attachToElement, isRefreshing, pullDistance, canRefresh } = usePullToRefresh({
    onRefresh: fetchDashboardData,
    threshold: 80,
  });

  const handleCreatePaymentLink = async () => {
    if (!customerPhone || !amount) return;

    try {
      const paymentData: any = {
        customerMobile: customerPhone,
        amount: parseInt(amount),
      };

      if (customerName) paymentData.customerName = customerName;
      if (description) paymentData.description = description;

      await paymentsService.createPaymentLink(paymentData);

      // Reset form
      setCustomerPhone('');
      setCustomerName('');
      setAmount('');
      setDescription('');

      setIsCreateLinkModalOpen(false);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error creating payment link:', error);
    }
  };

  const getTabs = () => [
    {
      id: 'dashboard' as TabType,
      label: 'داشبورد',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      )
    },
    {
      id: 'links' as TabType,
      label: 'لینک‌ها',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      id: 'workshops' as TabType,
      label: 'کارگاه‌ها',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'profile' as TabType,
      label: 'پروفایل',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
          {user?.firstName?.[0] || user?.username?.[0] || 'F'}
        </div>
        <h2 className="text-xl font-bold text-gray-900">سلام {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">خوش آمدید به پنل فروشندگی</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <MobileCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalLinks}</div>
              <div className="text-sm text-blue-700">کل لینک‌ها</div>
            </div>
          </MobileCard>

          <MobileCard className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.paidLinks}</div>
              <div className="text-sm text-green-700">پرداخت شده</div>
            </div>
          </MobileCard>

          <MobileCard className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{(stats.totalRevenue / 10).toLocaleString('fa-IR')}</div>
              <div className="text-sm text-purple-700">مجموع درآمد</div>
            </div>
          </MobileCard>

          <MobileCard className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.workshopCount}</div>
              <div className="text-sm text-orange-700">کارگاه‌های فعال</div>
            </div>
          </MobileCard>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">عملیات سریع</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsCreateLinkModalOpen(true)}
            className="p-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors touch-manipulation"
          >
            <div className="flex flex-col items-center space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm">لینک جدید</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className="p-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors touch-manipulation"
          >
            <div className="flex flex-col items-center space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm">مشاهده لینک‌ها</span>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">فعالیت‌های اخیر</h3>
        {paymentLinks.slice(0, 3).length > 0 ? (
          paymentLinks.slice(0, 3).map((link) => (
            <MobileCard key={link.id} onClick={() => setSelectedLink(link)} className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{link.customerName || link.customerPhone}</div>
                  <div className="text-sm text-gray-600">{(link.amount / 10).toLocaleString('fa-IR')} تومان</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  link.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {link.isPaid ? 'پرداخت شده' : 'در انتظار'}
                </div>
              </div>
            </MobileCard>
          ))
        ) : (
          <MobileCard>
            <EmptyState
              icon={
                <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              title="فعالیتی یافت نشد"
              description="اولین لینک پرداخت خود را ایجاد کنید"
            />
          </MobileCard>
        )}
      </div>
    </div>
  );

  const renderLinksTab = () => (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">لینک‌های پرداخت</h3>
        <button
          onClick={() => setIsCreateLinkModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          لینک جدید
        </button>
      </div>

      {/* Links List */}
      {paymentLinks.length > 0 ? (
        paymentLinks.map((link) => (
          <MobileCard key={link.id} onClick={() => setSelectedLink(link)} className="cursor-pointer">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{link.customerName || link.customerPhone}</div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  link.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {link.isPaid ? '✓ پرداخت شده' : '⏳ در انتظار'}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>📱 {link.customerPhone}</div>
                <div>💰 {(link.amount / 10).toLocaleString('fa-IR')} تومان</div>
                {link.description && <div>📝 {link.description}</div>}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(link.createdAt).toLocaleDateString('fa-IR')}
                </div>
              </div>
            </div>
          </MobileCard>
        ))
      ) : (
        <MobileCard>
          <EmptyState
            icon={
              <svg className="h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="هیچ لینکی یافت نشد"
            description="اولین لینک پرداخت خود را ایجاد کنید"
          />
        </MobileCard>
      )}
    </div>
  );

  const renderWorkshopsTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">کارگاه‌های قابل دسترسی</h3>

      {workshops.length > 0 ? (
        workshops.map((workshop) => (
          <MobileCard key={workshop.workshopId}>
            <div className="space-y-2">
              <div className="font-medium text-gray-900">{workshop.workshopTitle}</div>
              <div className="text-sm text-gray-600">
                <div>📅 {workshop.workshopDate}</div>
                <div>💰 {(workshop.workshopPrice / 10).toLocaleString('fa-IR')} تومان</div>
              </div>
            </div>
          </MobileCard>
        ))
      ) : (
        <MobileCard>
          <EmptyState
            icon={
              <svg className="h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="کارگاهی یافت نشد"
            description="هیچ کارگاهی برای شما فعال نیست"
          />
        </MobileCard>
      )}
    </div>
  );

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          {user?.firstName?.[0] || user?.username?.[0] || 'F'}
        </div>
        <h3 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h3>
        <p className="text-gray-600">@{user?.username}</p>
      </div>

      <div className="space-y-4">
        <MobileCard>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">نام:</span>
              <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">نام کاربری:</span>
              <span className="font-medium">@{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">شماره موبایل:</span>
              <span className="font-medium">{user?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ایمیل:</span>
              <span className="font-medium">{user?.email || 'ثبت نشده'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">نقش:</span>
              <span className="font-medium">فروشنده</span>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardTab();
      case 'links':
        return renderLinksTab();
      case 'workshops':
        return renderWorkshopsTab();
      case 'profile':
        return renderProfileTab();
      default:
        return renderDashboardTab();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <MobileLayout title="داشبورد فروشنده">
        {/* Pull to Refresh Indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="absolute top-0 left-0 right-0 z-10 bg-blue-50 border-b border-blue-200"
            style={{
              transform: `translateY(${Math.max(-100, pullDistance - 60)}px)`,
              transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <div className="flex items-center justify-center py-3">
              {isRefreshing ? (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-blue-700">در حال بروزرسانی...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <svg
                    className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${canRefresh ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-sm text-blue-700">
                    {canRefresh ? 'رها کنید برای بروزرسانی' : 'بکشید برای بروزرسانی'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className="pb-20 relative overflow-hidden"
          ref={(el) => {
            if (el) attachToElement(el);
          }}
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0px)',
            transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {renderContent()}
        </div>
      </MobileLayout>

      {/* Mobile Tab Navigation with Swipe Support */}
      <MobileTabNavigation
        tabs={getTabs()}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        enableSwipe={true}
      />

      {/* Create Payment Link Modal */}
      <MobileModal
        isOpen={isCreateLinkModalOpen}
        onClose={() => setIsCreateLinkModalOpen(false)}
        title="ایجاد لینک پرداخت جدید"
      >
        <div className="space-y-4">
          <MobileFormField label="شماره موبایل مشتری" required>
            <MobileInput
              type="tel"
              placeholder="09123456789"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </MobileFormField>

          <MobileFormField label="نام مشتری (اختیاری)">
            <MobileInput
              type="text"
              placeholder="نام مشتری"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </MobileFormField>

          <MobileFormField label="مبلغ (تومان)" required>
            <MobileInput
              type="number"
              placeholder="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </MobileFormField>

          <MobileFormField label="توضیحات (اختیاری)">
            <MobileInput
              type="text"
              placeholder="توضیحات پرداخت"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </MobileFormField>

          <div className="flex gap-3 pt-4">
            <MobileButton
              variant="secondary"
              onClick={() => setIsCreateLinkModalOpen(false)}
              className="flex-1"
            >
              انصراف
            </MobileButton>
            <MobileButton
              variant="primary"
              onClick={handleCreatePaymentLink}
              className="flex-1"
              disabled={!customerPhone || !amount}
            >
              ایجاد لینک
            </MobileButton>
          </div>
        </div>
      </MobileModal>

      {/* Payment Link Details Modal */}
      {selectedLink && (
        <MobileModal
          isOpen={!!selectedLink}
          onClose={() => setSelectedLink(null)}
          title="جزئیات لینک پرداخت"
        >
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 ${
                selectedLink.isPaid
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {selectedLink.isPaid ? '✓' : '⏳'}
              </div>
              <div className="text-lg font-semibold">
                {selectedLink.customerName || selectedLink.customerPhone}
              </div>
              <div className={`text-sm font-medium ${
                selectedLink.isPaid ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {selectedLink.isPaid ? 'پرداخت شده' : 'در انتظار پرداخت'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">شماره موبایل:</span>
                <span className="font-medium">{selectedLink.customerPhone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">مبلغ:</span>
                <span className="font-medium">{(selectedLink.amount / 10).toLocaleString('fa-IR')} تومان</span>
              </div>
              {selectedLink.description && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">توضیحات:</span>
                  <span className="font-medium">{selectedLink.description}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">تاریخ ایجاد:</span>
                <span className="font-medium">
                  {new Date(selectedLink.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
              {selectedLink.isPaid && selectedLink.paidAt && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">تاریخ پرداخت:</span>
                  <span className="font-medium">
                    {new Date(selectedLink.paidAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </MobileModal>
      )}
    </>
  );
};

export default MobileSellerDashboard;
