# Remove All Sales Teams Script

این اسکریپت تمام تیم‌های فروش را از همه کاربران حذف می‌کند.

## نحوه استفاده

### روش 1: اجرای مستقیم TypeScript
```bash
cd backend
npx ts-node scripts/remove-all-sales-teams.ts
```

### روش 2: اجرای اسکریپت shell
```bash
cd backend
./scripts/remove-all-sales-teams.sh
```

## چه کاری انجام می‌دهد؟

1. تمام رکوردهای `SalesTeamMember` که `isActive = true` هستند را پیدا می‌کند
2. آنها را به `isActive = false` تغییر می‌دهد
3. تعداد رکوردهای تغییر یافته را نمایش می‌دهد

## مزایای این روش

- **بدون حذف داده‌ها**: رکوردهای تیم‌های فروش حذف نمی‌شوند، فقط غیرفعال می‌شوند
- **قابل بازگشت**: در صورت نیاز می‌توان مجدداً تیم‌ها را فعال کرد
- **ایمن**: تاریخچه عضویت‌ها حفظ می‌شود

## خروجی نمونه

```
🔄 Starting to remove all sales team memberships...
📊 Found 25 active sales team memberships
✅ Successfully deactivated 25 sales team memberships
📊 Active memberships remaining: 0
🎉 All sales team memberships have been removed from all users!
```

## احتیاط

- قبل از اجرای اسکریپت، از دیتابیس backup بگیرید
- این عملیات غیرقابل بازگشت است (اگرچه داده‌ها حذف نمی‌شوند)
- در محیط production با احتیاط اجرا کنید
