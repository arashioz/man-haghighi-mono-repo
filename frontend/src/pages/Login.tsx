import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // For ADMIN login (email/username + password)
  const [adminLogin, setAdminLogin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.sendOtp(phone);
      setStep('otp');
      setCountdown(120); // 2 minutes countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ارسال کد تایید ناموفق');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyOtp(phone, otp);
      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'کد تایید نامعتبر است');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authLogin({
        login: adminLogin,
        password: adminPassword,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'ورود ناموفق');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');

    try {
      await authService.sendOtp(phone);
      setCountdown(120);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ارسال مجدد کد تایید ناموفق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ورود به حساب کاربری
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            یا{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              حساب جدید ایجاد کنید
            </button>
          </p>
          {!isAdminMode && (
            <p className="mt-2 text-center text-sm text-gray-500">
              <button
                onClick={() => setIsAdminMode(true)}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                ورود ادمین
              </button>
            </p>
          )}
        </div>

        {isAdminMode ? (
          // ADMIN Login Form
          <form className="mt-8 space-y-6" onSubmit={handleAdminLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="adminLogin" className="sr-only">
                  ایمیل یا نام کاربری
                </label>
                <input
                  id="adminLogin"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ایمیل یا نام کاربری"
                  value={adminLogin}
                  onChange={(e) => setAdminLogin(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="adminPassword" className="sr-only">
                  رمز عبور
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="رمز عبور"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'در حال ورود...' : 'ورود'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(false);
                  setError('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                بازگشت به ورود با کد تایید
              </button>
            </div>
          </form>
        ) : step === 'phone' ? (
          // Phone Number Step
          <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="phone" className="sr-only">
                شماره تلفن همراه
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                pattern="09\d{9}"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="09123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
              </button>
            </div>
          </form>
        ) : (
          // OTP Verification Step
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-2 text-center">
                کد تایید به شماره {phone} ارسال شد
              </p>
              <label htmlFor="otp" className="sr-only">
                کد تایید
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'در حال تایید...' : 'تایید و ورود'}
              </button>
            </div>

            <div className="text-center space-y-2">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  ارسال مجدد کد تایید در {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                >
                  ارسال مجدد کد تایید
                </button>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  تغییر شماره تلفن
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;