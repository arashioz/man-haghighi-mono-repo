/**
 * پیام خطا را از بک‌اند برمی‌گرداند؛ فقط وقتی سرور پیامی نفرستاده از متن پیش‌فرض استفاده می‌شود.
 */
export function getAuthErrorMessage(err: any): string {
  const data = err?.response?.data;

  // پیام مستقیم از بک‌اند (همان چیزی که سرور برمی‌گرداند)
  const msg = data?.message;
  
  const status = err?.response?.status;
  const code = err?.code;
  return msg

  // if (status === 401) return 'کاربر ثبت نام نشده یا اطلاعات ورود اشتباه است.';
  // if (status === 403) return 'دسترسی مجاز نیست.';
  // if (status === 404) return 'سرویس در دسترس نیست.';
  // if (status === 429) return 'درخواست زیاد. چند دقیقه دیگر تلاش کنید.';
  // if (status >= 500) return 'مشکلی در سرور پیش آمده. کمی بعد دوباره تلاش کنید.';

  // return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
