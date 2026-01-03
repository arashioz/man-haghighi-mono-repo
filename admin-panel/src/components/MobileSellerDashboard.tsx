import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService, paymentsService, workshopsService, settingsService } from '../services/api';
// import { usersService, paymentsService, workshopsService, settingsService } from '../services/api'; // Mocked for demo
import MobileLayout from './MobileLayout';
import { formatAmountInToman, formatAmountInRial, parseTomanAmount } from '../utils/currencyUtils';
import MobileCard from './MobileCard';
import MobileModal from './MobileModal';
import { MobileFormField, MobileInput, MobileButton } from './MobileForm';
import MobileTabNavigation from './MobileTabNavigation';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

interface PaymentLink {
  id: string;
  linkCode: string;
  customerPhone: string;
  customerName?: string;
  amount: number;
  description?: string;
  isPaid: boolean;
  isActive: boolean;
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
  const [phoneError, setPhoneError] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '12345678', // Default password
  });
  const [customerErrors, setCustomerErrors] = useState<{[key: string]: string}>({});
  const [formattedAmount, setFormattedAmount] = useState('');
  const [toggleLinkLoading, setToggleLinkLoading] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const settingsData = await settingsService.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

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
    fetchSettings();
  }, [fetchDashboardData, fetchSettings]);


  const validatePersianText = (text: string): boolean => {
    // Allow Persian characters, spaces, and some special characters
    const persianRegex = /^[\u0600-\u06FF\s]+$/;
    return persianRegex.test(text) && !/[a-zA-Z0-9]/.test(text);
  };

  // Format amount with thousand separators
  const formatAmountInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('fa-IR');
  };

  // Handle amount input change
  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setAmount(numericValue);
    setFormattedAmount(formatAmountInput(numericValue));
  };

  const handlePhoneChange = async (phone: string) => {
    setCustomerPhone(phone);
    setPhoneError('');

    // Check phone format
    if (phone.length === 11) {
      if (!/^09[0-9]{9}$/.test(phone)) {
        setPhoneError('شماره موبایل باید با ۰۹ شروع شود');
        setCustomerName('');
        return;
      }

      try {
        setIsCheckingPhone(true);
        const response = await usersService.getUserByPhone(phone);
        setCustomerName(`${response.firstName} ${response.lastName}`.trim());
        setPhoneError('');
      } catch (error) {
        // User doesn't exist, open create customer modal
        setCustomerName('');
        setNewCustomerData(prev => ({ ...prev, phone }));
        setIsCreateCustomerModalOpen(true);
      } finally {
        setIsCheckingPhone(false);
      }
    } else if (phone.length > 0 && phone.length < 11) {
      setCustomerName('');
    }
  };

  const validateCustomerData = () => {
    const errors: {[key: string]: string} = {};

    if (!newCustomerData.firstName.trim()) {
      errors.firstName = 'نام الزامی است';
    } else if (!validatePersianText(newCustomerData.firstName)) {
      errors.firstName = 'نام باید فقط شامل حروف فارسی باشد';
    }

    if (!newCustomerData.lastName.trim()) {
      errors.lastName = 'نام خانوادگی الزامی است';
    } else if (!validatePersianText(newCustomerData.lastName)) {
      errors.lastName = 'نام خانوادگی باید فقط شامل حروف فارسی باشد';
    }

    setCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCustomer = async () => {
    if (!validateCustomerData()) return;

    try {
      await usersService.createCustomer({
        firstName: newCustomerData.firstName,
        lastName: newCustomerData.lastName,
        phone: newCustomerData.phone,
        password: newCustomerData.password,
        confirmPassword: newCustomerData.password,
        role: 'USER',
      });

      setCustomerName(`${newCustomerData.firstName} ${newCustomerData.lastName}`.trim());
      setIsCreateCustomerModalOpen(false);
      setNewCustomerData({
        firstName: '',
        lastName: '',
        phone: '',
        password: '12345678',
      });
      setCustomerErrors({});
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const handleToggleLink = async (linkId: string) => {
    setToggleLinkLoading(linkId);
    try {
      await paymentsService.togglePaymentLink(linkId);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error toggling link:', error);
    } finally {
      setToggleLinkLoading(null);
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!customerPhone || !amount) return;

    try {
      let amountInRial: number;
      try {
        amountInRial = parseTomanAmount(amount || '0');
      } catch (error) {
        console.error('Error parsing amount:', error);
        return;
      }

      const paymentData: any = {
        customerMobile: customerPhone,
        amount: amountInRial, // Amount in Rial for API
      };

      if (customerName) paymentData.customerName = customerName;
      if (description) paymentData.description = description;

      await paymentsService.createPaymentLink(paymentData);

      // Reset form
      setCustomerPhone('');
      setCustomerName('');
      setAmount('');
      setFormattedAmount('');
      setDescription('');
      setPhoneError('');

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
              <div className="text-2xl font-bold text-purple-600">{formatAmountInToman(stats.totalRevenue)}</div>
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
                  <div className="text-sm text-gray-600">{formatAmountInToman(link.amount)} تومان</div>
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
                  <div>💰 {formatAmountInToman(link.amount)} تومان</div>
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
        <div className="pb-20">
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
          <MobileFormField label="شماره موبایل مشتری" required error={phoneError}>
            <div className="relative">
              <MobileInput
                type="tel"
                placeholder="09123456789"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={phoneError ? 'border-red-300' : ''}
              />
              {isCheckingPhone && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            {customerName && !phoneError && (
              <div className="text-sm text-green-600 mt-1 flex items-center">
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                مشتری یافت شد: {customerName}
              </div>
            )}
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
              type="text"
              placeholder="۱۰۰,۰۰۰"
              value={formattedAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
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
          size="medium"
        >
          <div className="space-y-6">
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
                <span className="font-medium">{formatAmountInToman(selectedLink.amount)} تومان</span>
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

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  const linkUrl = `${window.location.origin}/pay/${selectedLink.linkCode}`;
                  navigator.clipboard.writeText(linkUrl);
                  // Show toast or feedback
                }}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">کپی لینک</span>
              </button>

              <button
                onClick={() => handleToggleLink(selectedLink.id)}
                disabled={toggleLinkLoading === selectedLink.id}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                  selectedLink.isActive
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                } disabled:opacity-50`}
              >
                {toggleLinkLoading === selectedLink.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent mb-1"></div>
                ) : (
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {selectedLink.isActive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                )}
                <span className="text-xs">{selectedLink.isActive ? 'غیرفعال' : 'فعال'}</span>
              </button>

              <button
                onClick={() => {
                  const linkUrl = `${window.location.origin}/pay/${selectedLink.linkCode}`;
                  const cleanPhone = selectedLink.customerPhone.startsWith('0') ? selectedLink.customerPhone.substring(1) : selectedLink.customerPhone;
                  const whatsappPhone = `98${cleanPhone}`;

                  let message = `سلام ${selectedLink.customerName || 'مشتری عزیز'}\nمبلغ پرداختی: ${formatAmountInToman(selectedLink.amount)} تومان (${formatAmountInRial(selectedLink.amount)} ریال)\nلینک پرداخت:\n${linkUrl}`;

                  // Use WhatsApp template if enabled
                  if (settings?.messageTemplateEnabled && settings?.whatsappTemplateText) {
                    message = settings.whatsappTemplateText
                      .replace(/\{name\}/g, selectedLink.customerName || 'مشتری عزیز')
                      .replace(/\{amount\}/g, formatAmountInToman(selectedLink.amount))
                      .replace(/\{link\}/g, linkUrl);
                  }

                  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                }}
                className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.742.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                </svg>
                <span className="text-xs">ارسال واتس‌اپ</span>
              </button>
            </div>

            {/* Additional spacing for mobile */}
            <div className="pb-4"></div>
          </div>
        </MobileModal>
      )}

      {/* Create Customer Modal */}
      <MobileModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => {
          setIsCreateCustomerModalOpen(false);
          setNewCustomerData({
            firstName: '',
            lastName: '',
            phone: '',
            password: '12345678',
          });
          setCustomerErrors({});
          setCustomerPhone('');
        }}
        title="افزودن مشتری جدید"
      >
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              این شماره موبایل در سیستم وجود ندارد. لطفاً اطلاعات مشتری را وارد کنید.
            </p>
          </div>

          <MobileFormField label="شماره موبایل" error={customerErrors.phone}>
            <MobileInput
              type="tel"
              value={newCustomerData.phone}
              readOnly
              className="bg-gray-50"
            />
          </MobileFormField>

          <MobileFormField label="نام" error={customerErrors.firstName} required>
            <MobileInput
              type="text"
              placeholder="نام (فقط حروف فارسی)"
              value={newCustomerData.firstName}
              onChange={(e) => {
                const value = e.target.value;
                if (validatePersianText(value) || value === '') {
                  setNewCustomerData(prev => ({ ...prev, firstName: value }));
                  if (customerErrors.firstName) {
                    setCustomerErrors(prev => ({ ...prev, firstName: '' }));
                  }
                }
              }}
            />
          </MobileFormField>

          <MobileFormField label="نام خانوادگی" error={customerErrors.lastName} required>
            <MobileInput
              type="text"
              placeholder="نام خانوادگی (فقط حروف فارسی)"
              value={newCustomerData.lastName}
              onChange={(e) => {
                const value = e.target.value;
                if (validatePersianText(value) || value === '') {
                  setNewCustomerData(prev => ({ ...prev, lastName: value }));
                  if (customerErrors.lastName) {
                    setCustomerErrors(prev => ({ ...prev, lastName: '' }));
                  }
                }
              }}
            />
          </MobileFormField>

          <div className="flex gap-3 pt-4">
            <MobileButton
              variant="secondary"
              onClick={() => {
                setIsCreateCustomerModalOpen(false);
                setNewCustomerData({
                  firstName: '',
                  lastName: '',
                  phone: '',
                  password: '12345678',
                });
                setCustomerErrors({});
                setCustomerPhone('');
              }}
              className="flex-1"
            >
              انصراف
            </MobileButton>
            <MobileButton
              variant="primary"
              onClick={handleCreateCustomer}
              className="flex-1"
              disabled={!newCustomerData.firstName.trim() || !newCustomerData.lastName.trim()}
            >
              ایجاد مشتری
            </MobileButton>
          </div>
        </div>
      </MobileModal>
    </>
  );
};

export default MobileSellerDashboard;
