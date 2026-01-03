import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService, paymentsService } from '../services/api';
// import { usersService, paymentsService, workshopsService } from '../services/api'; // Mocked for demo
import MobileLayout from './MobileLayout';
import MobileCard from './MobileCard';
import MobileModal from './MobileModal';
import { MobileFormField, MobileInput, MobileButton } from './MobileForm';
import MobileTabNavigation from './MobileTabNavigation';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface Seller {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email?: string;
  isActive: boolean;
  totalLinks: number;
  paidLinks: number;
  totalRevenue: number;
  lastActivity: string;
}

interface TeamStats {
  totalSellers: number;
  activeSellers: number;
  totalRevenue: number;
  todayRevenue: number;
  totalLinks: number;
  paidLinks: number;
  conversionRate: number;
}

interface PaymentLink {
  id: string;
  linkCode: string;
  customerPhone?: string;
  customerName?: string;
  amount: number;
  description?: string;
  status: string;
  sellerName: string;
  createdAt: string;
}

type TabType = 'overview' | 'team' | 'performance' | 'links' | 'settings';

const MobileSalesManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isCreateSellerModalOpen, setIsCreateSellerModalOpen] = useState(false);

  // Form states for creating seller
  const [newSellerData, setNewSellerData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    email: '',
    password: ''
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, sellersResponse, linksResponse] = await Promise.all([
        usersService.getManagerTeamStats(),
        usersService.getMySellers(),
        paymentsService.getTeamPaymentLinks()
      ]);

      setTeamStats(statsResponse);
      setSellers(sellersResponse);
      setPaymentLinks(linksResponse);
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
    threshold: 120,
    maxPullDistance: 180,
  });

  const handleCreateSeller = async () => {
    const { firstName, lastName, username, phone, password } = newSellerData;
    if (!firstName || !lastName || !username || !phone || !password) return;

    try {
      await usersService.create({
        firstName,
        lastName,
        username,
        phone,
        email: newSellerData.email || undefined,
        role: 'SALES_PERSON',
        parentId: user?.id
      });

      // Reset form
      setNewSellerData({
        firstName: '',
        lastName: '',
        username: '',
        phone: '',
        email: '',
        password: ''
      });

      setIsCreateSellerModalOpen(false);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error creating seller:', error);
    }
  };

  const getTabs = () => [
    {
      id: 'overview' as TabType,
      label: 'نمای کلی',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      )
    },
    {
      id: 'team' as TabType,
      label: 'تیم فروش',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'performance' as TabType,
      label: 'کارایی',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
      id: 'settings' as TabType,
      label: 'تنظیمات',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
          {user?.firstName?.[0] || user?.username?.[0] || 'M'}
        </div>
        <h2 className="text-xl font-bold text-gray-900">سلام {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">خوش آمدید به پنل مدیریت فروش</p>
      </div>

      {/* Team Stats Cards */}
      {teamStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MobileCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{teamStats.totalSellers}</div>
                <div className="text-sm text-blue-700">کل فروشندگان</div>
              </div>
            </MobileCard>

            <MobileCard className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{teamStats.activeSellers}</div>
                <div className="text-sm text-green-700">فروشندگان فعال</div>
              </div>
            </MobileCard>

            <MobileCard className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{(teamStats.totalRevenue / 10).toLocaleString('fa-IR')}</div>
                <div className="text-sm text-purple-700">مجموع درآمد تیم</div>
              </div>
            </MobileCard>

            <MobileCard className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{teamStats.conversionRate}%</div>
                <div className="text-sm text-orange-700">نرخ تبدیل</div>
              </div>
            </MobileCard>
          </div>

          {/* Today's Revenue Highlight */}
          <MobileCard className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <div className="text-center">
              <div className="text-lg font-bold">{(teamStats.todayRevenue / 10).toLocaleString('fa-IR')} تومان</div>
              <div className="text-sm opacity-90">درآمد امروز تیم</div>
            </div>
          </MobileCard>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">عملیات سریع</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsCreateSellerModalOpen(true)}
            className="p-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors touch-manipulation"
          >
            <div className="flex flex-col items-center space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm">فروشنده جدید</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className="p-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors touch-manipulation"
          >
            <div className="flex flex-col items-center space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm">مدیریت تیم</span>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Team Activity */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">فعالیت‌های اخیر تیم</h3>
        {paymentLinks.slice(0, 3).length > 0 ? (
          paymentLinks.slice(0, 3).map((link) => (
            <MobileCard key={link.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{link.customerName || link.customerPhone}</div>
                  <div className="text-sm text-gray-600">
                    توسط {link.sellerName} • {(link.amount / 10).toLocaleString('fa-IR')} تومان
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  link.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {link.status === 'PAID' ? 'پرداخت شده' : 'در انتظار'}
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
              description="تیم شما هنوز فعالیتی نداشته است"
            />
          </MobileCard>
        )}
      </div>
    </div>
  );

  const renderTeamTab = () => (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">تیم فروشندگان</h3>
        <button
          onClick={() => setIsCreateSellerModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          فروشنده جدید
        </button>
      </div>

      {/* Sellers List */}
      {sellers.length > 0 ? (
        sellers.map((seller) => (
          <MobileCard key={seller.id} onClick={() => {
            setSelectedSeller(seller);
            setIsSellerModalOpen(true);
          }} className="cursor-pointer">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold mr-3">
                    {seller.firstName?.[0] || seller.username?.[0] || 'S'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{seller.firstName} {seller.lastName}</h3>
                    <p className="text-sm text-gray-600">@{seller.username}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {seller.isActive ? 'فعال' : 'غیرفعال'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{seller.totalLinks}</div>
                  <div>کل لینک</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{seller.paidLinks}</div>
                  <div>پرداخت شده</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{(seller.totalRevenue / 10).toLocaleString('fa-IR')}</div>
                  <div>درآمد</div>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                آخرین فعالیت: {new Date(seller.lastActivity).toLocaleDateString('fa-IR')}
              </div>
            </div>
          </MobileCard>
        ))
      ) : (
        <MobileCard>
          <EmptyState
            icon={
              <svg className="h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="فروشنده‌ای یافت نشد"
            description="اولین فروشنده خود را اضافه کنید"
          />
        </MobileCard>
      )}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <h3 className="font-semibold text-gray-900">کارایی تیم</h3>

      {/* Performance Overview */}
      {teamStats && (
        <div className="space-y-4">
          <MobileCard>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">نرخ تبدیل کل:</span>
                <span className="font-semibold text-lg">{teamStats.conversionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(teamStats.conversionRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </MobileCard>

          <div className="grid grid-cols-2 gap-4">
            <MobileCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{teamStats.paidLinks}</div>
                <div className="text-sm text-gray-600">پرداخت موفق</div>
                <div className="text-xs text-gray-500 mt-1">
                  از {teamStats.totalLinks} لینک
                </div>
              </div>
            </MobileCard>

            <MobileCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{teamStats.totalLinks - teamStats.paidLinks}</div>
                <div className="text-sm text-gray-600">در انتظار پرداخت</div>
                <div className="text-xs text-gray-500 mt-1">
                  {teamStats.totalLinks > 0 ? Math.round(((teamStats.totalLinks - teamStats.paidLinks) / teamStats.totalLinks) * 100) : 0}% از کل
                </div>
              </div>
            </MobileCard>
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">بهترین فروشندگان</h4>
        {sellers
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 3)
          .map((seller, index) => (
            <MobileCard key={seller.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{seller.firstName} {seller.lastName}</div>
                    <div className="text-sm text-gray-600">{seller.paidLinks} پرداخت موفق</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-green-600">
                    {(seller.totalRevenue / 10).toLocaleString('fa-IR')}
                  </div>
                  <div className="text-xs text-gray-500">تومان</div>
                </div>
              </div>
            </MobileCard>
          ))
        }
      </div>
    </div>
  );

  const renderLinksTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">همه لینک‌های تیم</h3>

      {paymentLinks.length > 0 ? (
        paymentLinks.map((link) => (
          <MobileCard key={link.id}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{link.customerName || link.customerPhone}</div>
                  <div className="text-sm text-gray-600">توسط {link.sellerName}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  link.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {link.status === 'PAID' ? '✓ پرداخت شده' : '⏳ در انتظار'}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>📱 {link.customerPhone}</div>
                <div>💰 {(link.amount / 10).toLocaleString('fa-IR')} تومان</div>
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
            title="لینکی یافت نشد"
            description="تیم شما هنوز لینکی ایجاد نکرده است"
          />
        </MobileCard>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="font-semibold text-gray-900">تنظیمات مدیر فروش</h3>

      <MobileCard>
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              {user?.firstName?.[0] || user?.username?.[0] || 'M'}
            </div>
            <h4 className="font-semibold">{user?.firstName} {user?.lastName}</h4>
            <p className="text-sm text-gray-600">مدیر فروش</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">نام کاربری:</span>
              <span className="font-medium">@{user?.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">شماره موبایل:</span>
              <span className="font-medium">{user?.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">ایمیل:</span>
              <span className="font-medium">{user?.email || 'ثبت نشده'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">نقش:</span>
              <span className="font-medium">مدیر فروش</span>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Settings Actions */}
      <div className="space-y-3">
        <MobileCard onClick={() => {}} className="cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-600 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-medium">تغییر رمز عبور</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </MobileCard>

        <MobileCard onClick={() => {}} className="cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-600 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">تنظیمات اعلان‌ها</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </MobileCard>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'team':
        return renderTeamTab();
      case 'performance':
        return renderPerformanceTab();
      case 'links':
        return renderLinksTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <MobileLayout title="داشبورد مدیر فروش">
        {/* Pull to Refresh Indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="absolute top-0 left-0 right-0 z-10 bg-purple-50 border-b border-purple-200"
            style={{
              transform: `translateY(${Math.max(-100, pullDistance - 60)}px)`,
              transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <div className="flex items-center justify-center py-3">
              {isRefreshing ? (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-purple-700">در حال بروزرسانی...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <svg
                    className={`h-4 w-4 text-purple-600 transition-transform duration-200 ${canRefresh ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-sm text-purple-700">
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

      {/* Create Seller Modal */}
      <MobileModal
        isOpen={isCreateSellerModalOpen}
        onClose={() => setIsCreateSellerModalOpen(false)}
        title="افزودن فروشنده جدید"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MobileFormField label="نام" required>
              <MobileInput
                type="text"
                placeholder="نام"
                value={newSellerData.firstName}
                onChange={(e) => setNewSellerData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </MobileFormField>
            <MobileFormField label="نام خانوادگی" required>
              <MobileInput
                type="text"
                placeholder="نام خانوادگی"
                value={newSellerData.lastName}
                onChange={(e) => setNewSellerData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </MobileFormField>
          </div>

          <MobileFormField label="نام کاربری" required>
            <MobileInput
              type="text"
              placeholder="username"
              value={newSellerData.username}
              onChange={(e) => setNewSellerData(prev => ({ ...prev, username: e.target.value }))}
            />
          </MobileFormField>

          <MobileFormField label="شماره موبایل" required>
            <MobileInput
              type="tel"
              placeholder="09123456789"
              value={newSellerData.phone}
              onChange={(e) => setNewSellerData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </MobileFormField>

          <MobileFormField label="ایمیل (اختیاری)">
            <MobileInput
              type="email"
              placeholder="email@example.com"
              value={newSellerData.email}
              onChange={(e) => setNewSellerData(prev => ({ ...prev, email: e.target.value }))}
            />
          </MobileFormField>

          <MobileFormField label="رمز عبور" required>
            <MobileInput
              type="password"
              placeholder="رمز عبور"
              value={newSellerData.password}
              onChange={(e) => setNewSellerData(prev => ({ ...prev, password: e.target.value }))}
            />
          </MobileFormField>

          <div className="flex gap-3 pt-4">
            <MobileButton
              variant="secondary"
              onClick={() => setIsCreateSellerModalOpen(false)}
              className="flex-1"
            >
              انصراف
            </MobileButton>
            <MobileButton
              variant="primary"
              onClick={handleCreateSeller}
              className="flex-1"
              disabled={!newSellerData.firstName || !newSellerData.lastName || !newSellerData.username || !newSellerData.phone || !newSellerData.password}
            >
              ایجاد فروشنده
            </MobileButton>
          </div>
        </div>
      </MobileModal>

      {/* Seller Details Modal */}
      {selectedSeller && (
        <MobileModal
          isOpen={isSellerModalOpen}
          onClose={() => {
            setIsSellerModalOpen(false);
            setSelectedSeller(null);
          }}
          title="جزئیات فروشنده"
        >
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {selectedSeller.firstName?.[0] || selectedSeller.username?.[0] || 'S'}
              </div>
              <div className="text-lg font-semibold">
                {selectedSeller.firstName} {selectedSeller.lastName}
              </div>
              <div className="text-sm text-gray-600">@{selectedSeller.username}</div>
              <div className={`text-sm font-medium mt-2 ${
                selectedSeller.isActive ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedSeller.isActive ? 'فروشنده فعال' : 'فروشنده غیرفعال'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">شماره موبایل:</span>
                <span className="font-medium">{selectedSeller.phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ایمیل:</span>
                <span className="font-medium">{selectedSeller.email || 'ثبت نشده'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">کل لینک‌ها:</span>
                <span className="font-medium">{selectedSeller.totalLinks}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">پرداخت موفق:</span>
                <span className="font-medium text-green-600">{selectedSeller.paidLinks}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">مجموع درآمد:</span>
                <span className="font-medium text-purple-600">
                  {(selectedSeller.totalRevenue / 10).toLocaleString('fa-IR')} تومان
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">آخرین فعالیت:</span>
                <span className="font-medium text-sm">
                  {new Date(selectedSeller.lastActivity).toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <MobileButton variant="secondary" className="flex-1">
                ویرایش
              </MobileButton>
              <MobileButton
                variant={selectedSeller.isActive ? "danger" : "primary"}
                className="flex-1"
              >
                {selectedSeller.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
              </MobileButton>
            </div>
          </div>
        </MobileModal>
      )}
    </>
  );
};

export default MobileSalesManagerDashboard;
