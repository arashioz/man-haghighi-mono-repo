import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CONTACT_PHONE_DISPLAY = '021-91690112';
const CONTACT_PHONE_TEL = '+982191690112';

const navigationItems = [
  { label: 'خانه', path: '/' },
  { label: 'درباره ما', path: '/about' },
  { label: 'مقالات', path: '/articles' },
  { label: 'پادکست‌ها', path: '/podcasts' },
  { label: 'دوره‌ها', path: '/courses' },
  { label: 'تماس با ما', path: '/contact' },
];

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <footer className="mt-auto rounded-t-3xl border-t border-white/10 bg-[#0a0a0a] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src="/assets/logo-mane-haghighi-asli-1 (1).png"
              alt="لوگو حقیقی"
              className="h-14 w-auto object-contain"
            />
          </button>

          {/* Navigation Menu */}
          <nav className="flex flex-wrap items-center justify-center gap-3">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'text-yellow-400 bg-yellow-400/20 border border-yellow-400/30'
                    : 'text-white/60 hover:text-yellow-400 hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Phone */}
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="flex items-center gap-2 text-white/80 hover:text-yellow-400 transition-colors text-sm"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
              />
            </svg>
            <span>{CONTACT_PHONE_DISPLAY}</span>
          </a>

          {/* Social Icons and Enamad */}
          <div className="flex items-center gap-4">
            {/* Enamad */}
            <a
              referrerPolicy="origin"
              target="_blank"
              rel="noopener noreferrer"
              href="https://trustseal.enamad.ir/?id=289322&Code=mnYVFVE9oOFZ1OKLX5Zl"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                referrerPolicy="origin"
                src="https://trustseal.enamad.ir/logo.aspx?id=289322&Code=mnYVFVE9oOFZ1OKLX5Zl"
                alt="ای‌نماد"
                className="h-8 w-auto cursor-pointer"
              />
            </a>
            <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:border-yellow-400/50 hover:bg-yellow-400/10 transition-all cursor-pointer">
              {/* Placeholder for icon - replace with actual icon */}
              <svg 
                className="w-4 h-4 text-white/60" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:border-yellow-400/50 hover:bg-yellow-400/10 transition-all cursor-pointer">
              {/* Placeholder for icon - replace with actual icon */}
              <svg 
                className="w-4 h-4 text-white/60" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} من حقیقی. تمامی حقوق محفوظ است.
          </p>
          <p className="text-xs text-white/20 mt-1">
            نسخه ۱.۸.۱
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

