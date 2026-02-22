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
  const code = err?.code;

  // فقط وقتی پاسخ سرور نبود (خطای شبکه)
  if (!err?.response) {
    if (code === 'ECONNABORTED' || err?.message?.toLowerCase?.().includes('timeout')) {
      return 'اتصال به سرور طول کشید. اتصال اینترنت و در دسترس بودن سایت را بررسی کنید و دوباره تلاش کنید.';
    }
    if (code === 'ERR_NETWORK' || err?.message === 'Network Error') {
      return 'اتصال به سرور برقرار نشد. اگر اینترنت متصل است، احتمالاً سرور یا سرویس API در دسترس نیست؛ کمی بعد دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.';
    }
    if (code === 'ERR_CONNECTION_REFUSED' || code === 'ECONNREFUSED') {
      return 'سرور در دسترس نیست. در محیط توسعه از روشن بودن سرور API (بک‌اند) اطمینان حاصل کنید.';
    }
    return 'اتصال برقرار نشد. اتصال اینترنت و در دسترس بودن سایت را بررسی کنید و دوباره تلاش کنید.';
  }

  // وقتی پاسخ سرور هست ولی فیلد message نبود — فقط در این حالت متن پیش‌فرض
  if (status === 401) return 'کاربر ثبت نام نشده یا اطلاعات ورود اشتباه است.';
  if (status === 403) return 'دسترسی مجاز نیست.';
  if (status === 404) return 'سرویس در دسترس نیست.';
  if (status === 429) return 'درخواست زیاد. چند دقیقه دیگر تلاش کنید.';
  if (status >= 500) return 'مشکلی در سرور پیش آمده. کمی بعد دوباره تلاش کنید.';

  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
