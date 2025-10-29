# 🍎 Admin Panel - iOS 16 Design System

طراحی حرفه‌ای Admin Panel با الهام از iOS 16 Apple

## ✨ ویژگی‌های طراحی

### 🎨 رنگ‌بندی iOS
```css
--ios-blue: #007AFF        /* آبی اصلی iOS */
--ios-blue-dark: #0051D5   /* آبی تیره */
--ios-blue-light: #5AC8FA  /* آبی روشن */
--ios-gray: #8E8E93        /* خاکستری متن */
--ios-gray-light: #F2F2F7  /* خاکستری پس‌زمینه */
--ios-bg: #F2F2F7          /* پس‌زمینه اصلی */
```

### 🎯 المان‌های طراحی

#### 1. Sidebar (منوی کناری)
- **Blur Effect**: Backdrop filter با شفافیت 95%
- **Floating Style**: Border و Shadow ملایم
- **Rounded Corners**: 20-28px
- **Gradient Icon**: از آبی به آبی روشن
- **Active State**: پس‌زمینه آبی با Shadow

#### 2. Cards (کارت‌ها)
- **Radius**: 20px
- **Shadow**: `0 2px 16px rgba(0, 0, 0, 0.06)`
- **Hover**: Scale 1.02 + Shadow بیشتر
- **Background**: سفید خالص
- **Border**: rgba(0, 0, 0, 0.05)

#### 3. Buttons (دکمه‌ها)
- **Style**: Pill shape با Radius 12px
- **Color**: Gradient آبی iOS
- **Hover**: Scale 1.02
- **Active**: Scale 0.98
- **Shadow**: آبی با opacity 0.3

#### 4. Inputs (ورودی‌ها)
- **Background**: خاکستری روشن (#F2F2F7)
- **Focus**: سفید با border آبی
- **Focus Ring**: 4px آبی با opacity 0.1
- **Radius**: 12px

### 📱 Responsive Design
- **Desktop**: Sidebar ثابت 80px
- **Mobile**: Drawer با backdrop blur
- **Transitions**: 300ms cubic-bezier
- **Touch**: Active states برای تاچ

### 💫 Animations
```css
/* Fade In */
@keyframes ios-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 🎭 Components استایل شده

#### Layout
- ✅ Sidebar با blur effect
- ✅ Header با sticky positioning
- ✅ Gradient avatars
- ✅ iOS nav items
- ✅ Dropdown menu با animation

#### Dashboard
- ✅ Stats cards با iOS style
- ✅ Icon backgrounds شفاف
- ✅ Progress bars gradient
- ✅ Team info cards
- ✅ Member list با hover

### 📝 Typography
- **Font Family**: -apple-system, SF Pro Display, Dirooz
- **Sizes**: 
  - Title: 34px-40px
  - Headline: 20px-24px
  - Body: 15px-17px
  - Caption: 13px
- **Weights**: 400 (normal), 500 (medium), 600 (semibold)

### 🎨 CSS Classes جدید

```css
/* کارت iOS */
.ios-card { }

/* Blur Effect */
.ios-blur { }

/* دکمه iOS */
.ios-button { }

/* Input iOS */
.ios-input { }

/* Badge iOS */
.ios-badge { }

/* Sidebar iOS */
.ios-sidebar { }

/* Nav Item iOS */
.ios-nav-item { }

/* Header iOS */
.ios-header { }

/* Fade In Animation */
.ios-fade-in { }
```

### 🔄 Scrollbar سفارشی
- Width: 8px
- Track: transparent
- Thumb: rgba(0, 0, 0, 0.2)
- Hover: rgba(0, 0, 0, 0.3)
- Radius: 10px

## 🚀 استفاده

### Import CSS
```tsx
import './index.css';
```

### استفاده از Classes
```tsx
// کارت
<div className="ios-card p-6">
  محتوا
</div>

// دکمه
<button className="ios-button">
  کلیک کنید
</button>

// Input
<input className="ios-input" />

// Badge
<span className="ios-badge">فعال</span>
```

## 📸 Screenshots

### قبل از طراحی
- رنگ‌های سنتی (blue-500, gray-50)
- Shadow‌های معمولی
- Border radius کوچک (8px)
- بدون blur effect

### بعد از طراحی iOS 16
- رنگ‌های دقیق iOS (#007AFF)
- Shadow‌های ملایم و حرفه‌ای
- Border radius بزرگ (20-28px)
- Blur effect و backdrop filter
- Gradient avatars و icons
- Smooth transitions و animations

## 🎯 نتیجه

Admin Panel با طراحی iOS 16 حالا:
- ✅ مدرن و حرفه‌ای
- ✅ User-friendly با تعاملات روان
- ✅ Responsive برای موبایل
- ✅ سازگار با استانداردهای Apple
- ✅ Performance بهینه
- ✅ Accessible و خوانا

---

**نکته**: همه فایل‌ها commit و push شده‌اند. با `docker-compose-alt-ports.yml` می‌توانید سرویس‌ها را اجرا کنید.

```bash
# روی سرور
git pull
docker-compose -f docker-compose-alt-ports.yml up -d --build
docker-compose exec backend npx prisma db push
docker-compose restart backend
```

🎉 **Admin Panel شما آماده است!**

