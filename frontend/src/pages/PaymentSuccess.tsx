import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsService } from '../services/api';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('transactionId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionId) {
        setError('شناسه تراکنش یافت نشد');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await paymentsService.getTransactionById(transactionId);
        setTransaction(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'دریافت اطلاعات تراکنش ناموفق بود');
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [transactionId]);

  useEffect(() => {
    if (transaction) {
      const timer = setTimeout(() => navigate('/dashboard'), 5000);
      return () => clearTimeout(timer);
    }
  }, [transaction, navigate]);

  const formattedAmount = useMemo(() => {
    if (!transaction?.amount) return null;
    const amountNumber = typeof transaction.amount === 'string' ? Number(transaction.amount) : transaction.amount;
    if (Number.isNaN(amountNumber)) return null;
    return amountNumber.toLocaleString('fa-IR') + ' تومان';
  }, [transaction]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.15),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(99,102,241,0.12),transparent_30%)]" />
      <div className="relative w-full max-w-3xl">
        <div className="backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl border border-white/50 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-inner">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-emerald-700 font-semibold">پرداخت موفق</p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">پرداخت با موفقیت انجام شد</h1>
                <p className="text-sm text-gray-600 mt-1">به زودی به پنل کاربری هدایت می‌شوید</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">شناسه تراکنش</p>
              <p className="font-mono text-sm text-gray-800 break-all">{transactionId || '---'}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard
              label="مبلغ پرداخت"
              value={formattedAmount || '—'}
              highlight
            />
            <InfoCard
              label="وضعیت"
              value={transaction?.status === 'PAID' ? 'پرداخت شد' : transaction?.status || '—'}
              badgeColor="emerald"
            />
            <InfoCard
              label="دوره / توضیحات"
              value={transaction?.invoice?.course?.title || transaction?.description || '—'}
            />
            <InfoCard
              label="کد پیگیری بانکی"
              value={transaction?.saleReferenceId || '—'}
            />
            <InfoCard
              label="کد مرجع درگاه"
              value={transaction?.refId || '—'}
            />
            <InfoCard
              label="زمان"
              value={transaction?.createdAt ? new Date(transaction.createdAt).toLocaleString('fa-IR') : '—'}
            />
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-6 flex items-center gap-3 text-indigo-700 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              در حال دریافت اطلاعات تراکنش...
            </div>
          )}

          <div className="mt-8 flex flex-col md:flex-row gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              رفتن به پنل من
            </button>
            <button
              onClick={() => navigate('/courses')}
              className="flex-1 bg-white text-gray-800 py-3 rounded-2xl font-semibold border border-gray-200 hover:border-gray-300 shadow-sm"
            >
              مشاهده دوره‌ها
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">اگر هدایت نشدید، دکمه‌های بالا را بزنید.</p>
        </div>
      </div>
    </div>
  );
};

type InfoCardProps = {
  label: string;
  value: React.ReactNode;
  badgeColor?: 'emerald' | 'indigo' | 'gray';
  highlight?: boolean;
};

const InfoCard: React.FC<InfoCardProps> = ({ label, value, badgeColor = 'gray', highlight }) => {
  const badgeClasses = {
    emerald: 'bg-emerald-100 text-emerald-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    gray: 'bg-gray-100 text-gray-700',
  }[badgeColor];

  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 backdrop-blur p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className={`text-base font-semibold ${highlight ? 'text-emerald-700' : 'text-gray-900'}`}>
        {value}
      </div>
      {highlight && <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${badgeClasses}`}>پرداخت موفق</span>}
    </div>
  );
};

export default PaymentSuccess;

