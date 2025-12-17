import React, { useState } from 'react';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ isOpen }) => {
  const { user, setSession } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!newPassword) {
      setError('لطفاً پسورد جدید را وارد کنید');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('پسورد باید حداقل ۶ کاراکتر باشد');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('پسورد و تکرار پسورد مطابقت ندارند');
      setLoading(false);
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: '', // Not required when mustChangePassword is true
        newPassword: newPassword,
      });

      // Refresh user data to get updated mustChangePassword status
      const profile = await authService.getProfile();
      const token = localStorage.getItem('token');
      if (token) {
        setSession({
          user: profile,
          token: token,
        });
      }

      // Clear form
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در تغییر پسورد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            تغییر پسورد اجباری
          </h2>
          <p className="text-sm text-gray-600">
            برای امنیت حساب کاربری شما، لطفاً پسورد خود را تغییر دهید.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              پسورد جدید
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="پسورد جدید را وارد کنید"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              تکرار پسورد جدید
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="پسورد جدید را دوباره وارد کنید"
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'در حال تغییر...' : 'تغییر پسورد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;





