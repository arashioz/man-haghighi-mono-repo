# 🎨 Glass Loading Component - راهنمای استفاده

یک کامپوننت لودینگ خفن با افکت Glassmorphism و Blur که برای هر دو پروژه (Frontend و Admin Panel) پیاده‌سازی شده است.

## ✨ ویژگی‌ها

- ✅ افکت Glassmorphism (شیشه‌ای)
- ✅ Blur و Backdrop Filter
- ✅ انیمیشن‌های چندگانه و روان
- ✅ 3 حلقه اسپینر با سرعت‌های مختلف
- ✅ پارتیکل‌های شناور
- ✅ پس‌زمینه گرادیانت متحرک
- ✅ طراحی Responsive
- ✅ سایزهای مختلف (sm, md, lg)
- ✅ حالت تمام صفحه و inline

## 📦 نصب

کامپوننت‌ها و تنظیمات Tailwind از پیش نصب شده‌اند:

### فایل‌های ایجاد شده:
```
admin-panel/src/components/LoadingSpinner.tsx
frontend/src/components/LoadingSpinner.tsx
admin-panel/tailwind.config.js (به‌روزرسانی شده)
frontend/tailwind.config.js (به‌روزرسانی شده)
```

## 🚀 نحوه استفاده

### 1. Import کردن

```typescript
import LoadingSpinner from '../components/LoadingSpinner';
```

### 2. استفاده پایه (Full Screen)

```tsx
const MyComponent = () => {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <div>محتوای اصلی</div>;
};
```

### 3. استفاده با سایزهای مختلف

```tsx
// Small
<LoadingSpinner size="sm" />

// Medium (پیش‌فرض)
<LoadingSpinner size="md" />

// Large
<LoadingSpinner size="lg" />
```

### 4. حالت Inline (بدون تمام صفحه)

```tsx
<LoadingSpinner fullScreen={false} />
```

### 5. استفاده با className سفارشی

```tsx
<LoadingSpinner className="my-custom-class" />
```

## 📋 مثال‌های کامل

### مثال 1: صفحه با Loading

```tsx
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const CoursesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await coursesService.getAll();
        setCourses(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div>
      {courses.map(course => (
        <div key={course.id}>{course.title}</div>
      ))}
    </div>
  );
};
```

### مثال 2: Loading در قسمتی از صفحه

```tsx
const Dashboard: React.FC = () => {
  const [statsLoading, setStatsLoading] = useState(true);

  return (
    <div className="container">
      <h1>داشبورد</h1>
      
      <div className="stats-section">
        {statsLoading ? (
          <LoadingSpinner 
            size="md" 
            fullScreen={false}
            className="h-64"
          />
        ) : (
          <div>آمار و ارقام</div>
        )}
      </div>
    </div>
  );
};
```

### مثال 3: Loading با دکمه

```tsx
const SaveButton: React.FC = () => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.save();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'در حال ذخیره...' : 'ذخیره'}
      </button>
      
      {saving && <LoadingSpinner size="sm" fullScreen={false} />}
    </>
  );
};
```

## 🎨 انیمیشن‌های اضافه شده به Tailwind

انیمیشن‌های زیر به `tailwind.config.js` اضافه شده‌اند:

```javascript
animation: {
  'spin-slow': 'spin 3s linear infinite',
  'spin-reverse': 'spin-reverse 2s linear infinite',
  'gradient': 'gradient 3s ease infinite',
  'blob': 'blob 7s infinite',
  'float': 'float 3s ease-in-out infinite',
  'float-delayed': 'float 3s ease-in-out infinite 1s',
  'float-slow': 'float 4s ease-in-out infinite 0.5s',
}
```

## 🎭 Props

| Prop | Type | Default | توضیحات |
|------|------|---------|---------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | اندازه اسپینر |
| `fullScreen` | `boolean` | `true` | نمایش تمام صفحه یا inline |
| `className` | `string` | `''` | کلاس‌های CSS سفارشی |

## 🎨 سفارشی‌سازی رنگ‌ها

می‌توانید رنگ‌های گرادیانت را در کامپوننت تغییر دهید:

**Admin Panel:** از رنگ‌های `blue-purple-pink`
**Frontend:** از رنگ‌های `indigo-purple-pink`

برای تغییر، فایل `LoadingSpinner.tsx` را ویرایش کنید و رنگ‌های دلخواه را جایگزین کنید.

## 💡 نکات مهم

1. **Performance**: از `fullScreen={false}` برای Loading های کوچک استفاده کنید
2. **Accessibility**: کامپوننت به صورت خودکار از `backdrop-blur` استفاده می‌کند
3. **Mobile**: کاملاً Responsive و بهینه شده برای موبایل
4. **Dark Mode**: طراحی شده برای پس‌زمینه‌های تیره

## 🐛 رفع مشکلات

### انیمیشن‌ها کار نمی‌کنند
مطمئن شوید که `tailwind.config.js` به‌روزرسانی شده و سرور development را ریستارت کرده‌اید.

### افکت Blur نمایش داده نمی‌شود
برخی مرورگرها ممکن است `backdrop-filter` را پشتیبانی نکنند. از مرورگرهای جدید استفاده کنید.

## 📱 پشتیبانی مرورگر

- ✅ Chrome/Edge 76+
- ✅ Firefox 103+
- ✅ Safari 9+
- ✅ Opera 63+

---

**ساخته شده با ❤️ و Glassmorphism**



