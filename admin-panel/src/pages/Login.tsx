import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types';
import { normalizePhoneNumber } from '../utils/phoneUtils';

const LOGIN_401_KEY = 'login_401_message';

function getBackendErrorMessage(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || 'ورود ناموفق';
  const msg = data.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  return data.error || err?.message || 'ورود ناموفق';
}

const Login: React.FC = () => {
  const [loginType, setLoginType] = useState<'admin' | 'sales' | 'seller'>('admin');
  const [credentials, setCredentials] = useState<LoginCredentials>({
    login: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowErrorModal(false);
    setErrorModalMessage('');

    try {
      // Normalize phone number if login input is a phone number (not admin)
      const normalizedCredentials = {
        ...credentials,
        login: loginType !== 'admin' && /^[\d۰-۹٠-٩+\s-]+$/.test(credentials.login)
          ? normalizePhoneNumber(credentials.login)
          : credentials.login,
      };
      console.log(normalizedCredentials)
      await login(normalizedCredentials);
      navigate('/dashboard');
    } catch (err: any) {
      console.log("err", err)
      setErrorModalMessage(getBackendErrorMessage(err));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorModalMessage('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ورود به پنل مدیریت
            </h1>
            <p className="text-gray-600">پلتفرم حقیقی</p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                type="button"
                onClick={() => setLoginType('admin')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginType === 'admin'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                مدیر
              </button>
              <button
                type="button"
                onClick={() => setLoginType('sales')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginType === 'sales'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                مدیر فروش
              </button>
              <button
                type="button"
                onClick={() => setLoginType('seller')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginType === 'seller'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                فروشنده
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                {loginType === 'admin' ? 'آدرس ایمیل' : 'شماره تلفن همراه'}
              </label>
              <input
                id="login"
                name="login"
                type={loginType === 'admin' ? 'email' : 'tel'}
                autoComplete={loginType === 'admin' ? 'email' : 'tel'}
                required
                value={credentials.login}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={
                  loginType === 'admin' 
                    ? 'admin@haghighi.com' 
                    : loginType === 'sales'
                    ? '09123456789'
                    : '09123456790'
                }
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                رمز عبور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="رمز عبور خود را وارد کنید"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال ورود...
                </div>
              ) : (
                'ورود'
              )}
            </button>
          </form>

          {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <strong>اطلاعات آزمایشی:</strong>
            </p>
            {loginType === 'admin' ? (
              <div className="text-sm text-gray-600">
                <p>ایمیل: admin@haghighi.com</p>
                <p>رمز عبور: admin123</p>
              </div>
            ) : loginType === 'sales' ? (
              <div className="text-sm text-gray-600">
                <p>شماره تلفن: 09123456789</p>
                <p>رمز عبور: sales123</p>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                <p>شماره تلفن: 09123456790</p>
                <p>رمز عبور: sales123</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              مدیران با ایمیل، بقیه با شماره تلفن وارد می‌شوند
            </p>
          </div> */}
        </div>
      </div>

      {/* مودال خطای بک‌اند */}
      {showErrorModal && errorModalMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-red-100">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="error-modal-title" className="text-lg font-semibold text-gray-900 mb-1">
                  خطا
                </h2>
                <p className="text-gray-700 text-right leading-relaxed">
                  {errorModalMessage}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={closeErrorModal}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;