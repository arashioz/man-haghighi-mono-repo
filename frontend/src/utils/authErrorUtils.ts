/**
 * پیام خطا را از بک‌اند برمی‌گرداند؛ اول همیشه response.data.message چک می‌شود تا متن مستقیم بک‌اند نمایش داده شود.
 */
export function getAuthErrorMessage(err: any): string {
  const data = err?.response?.data;

  // همیشه اول پیام مستقیم بک‌اند (برای 400، 401 و غیره)
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
  if (status === 400) return 'درخواست نامعتبر. لطفاً اطلاعات را بررسی کنید.';
  if (status === 401) return 'کاربر ثبت‌نام نشده یا اطلاعات ورود اشتباه است.';
  if (status === 403) return 'دسترسی مجاز نیست.';
  if (status === 404) return 'سرویس در دسترس نیست.';
  if (status === 429) return 'درخواست زیاد. چند دقیقه دیگر تلاش کنید.';
  if (status >= 500) return 'مشکلی در سرور پیش آمده. کمی بعد دوباره تلاش کنید.';

  // اگر response رسیده ولی message نبود، از error یا message سرور استفاده کن
  if (data?.error && typeof data.error === 'string' && data.error.trim()) return data.error.trim();
  if (err?.message && typeof err.message === 'string' && err.message.trim() && err.message !== 'Network Error') return err.message.trim();
  console.log(err.response, data)
  if (!err?.response) return 'نام کاربری یا رمز عبور اشتباه میباشد';
  return 'کاربر ثبت نام نشده';
}
