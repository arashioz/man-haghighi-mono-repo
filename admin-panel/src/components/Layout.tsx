import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
  </svg>
);

const PeopleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const SalesManagementIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const TeamIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SlideshowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
  </svg>
);

const ArticleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PodcastsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const SchoolIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);


const VideoLibraryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const LogsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const getMenuItems = (userRole: string) => {
  const baseItems = [
    { text: 'داشبورد', icon: <DashboardIcon />, path: '/dashboard' },
  ];

  if (userRole === 'ADMIN') {
    return [
      ...baseItems,
      { text: 'مدیریت کاربران', icon: <PeopleIcon />, path: '/users-management' },
      { text: 'مدیریت فروشندگان', icon: <SalesManagementIcon />, path: '/sales-management' },
      { text: 'کارگاه‌ها', icon: <SchoolIcon />, path: '/workshops' },
      { text: 'اسلایدرها', icon: <SlideshowIcon />, path: '/sliders' },
      { text: 'مقالات', icon: <ArticleIcon />, path: '/articles' },
      { text: 'پادکست‌ها', icon: <PodcastsIcon />, path: '/podcasts' },
      { text: 'دوره‌ها', icon: <SchoolIcon />, path: '/courses' },
      { text: 'ویدیو پادکست‌ها', icon: <VideoLibraryIcon />, path: '/video-podcasts' },
      { text: 'لاگ‌ها', icon: <LogsIcon />, path: '/logs' },
    ];
  } else if (userRole === 'SALES_MANAGER') {
    return [
      ...baseItems,
      { text: 'تیم من', icon: <TeamIcon />, path: '/my-team' },
      { text: 'فروشندگان', icon: <PeopleIcon />, path: '/sales-persons' },
      { text: 'کارگاه‌ها', icon: <SchoolIcon />, path: '/workshops' },
      { text: 'گزارش فروش', icon: <DashboardIcon />, path: '/sales-report' },
    ];
  } else if (userRole === 'SALES_PERSON') {
    return [
      ...baseItems,
      { text: 'کارگاه‌های من', icon: <SchoolIcon />, path: '/my-workshops' },
      { text: 'مشتریان من', icon: <PeopleIcon />, path: '/my-customers' },
      { text: 'گزارش فروش', icon: <DashboardIcon />, path: '/my-sales-report' },
    ];
  }

  return baseItems;
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const drawer = (
    <div className="h-full flex flex-col ios-fade-in">
      {/* Header با طراحی iOS */}
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-3xl flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">من حقیقی</h1>
        <p className="text-sm text-[#8E8E93]">
          {user?.role === 'ADMIN' ? 'پنل مدیریت' : 
           user?.role === 'SALES_MANAGER' ? 'پنل مدیر فروش' : 
           user?.role === 'SALES_PERSON' ? 'پنل فروشنده' : 'پنل کاربری'}
        </p>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 py-2 overflow-y-auto">
        <nav className="px-4">
          {getMenuItems(user?.role || 'USER').map((item) => (
            <button
              key={item.text}
              onClick={() => navigate(item.path)}
              className={`ios-nav-item w-full flex items-center px-4 py-3 mb-1.5 transition-all duration-200 ${
                location.pathname === item.path
                  ? 'active'
                  : 'text-gray-700'
              }`}
            >
              <span className={location.pathname === item.path ? 'text-white' : 'text-[#8E8E93]'}>
                {item.icon}
              </span>
              <span className={`text-[15px] mr-3 ${location.pathname === item.path ? 'font-medium' : ''}`}>
                {item.text}
              </span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* User Profile با طراحی iOS */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center p-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="w-11 h-11 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-full flex items-center justify-center text-white font-medium text-base ml-3 shadow-md">
            {user?.firstName?.[0] || user?.phone?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-[#8E8E93] flex items-center mt-0.5">
              <span className="w-2 h-2 bg-green-500 rounded-full ml-1.5"></span>
              {user?.role === 'ADMIN' ? 'مدیر' : 
               user?.role === 'SALES_MANAGER' ? 'مدیر فروش' : 
               user?.role === 'SALES_PERSON' ? 'فروشنده' : 'کاربر'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F2F2F7]">
      {/* Mobile Drawer با Blur Effect */}
      <div className="sm:hidden">
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={handleDrawerToggle}></div>
          <div className={`fixed right-0 top-0 h-full w-80 ios-sidebar transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {drawer}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar با iOS Style */}
      <div className="hidden sm:block w-80 flex-shrink-0">
        <div className="fixed right-0 top-0 h-screen w-80 ios-sidebar">
          {drawer}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen sm:mr-4">
        {/* Header با Blur Effect */}
        <header className="ios-header sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={handleDrawerToggle}
              className="sm:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            >
              <MenuIcon />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">پنل مدیریت</h1>
            <div className="relative">
              <button
                onClick={handleMenuOpen}
                className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-full flex items-center justify-center text-white font-medium text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg"
              >
                {user?.firstName?.[0] || user?.phone?.[0] || 'A'}
              </button>
              
              {/* Dropdown Menu با iOS Style */}
              {anchorEl && (
                <div className="absolute left-0 mt-3 w-52 ios-card py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-[#8E8E93] mt-0.5">
                      {user?.username}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors mt-1"
                  >
                    <LogoutIcon />
                    <span className="mr-2 font-medium">خروج از حساب</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="ios-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;