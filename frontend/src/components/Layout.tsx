import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import AudioPlayerBar from './AudioPlayerBar';

interface LayoutProps {
  children: React.ReactNode;
  darkTheme?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, darkTheme = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentPodcast } = useAudioPlayer();

  const navigationItems = [
    { label: 'خانه', path: '/' },
    { label: 'درباره ما', path: '/about' },
    { label: 'مقالات', path: '/articles' },
    { label: 'پادکست‌ها', path: '/podcasts' },
    { label: 'دوره‌ها', path: '/courses' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsUserMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Check if version 2 is active by looking for the data attribute
  const [isVersion2, setIsVersion2] = useState(false);
  
  useEffect(() => {
    const checkVersion2 = () => {
      setIsVersion2(document.querySelector('[data-version2="true"]') !== null);
    };
    
    checkVersion2();
    const interval = setInterval(checkVersion2, 100);
    
    return () => clearInterval(interval);
  }, [location.pathname]);
  
  // Check if we're on a courses page
  const isCoursesPage = location.pathname.startsWith('/courses');
  
  const shouldUseDarkTheme = darkTheme || isVersion2 || isCoursesPage;

  return (
    <div className={`min-h-screen ${shouldUseDarkTheme ? 'bg-[#040404]' : 'bg-gray-50'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md rounded-b-2xl mx-4 mt-2 ${
        shouldUseDarkTheme 
          ? 'bg-black/60 border border-white/10' 
          : 'bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <button
                onClick={() => navigate('/')}
                className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
              >
                <img 
                  src="/assets/logo-mane-haghighi-asli-1 (1).png" 
                  alt="لوگو حقیقی" 
                  className="h-16 w-auto object-contain"
                />
              </button>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-8 md:flex md:space-x-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      shouldUseDarkTheme
                        ? isActive(item.path)
                          ? 'text-yellow-400 bg-yellow-400/20 border border-yellow-400/30 shadow-sm'
                          : 'text-white/80 hover:text-yellow-400 hover:bg-white/10 border border-transparent hover:border-white/20'
                        : isActive(item.path)
                          ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center space-x-2 transition-all duration-200 ${
                      shouldUseDarkTheme 
                        ? 'text-white/80 hover:text-yellow-400' 
                        : 'text-gray-700 hover:text-indigo-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      shouldUseDarkTheme ? 'bg-yellow-400' : 'bg-indigo-600'
                    }`}>
                      {user.firstName?.[0] || user.email?.[0] || 'U'}
                    </div>
                    <span className="hidden md:block">{user.firstName || user.username}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                      shouldUseDarkTheme 
                        ? 'bg-black/90 border border-white/10 backdrop-blur-md' 
                        : 'bg-white'
                    }`}>
                      <button
                        onClick={() => {
                          navigate('/dashboard');
                          setIsUserMenuOpen(false);
                        }}
                        className={`block px-4 py-2 text-sm w-full text-left transition-colors ${
                          shouldUseDarkTheme
                            ? 'text-white/80 hover:text-yellow-400 hover:bg-white/10'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        داشبورد
                      </button>
                      <button
                        onClick={handleLogout}
                        className={`block px-4 py-2 text-sm w-full text-left transition-colors ${
                          shouldUseDarkTheme
                            ? 'text-white/80 hover:text-yellow-400 hover:bg-white/10'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        خروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/login')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      shouldUseDarkTheme
                        ? 'text-white/80 hover:text-yellow-400 hover:bg-white/10 border border-transparent hover:border-white/20'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    ورود
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                      shouldUseDarkTheme
                        ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black hover:scale-105'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    ثبت نام
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden ml-4">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-2 transition-colors ${
                    shouldUseDarkTheme
                      ? 'text-white/80 hover:text-yellow-400'
                      : 'text-gray-700 hover:text-indigo-600'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className={`px-4 pt-2 pb-4 space-y-2 backdrop-blur-md rounded-b-2xl ${
              shouldUseDarkTheme 
                ? 'bg-black/60 border border-white/10' 
                : 'bg-white/80'
            }`}>
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMenuOpen(false);
                  }}
                  className={`block px-4 py-3 rounded-full text-base font-medium w-full text-right transition-all duration-200 ${
                    shouldUseDarkTheme
                      ? isActive(item.path)
                        ? 'text-yellow-400 bg-yellow-400/20 border border-yellow-400/30 shadow-sm'
                        : 'text-white/80 hover:text-yellow-400 hover:bg-white/10 border border-transparent hover:border-white/20'
                      : isActive(item.path)
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className={currentPodcast ? "pb-20" : ""}>{children}</main>

      {/* Audio Player Bar */}
      <AudioPlayerBar />

    </div>
  );
};

export default Layout;
