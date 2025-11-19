# 📚 API مدیریت دوره‌های کاربران

این راهنما نحوه مدیریت دوره‌های کاربران و مشاهده محصولات قدیمی آنها را توضیح می‌دهد.

---

## 🎯 قابلیت‌های جدید

✅ **مشاهده محصولات قدیمی کاربر** (از سیستم قبلی)  
✅ **مشاهده دوره‌های خریداری شده**  
✅ **اختصاص دوره به کاربر** (به صورت دستی توسط ادمین)  
✅ **حذف دوره از کاربر**  

---

## 📊 Schema جدید: OldProduct

```prisma
model OldProduct {
  id              String   @id @default(cuid())
  userId          String
  productId       String   // ID محصول از سیستم قدیمی (مثل "PROD_1382")
  productName     String   // نام محصول
  productCategory String   // دسته‌بندی محصول
  importedAt      DateTime @default(now())
  
  user            User     @relation(...)
}
```

---

## 🔌 API Endpoints

### 1️⃣ دریافت کاربر با محصولات قدیمی و دوره‌ها

**GET** `/api/users/:id/products`

برمی‌گرداند:
- اطلاعات کاربر
- لیست محصولات قدیمی (oldProducts)
- لیست دوره‌های خریداری شده (purchasedCourses)

