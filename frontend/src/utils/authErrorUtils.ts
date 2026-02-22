/**
 * استخراج پیام خطای قابل‌نمایش برای کاربر (لاگین/ثبت‌نام).
 * اول پیام سرور، بعد کد HTTP، و فقط در صورت نبود پاسخ → پیام اتصال/اینترنت.
 */
export function getAuthErrorMessage(err: any): string {
  const msg = err?.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }

  const status = err?.response?.status;
  const code = err?.code;

  if (status === 401) return 'کاربر ثبت نام نشده یا اطلاعات ورود اشتباه است.';
  if (status === 403) return 'دسترسی مجاز نیست.';
  if (status === 404) return 'سرویس در دسترس نیست.';
  if (status === 409) return 'این اطلاعات قبلاً ثبت شده است.';
  if (status === 429) return 'درخواست زیاد. چند دقیقه دیگر تلاش کنید.';
  if (status >= 500) return 'مشکلی در سرور پیش آمده. کمی بعد دوباره تلاش کنید.';

 

  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
