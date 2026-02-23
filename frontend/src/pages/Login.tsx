import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { getAuthErrorMessage } from '../utils/authErrorUtils';

const Login: React.FC = () => {
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const navigate = useNavigate();
  const { login: authLogin, setSession } = useAuth();

  useEffect(() => {
    try {
      const message = sessionStorage.getItem('login_401_message');
      sessionStorage.removeItem('login_401_message');
      if (message && message.trim()) {
        setError(message.trim());
        setShowErrorModal(true);
      }
    } catch (_) {}
  }, []);

  const setErrorAndShow = (msg: string | null) => {
    setError(msg);
    setShowErrorModal(!!msg);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAndShow(null);
    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      await authService.sendOtp(normalizedPhone);
      setStep('otp');
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
      setErrorAndShow(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAndShow(null);
    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const response = await authService.verifyOtp(normalizedPhone, otp);
      setSession(response);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorAndShow(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAndShow(null);
    setLoading(true);
    try {
      const normalizedLogin = /^[\d۰-۹٠-٩+\s-]+$/.test(loginInput)
        ? normalizePhoneNumber(loginInput)
        : loginInput;
      await authLogin({ login: normalizedLogin, password: loginPassword });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorAndShow(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErrorAndShow(null);
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
      setErrorAndShow(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputGlass =
    'w-full px-4 py-3 rounded-xl bg-gray-500/20 border border-gray-400/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-transparent backdrop-blur-sm transition-all';
  const btnPrimary =
    'w-full py-3.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25';
  const glassCard =
    'bg-gray-500/20 backdrop-blur-xl border border-gray-400/30 rounded-3xl shadow-2xl p-8';

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-black">
      {/* مودال خطا — مینیمال، متن مستقیم بک‌اند */}
      {showErrorModal && error && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
        >
          <div className="bg-gray-800/95 backdrop-blur border border-gray-600/50 rounded-2xl shadow-xl max-w-sm w-full p-5">
            <p id="error-modal-title" className="text-white text-right text-sm leading-relaxed mb-4">{error}</p>
            <button
              type="button"
              onClick={() => setErrorAndShow(null)}
              className={`w-full py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400`}
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className={glassCard}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              ورود به حساب کاربری
            </h1>
            <p className="mt-2 text-sm text-white/80">
              یا{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-violet-300 underline hover:no-underline"
              >
                حساب جدید ایجاد کنید
              </button>
            </p>
          </div>

          <div className="flex rounded-xl bg-gray-600/30 p-1 gap-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('otp'); setErrorAndShow(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'otp'
                  ? 'bg-gray-500/40 text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              ورود با کد تایید
            </button>
            <button
              type="button"
              onClick={() => { setMode('password'); setErrorAndShow(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'password'
                  ? 'bg-gray-500/40 text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              ورود با رمز عبور
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label htmlFor="login" className="sr-only">ایمیل یا تلفن همراه</label>
                <input
                  id="login"
                  type="text"
                  autoComplete="username"
                  required
                  className={inputGlass}
                  placeholder="ایمیل یا تلفن همراه"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">رمز عبور</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={inputGlass}
                  placeholder="رمز عبور"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    در حال ورود...
                  </span>
                ) : (
                  'ورود'
                )}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => setMode('otp')} className="text-sm text-white/80 hover:text-white hover:underline">
                  ورود با کد تایید
                </button>
              </div>
            </form>
          ) : step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="phone" className="sr-only">شماره تلفن همراه</label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className={inputGlass}
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    در حال ارسال...
                  </span>
                ) : (
                  'ارسال کد تایید'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-sm text-white/90 text-center">
                کد تایید به شماره {phone} ارسال شد
              </p>
              <div>
                <label htmlFor="otp" className="sr-only">کد تایید</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  className={`${inputGlass} text-center text-2xl tracking-[0.5em]`}
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className={btnPrimary}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    در حال تایید...
                  </span>
                ) : (
                  'تایید و ورود'
                )}
              </button>
              <div className="text-center space-y-2">
                {countdown > 0 ? (
                  <p className="text-sm text-white/70">
                    ارسال مجدد کد تا {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </p>
                ) : (
                  <button type="button" onClick={handleResendOtp} disabled={loading} className="text-sm text-violet-300 hover:underline disabled:opacity-50">
                    ارسال مجدد کد تایید
                  </button>
                )}
                <div>
                  <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="text-sm text-white/80 hover:text-white hover:underline">
                    تغییر شماره تلفن
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