**نمونه درخواست:**
```bash
curl -X GET "http://localhost:3000/api/users/clxxxxxx/products" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**نمونه پاسخ:**
```json
{
  "id": "clxxxxxx",
  "email": "user@example.com",
  "phone": "09121234567",
  "username": "testuser",
  "firstName": "علی",
  "lastName": "قدیمی",
  "role": "USER",
  "isOld": true,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "oldProducts": [
    {
      "id": "clprod1",
      "productId": "PROD_1382",
      "productName": "بسته آموزشی مشیت الهی",
      "productCategory": "educational_package",
      "importedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "clprod2",
      "productId": "PROD_1392",
      "productName": "بسته ی آموزشی از وابستگی تا شفا",
      "productCategory": "educational_package",
      "importedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "purchasedCourses": [
    {
      "id": "clenroll1",
      "userId": "clxxxxxx",
      "courseId": "clcourse1",
      "enrolledAt": "2024-01-15T00:00:00Z",
      "course": {
        "id": "clcourse1",
        "title": "دوره جامع بازاریابی دیجیتال",
        "description": "آموزش کامل بازاریابی دیجیتال",
        "thumbnail": "/uploads/course1.jpg",
        "price": "2500000",
        "published": true
      }
    }
  ]
}
```

---

### 2️⃣ اختصاص یک دوره به کاربر

**POST** `/api/users/:userId/courses/:courseId`

**نمونه درخواست:**
```bash
curl -X POST "http://localhost:3000/api/users/clxxxxxx/courses/clcourse123" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**نمونه پاسخ:**
```json
{
  "id": "clenroll123",
  "userId": "clxxxxxx",
  "courseId": "clcourse123",
  "enrolledAt": "2024-01-20T10:30:00Z",
  "course": {
    "id": "clcourse123",
    "title": "دوره آموزش فروش حرفه‌ای",
    "description": "تکنیک‌های پیشرفته فروش",
    "thumbnail": "/uploads/course2.jpg",
    "price": "1800000"
  }
}
```

**خطاها:**
- `404`: کاربر یا دوره یافت نشد
- `409`: کاربر قبلاً در این دوره ثبت‌نام کرده

---

### 3️⃣ حذف دوره از کاربر

**DELETE** `/api/users/:userId/courses/:courseId`

**نمونه درخواست:**
```bash
curl -X DELETE "http://localhost:3000/api/users/clxxxxxx/courses/clcourse123" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**نمونه پاسخ:**
```json
{
  "id": "clenroll123",
  "userId": "clxxxxxx",
  "courseId": "clcourse123",
  "enrolledAt": "2024-01-20T10:30:00Z"
}
```

**خطاها:**
- `404`: کاربر در این دوره ثبت‌نام نکرده

---

### 4️⃣ دریافت لیست دوره‌های کاربر (ساده)

**GET** `/api/users/:id/courses`

**نمونه درخواست:**
```bash
curl -X GET "http://localhost:3000/api/users/clxxxxxx/courses" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🚀 نحوه استفاده در Admin Panel

### مثال کامل workflow:

#### 1. نمایش اطلاعات کاربر با محصولات و دوره‌ها

```typescript
// در Admin Panel
async function getUserDetails(userId: string) {
  const response = await fetch(`/api/users/${userId}/products`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  const user = await response.json();
  
  // نمایش محصولات قدیمی
  console.log('Old Products:', user.oldProducts);
  
  // نمایش دوره‌های خریداری شده
  console.log('Purchased Courses:', user.purchasedCourses);
}
```

#### 2. اختصاص دوره به کاربر

```typescript
async function assignCourseToUser(userId: string, courseId: string) {
  const response = await fetch(`/api/users/${userId}/courses/${courseId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 409) {
      alert('کاربر قبلاً این دوره را دارد!');
    } else if (response.status === 404) {
      alert('کاربر یا دوره یافت نشد!');
    }
    return;
  }
  
  const enrollment = await response.json();
  alert(`دوره با موفقیت اختصاص داده شد!`);
}
```

#### 3. حذف دوره از کاربر

```typescript
async function removeCourseFromUser(userId: string, courseId: string) {
  if (!confirm('آیا مطمئن هستید؟')) return;
  
  const response = await fetch(`/api/users/${userId}/courses/${courseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  if (response.ok) {
    alert('دوره با موفقیت حذف شد!');
  }
}
```

---

## 💡 نمونه UI Component (React)

```typescript
import React, { useState, useEffect } from 'react';

interface UserCoursesModalProps {
  userId: string;
  onClose: () => void;
}

export const UserCoursesModal: React.FC<UserCoursesModalProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadAllCourses();
  }, [userId]);

  const loadUserData = async () => {
    const response = await fetch(`/api/users/${userId}/products`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setUser(data);
    setLoading(false);
  };

  const loadAllCourses = async () => {
    const response = await fetch('/api/courses', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setAllCourses(data);
  };

  const assignCourse = async (courseId: string) => {
    await fetch(`/api/users/${userId}/courses/${courseId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    loadUserData(); // Refresh
  };

  const removeCourse = async (courseId: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;
    
    await fetch(`/api/users/${userId}/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    loadUserData(); // Refresh
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>مدیریت دوره‌های {user.firstName} {user.lastName}</h2>
        
        {/* محصولات قدیمی */}
        <section>
          <h3>📦 محصولات قدیمی ({user.oldProducts.length})</h3>
          <ul>
            {user.oldProducts.map(product => (
              <li key={product.id}>
                <strong>{product.productName}</strong>
                <span>ID: {product.productId}</span>
                <span>دسته: {product.productCategory}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* دوره‌های خریداری شده */}
        <section>
          <h3>📚 دوره‌های خریداری شده ({user.purchasedCourses.length})</h3>
          <ul>
            {user.purchasedCourses.map(enrollment => (
              <li key={enrollment.id}>
                <strong>{enrollment.course.title}</strong>
                <button onClick={() => removeCourse(enrollment.courseId)}>
                  حذف
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* اختصاص دوره جدید */}
        <section>
          <h3>➕ اختصاص دوره جدید</h3>
          <select onChange={(e) => assignCourse(e.target.value)}>
            <option>انتخاب دوره...</option>
            {allCourses
              .filter(course => !user.purchasedCourses.find(e => e.courseId === course.id))
              .map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))
            }
          </select>
        </section>

        <button onClick={onClose}>بستن</button>
      </div>
    </div>
  );
};
```

---

## 🔄 Migration

بعد از تغییرات schema، باید migration اجرا شود:

```bash
# در development
cd backend
npx prisma migrate dev --name add_old_products

# در production (روی سرور)
docker exec -it haghighi_backend npx prisma db push
```

---

## ✅ Checklist پیاده‌سازی

### Backend:
- [x] Schema: model OldProduct اضافه شد
- [x] Seed: محصولات قدیمی import می‌شوند
- [x] Service: getUserWithProducts()
- [x] Service: assignCourse()
- [x] Service: removeCourse()
- [x] Controller: GET /users/:id/products
- [x] Controller: POST /users/:id/courses/:courseId
- [x] Controller: DELETE /users/:id/courses/:courseId

### Frontend (Admin Panel):
- [ ] صفحه لیست کاربران
- [ ] دکمه "مدیریت دوره‌ها" برای هر کاربر
- [ ] Modal نمایش محصولات قدیمی
- [ ] Modal نمایش دوره‌های خریداری شده
- [ ] Dropdown اختصاص دوره جدید
- [ ] دکمه حذف دوره

---

## 📝 مثال Data Flow

```
1. کاربر قدیمی import می‌شود
   ↓
2. محصولات قدیمی‌اش هم import می‌شوند (OldProduct)
   ↓
3. در admin panel، ادمین کاربر را باز می‌کند
   ↓
4. محصولات قدیمی نمایش داده می‌شود
   ↓
5. ادمین یک دوره جدید به کاربر اختصاص می‌دهد
   ↓
6. کاربر می‌تواند به دوره دسترسی پیدا کند
```

---

## 🐛 عیب‌یابی

### محصولات قدیمی نمایش داده نمی‌شوند

**علت**: Seed اجرا نشده یا قبل از اضافه شدن OldProduct به schema اجرا شده.

**راه حل**:
```bash
# حذف کاربران قدیمی
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c "DELETE FROM users WHERE \"isOld\" = true;"

# Migration
docker exec -it haghighi_backend npx prisma db push

# Re-import
docker exec -it haghighi_backend npm run seed:old-users
```

### خطا 409: User already enrolled

**علت**: کاربر قبلاً در این دوره ثبت‌نام کرده.

**راه حل**: ابتدا دوره را حذف کنید، سپس دوباره اختصاص دهید.

---

## 🎨 نکات UI/UX

1. **Badge برای کاربران قدیمی**: نمایش یک badge "قدیمی" برای کاربرانی که `isOld: true`
2. **رنگ متفاوت**: محصولات قدیمی را با رنگ متفاوتی نمایش دهید
3. **Tooltip**: برای product ID یک tooltip نمایش دهید
4. **Confirmation**: قبل از حذف دوره، تأیید بگیرید
5. **Loading State**: هنگام assign/remove، loading نمایش دهید
6. **Success Message**: بعد از اختصاص موفق، پیام موفقیت نمایش دهید

---

## 📊 آمار و گزارش

برای دریافت آمار:

```sql
-- تعداد کاربران با محصولات قدیمی
SELECT COUNT(DISTINCT "userId") FROM old_products;

-- محبوب‌ترین محصولات قدیمی
SELECT "productName", COUNT(*) as count 
FROM old_products 
GROUP BY "productName" 
ORDER BY count DESC 
LIMIT 10;

-- کاربرانی که محصول قدیمی دارند اما دوره خریداری نکرده‌اند
SELECT u.id, u.email, u.phone, COUNT(op.id) as old_products_count
FROM users u
LEFT JOIN old_products op ON u.id = op."userId"
LEFT JOIN course_enrollments ce ON u.id = ce."userId"
WHERE u."isOld" = true AND ce.id IS NULL
GROUP BY u.id
HAVING COUNT(op.id) > 0;
```

---

✅ **آماده استفاده!** 

Frontend team می‌تواند با استفاده از این API ها UI را پیاده‌سازی کند.

