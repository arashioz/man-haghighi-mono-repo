import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import { normalizePhoneNumber } from '../utils/phoneUtils';

const getErrorMessage = (err: any): string => {
  const msg = err?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg[0] || 'خطایی رخ داد.';
  return err?.message || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
};

const deviceTypeLabel: Record<string, string> = {
  ANDROID: 'اندروید',
  IOS: 'آی‌او‌اس',
  DESKTOP: 'دسکتاپ',
};

const Login: React.FC = () => {
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [loggedElsewhereModal, setLoggedElsewhereModal] = useState<{ deviceType: string } | null>(null);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin, setSession } = useAuth();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      await authService.sendOtp(normalizedPhone);
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
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggedElsewhereModal(null);
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const response = await authService.verifyOtp(normalizedPhone, otp);
      setSession(response);
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.code === 'LOGGED_IN_ELSEWHERE') {
        setLoggedElsewhereModal({ deviceType: err.response.data.deviceType || 'DESKTOP' });
        setError(null);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggedElsewhereModal(null);
    setLoading(true);

    try {
      const normalizedLogin = /^[\d۰-۹٠-٩+\s-]+$/.test(loginInput)
        ? normalizePhoneNumber(loginInput)
        : loginInput;

      await authLogin({
        login: normalizedLogin,
        password: loginPassword,
      });
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.code === 'LOGGED_IN_ELSEWHERE') {
        setLoggedElsewhereModal({ deviceType: err.response.data.deviceType || 'DESKTOP' });
        setError(null);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogoutAll = async () => {
    setForceLogoutLoading(true);
    setError(null);
    try {
      if (mode === 'password') {
        const normalizedLogin = /^[\d۰-۹٠-٩+\s-]+$/.test(loginInput)
          ? normalizePhoneNumber(loginInput)
          : loginInput;
        await authService.forceLogoutAll({ login: normalizedLogin, password: loginPassword });
      } else {
        const normalizedPhone = normalizePhoneNumber(phone);
        await authService.forceLogoutAll({ phone: normalizedPhone, otp });
      }
      setLoggedElsewhereModal(null);
      if (mode === 'password') {
        const normalizedLogin = /^[\d۰-۹٠-٩+\s-]+$/.test(loginInput)
          ? normalizePhoneNumber(loginInput)
          : loginInput;
        await authLogin({ login: normalizedLogin, password: loginPassword });
        navigate('/dashboard');
      } else {
        const normalizedPhone = normalizePhoneNumber(phone);
        const response = await authService.verifyOtp(normalizedPhone, otp);
        setSession(response);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setForceLogoutLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError(null);
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      await authService.sendOtp(normalizedPhone);
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
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* مودال ورود از دستگاه دیگر */}
      {loggedElsewhereModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <p className="text-gray-800 mb-4">
              شما با دستگاه دیگری ({deviceTypeLabel[loggedElsewhereModal.deviceType] || loggedElsewhereModal.deviceType}) وارد شده‌اید.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              برای ورود از این دستگاه، ابتدا از همه دستگاه‌ها خارج شوید.
            </p>
            <button
              type="button"
              onClick={handleForceLogoutAll}
              disabled={forceLogoutLoading}
              className="w-full py-2.5 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {forceLogoutLoading ? 'در حال انجام...' : 'خروج از همه دستگاه‌ها'}
            </button>
            <button
              type="button"
              onClick={() => setLoggedElsewhereModal(null)}
              disabled={forceLogoutLoading}
              className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

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
          <div className="mt-4 flex justify-center space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={() => {
                setMode('otp');
                setError(null);
              }}
              className={`px-3 py-1 text-sm rounded-md border ${mode === 'otp' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'border-gray-200 text-gray-600'}`}
            >
              ورود با کد تایید
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setError(null);
              }}
              className={`px-3 py-1 text-sm rounded-md border ${mode === 'password' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'border-gray-200 text-gray-600'}`}
            >
              ورود با رمز عبور
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-right" role="alert">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {mode === 'password' ? (
          // Password Login Form
          <form className="mt-8 space-y-6" onSubmit={handlePasswordLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="login" className="sr-only">
                  ایمیل یا نام کاربری
                </label>
                <input
                  id="login"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ایمیل یا نام کاربری"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  رمز عبور
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="رمز عبور"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? 'در حال ورود...' : 'ورود'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('otp');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                ورود با کد تایید
              </button>
            </div>
          </form>
        ) : step === 'phone' ? (
          // Phone Number Step
          <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
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
                className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
              </button>
            </div>
          </form>
        ) : (
          // OTP Verification Step
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
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
                className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
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