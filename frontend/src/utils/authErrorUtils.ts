/**
 * پیام خطا را از بک‌اند برمی‌گرداند؛ فقط وقتی سرور پیامی نفرستاده از متن پیش‌فرض استفاده می‌شود.
 */
export function getAuthErrorMessage(err: any): string {
  const data = err?.response?.data;

  // پیام مستقیم از بک‌اند (همان چیزی که سرور برمی‌گرداند)
  const msg = data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }
  if (msg && typeof msg === 'object' && typeof msg.message === 'string' && msg.message.trim()) {
    return String(msg.message).trim();
  }
  if (typeof data === 'string' && data.trim()) return data.trim();

  const status = err?.response?.status;
  if (status === 401) return 'کاربر ثبت‌نام نشده یا اطلاعات ورود اشتباه است.';
  if (status === 403) return 'دسترسی مجاز نیست.';
  if (status === 404) return 'سرویس در دسترس نیست.';
  if (status === 429) return 'درخواست زیاد. چند دقیقه دیگر تلاش کنید.';
  if (status >= 500) return 'مشکلی در سرور پیش آمده. کمی بعد دوباره تلاش کنید.';

  if (err?.message && typeof err.message === 'string' && err.message.trim()) return err.message.trim();
  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
