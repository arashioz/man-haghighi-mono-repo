import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { settingsService } from '../services/api';

interface Settings {
  id: string;
  siteName?: string;
  siteDescription?: string;
  siteEmail?: string;
  sitePhone?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  smsEnabled?: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  emailEnabled?: boolean;
  emailProvider?: string;
  emailApiKey?: string;
  backupEnabled?: boolean;
  backupFrequency?: string;
  maxUploadSize?: number;
  allowedFileTypes?: string[];
}

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت تنظیمات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await settingsService.updateSettings(settings);
      setSuccess('تنظیمات با موفقیت ذخیره شد');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!settings) {
    return <div>خطا در بارگذاری تنظیمات</div>;
  }

  return (
    <div>
      <PageHeader 
        title="تنظیمات سیستم" 
        description="مدیریت تنظیمات کلی سیستم"
        action={
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            <SettingsIcon />
            <span className="mr-2">{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات عمومی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام سایت
              </label>
              <input
                type="text"
                value={settings.siteName || ''}
                onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ایمیل سایت
              </label>
              <input
                type="email"
                value={settings.siteEmail || ''}
                onChange={(e) => setSettings({...settings, siteEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شماره تلفن سایت
              </label>
              <input
                type="tel"
                value={settings.sitePhone || ''}
                onChange={(e) => setSettings({...settings, sitePhone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات سایت
            </label>
            <textarea
              value={settings.siteDescription || ''}
              onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">حالت تعمیرات</h2>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={settings.maintenanceMode || false}
              onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال کردن حالت تعمیرات
            </label>
          </div>
          {settings.maintenanceMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                پیام تعمیرات
              </label>
              <textarea
                value={settings.maintenanceMessage || ''}
                onChange={(e) => setSettings({...settings, maintenanceMessage: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="پیامی که در حالت تعمیرات نمایش داده می‌شود"
              />
            </div>
          )}
        </div>

        {/* SMS Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات پیامک</h2>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={settings.smsEnabled || false}
              onChange={(e) => setSettings({...settings, smsEnabled: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال کردن ارسال پیامک
            </label>
          </div>
          {settings.smsEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ارائه‌دهنده پیامک
                </label>
                <input
                  type="text"
                  value={settings.smsProvider || ''}
                  onChange={(e) => setSettings({...settings, smsProvider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثلاً: کاوه‌نگار"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  کلید API
                </label>
                <input
                  type="password"
                  value={settings.smsApiKey || ''}
                  onChange={(e) => setSettings({...settings, smsApiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="کلید API پیامک"
                />
              </div>
            </div>
          )}
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات ایمیل</h2>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={settings.emailEnabled || false}
              onChange={(e) => setSettings({...settings, emailEnabled: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال کردن ارسال ایمیل
            </label>
          </div>
          {settings.emailEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ارائه‌دهنده ایمیل
                </label>
                <input
                  type="text"
                  value={settings.emailProvider || ''}
                  onChange={(e) => setSettings({...settings, emailProvider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثلاً: SendGrid"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  کلید API
                </label>
                <input
                  type="password"
                  value={settings.emailApiKey || ''}
                  onChange={(e) => setSettings({...settings, emailApiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="کلید API ایمیل"
                />
              </div>
            </div>
          )}
        </div>

        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات پشتیبان‌گیری</h2>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={settings.backupEnabled || false}
              onChange={(e) => setSettings({...settings, backupEnabled: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال کردن پشتیبان‌گیری خودکار
            </label>
          </div>
          {settings.backupEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                فرکانس پشتیبان‌گیری
              </label>
              <select
                value={settings.backupFrequency || 'daily'}
                onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">ساعتی</option>
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </select>
            </div>
          )}
        </div>

        {/* Upload Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات آپلود</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              حداکثر حجم فایل (بایت)
            </label>
            <input
              type="number"
              value={settings.maxUploadSize || 104857600}
              onChange={(e) => setSettings({...settings, maxUploadSize: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              حجم فعلی: {settings.maxUploadSize ? formatFileSize(settings.maxUploadSize) : 'تعیین نشده'}
            </p>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              انواع فایل مجاز (با کاما جدا کنید)
            </label>
            <input
              type="text"
              value={settings.allowedFileTypes?.join(', ') || ''}
              onChange={(e) => setSettings({...settings, allowedFileTypes: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثلاً: image/jpeg, image/png, video/mp4"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 space-x-reverse pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;





