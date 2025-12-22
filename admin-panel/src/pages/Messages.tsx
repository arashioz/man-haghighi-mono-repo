import React, { useEffect, useState } from 'react';
import { messagesService } from '../services/api';
import { Message } from '../types';

const Messages: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendSms, setSendSms] = useState(false);
  const [sendInApp, setSendInApp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const fetchMessages = async () => {
    setListLoading(true);
    try {
      const data = await messagesService.list();
      setMessages(data || []);
    } catch (error: any) {
      setToast({ type: 'error', text: error.response?.data?.message || 'خطا در دریافت پیام‌ها' });
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendSms && !sendInApp) {
      setToast({ type: 'error', text: 'حداقل یکی از گزینه‌های ارسال را انتخاب کنید.' });
      return;
    }
    setLoading(true);
    setToast(null);

    try {
      await messagesService.broadcast({
        title,
        body,
        sendSms,
        sendInApp,
      });
      setToast({ type: 'success', text: 'پیام با موفقیت ارسال شد.' });
      setTitle('');
      setBody('');
      fetchMessages();
    } catch (error: any) {
      setToast({ type: 'error', text: error.response?.data?.message || 'خطا در ارسال پیام' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ارسال پیام همگانی</h1>
            <p className="text-gray-600 mt-1 text-sm">ارسال پیام به همه کاربران از طریق پنل یا پیامک</p>
          </div>
          {toast && (
            <div
              className={`px-4 py-2 rounded-xl text-sm ${
                toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {toast.text}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="مثال: اطلاعیه جدید"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">متن پیام</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              required
              rows={5}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="متن پیام برای کاربران..."
            />
            <p className="text-xs text-gray-500 mt-1">حداکثر ۱۰۰۰ کاراکتر</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center space-x-2 space-x-reverse bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInApp}
                onChange={(e) => setSendInApp(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-gray-800 text-sm">ارسال درون پنلی (صندوق پیام کاربر)</span>
            </label>

            <label className="flex items-center space-x-2 space-x-reverse bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-gray-800 text-sm">ارسال پیامک به همه کاربران</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'در حال ارسال...' : 'ارسال پیام'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">سوابق پیام‌ها</h2>
          {listLoading && <span className="text-sm text-gray-500">در حال بارگذاری...</span>}
        </div>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">پیامی ثبت نشده است.</div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        message.status === 'SENT'
                          ? 'bg-green-50 text-green-700'
                          : message.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {message.status === 'SENT'
                        ? 'ارسال شد'
                        : message.status === 'FAILED'
                        ? 'خطا در ارسال'
                        : 'در انتظار'}
                    </span>
                    <p className="font-semibold text-gray-900">{message.title}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString('fa-IR')}
                  </p>
                </div>
                <p className="text-gray-700 text-sm mb-3 line-clamp-3">{message.body}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  <span>کل کاربران: {message.totalRecipients}</span>
                  <span>ارسال درون پنل: {message.inAppSentCount}</span>
                  <span>پیامک موفق: {message.smsSentCount}</span>
                  {message.smsFailedCount > 0 && (
                    <span className="text-red-600">پیامک ناموفق: {message.smsFailedCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

