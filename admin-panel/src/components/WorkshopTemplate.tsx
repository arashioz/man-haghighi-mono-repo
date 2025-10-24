import React, { useState } from 'react';

interface WorkshopTemplateProps {
  onApplyTemplate: (template: any) => void;
  onClose: () => void;
}

const WorkshopTemplate: React.FC<WorkshopTemplateProps> = ({ onApplyTemplate, onClose }) => {
  const [template, setTemplate] = useState({
    title: '',
    description: '',
    location: '',
    price: 0,
    maxParticipants: 0,
    isActive: true,
  });

  const applyTemplate = () => {
    const workshopData = {
      title: template.title,
      description: template.description,
      location: template.location,
      price: template.price,
      maxParticipants: template.maxParticipants,
      isActive: template.isActive,
      date: '',
    };
    
    onApplyTemplate(workshopData);
    onClose();
  };

  const loadSampleTemplate = () => {
    setTemplate({
      title: 'هفتاد و ششمین کارگاه حضوری شفای زخم',
      description: `✨استاد فراز قورچیان✨

✔️محل برگزاری:[تهران]
✔️۲روز کارگاه حضوری
✔️پنج شنبه و جمعه
✔️[۱۵ و ۱۶] آبان ماه
✔️پنج شنبه[۱۳:۰۰ظهر تا ۲۳:۰۰شب]
✔️جمعه[۰۸:۰۰صبح تا ۲۳:۰۰شب]
✔️ 🍽پذیرایی ویژه🍱 

مزایا دوره حضوری:
جلسه پرسش و پاسخ👇🏼
 💎با شخص استاد فرازقورچیان💎 
و...👇🏼
🔖۳۰روز پشتیبانی تخصصی
🔖۲۵ساعت آموزش
🔖آموزش۴۰ تکنیک های عمیق
🔖وبینار آموزشی با استاد
🔖۵۰درصد تخفیف دوره های آموزشی

🔷مبلغ ثبت نام

۲۱۰.۰۰۰.۰۰۰میلیون ریال
معادل👇🏼👇🏼
بیست و یک میلیون تومان

🔶با تخفیف ۳۰٪👇🏼

 ✅ چهارده میلیون و ششصد و نود هزار تومان 
 ✅ 14.690.000تومان 
جهت پرداخت مبلغ
شماره کارت👇🏼 
➖➖➖➖➖➖➖➖➖

6037697676551218

➖➖➖➖➖➖➖➖➖
✅️پس از واریزی،فیش ارسال شود.
➖➖➖➖➖➖➖➖➖
 توجه‼️ 
و نام ، نام خانوادگی مطابق کارت ملی  و شماره موبایل فعال خود را وارد کنید.
اسکرین شات پرداختی
خود راحتما ارسال کنید.
➖➖➖➖➖➖➖➖➖
به سه نکته توجه کنید:
1️⃣ همراه داشتن کارت ملی الزامی است.
2️⃣ رآس ساعت حضور یابید
3️⃣ دفتر و خودکار همراه داشته باشید
4️⃣ برای بهره مندی از مجموعه آموزشهای سازمان من حقیقی لطفا قوانین ومقررات مربوطه در وب سایت این سازمان رامطالعه بفرمایید.

ثبت نام شما،شروع تعهدات
ما به شماست🤍🔆

 از همراهی و همکاری شما 
 کمال تشکر را داریم.🌹🙏`,
      location: 'تهران',
      price: 14690000,
      maxParticipants: 50,
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">قالب کارگاه فارسی</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={loadSampleTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              بارگذاری قالب نمونه
            </button>
            <button
              onClick={() => setTemplate({
                title: '',
                description: '',
                location: '',
                price: 0,
                maxParticipants: 0,
                isActive: true,
              })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              پاک کردن
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان کارگاه
            </label>
            <input
              type="text"
              value={template.title}
              onChange={(e) => setTemplate({...template, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="عنوان کارگاه را وارد کنید"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات کامل
            </label>
            <textarea
              value={template.description}
              onChange={(e) => setTemplate({...template, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={15}
              placeholder="توضیحات کامل کارگاه را وارد کنید"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مکان برگزاری
              </label>
              <input
                type="text"
                value={template.location}
                onChange={(e) => setTemplate({...template, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مکان برگزاری"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                قیمت (تومان)
              </label>
              <input
                type="number"
                value={template.price}
                onChange={(e) => setTemplate({...template, price: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="قیمت کارگاه"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              حداکثر تعداد شرکت‌کنندگان
            </label>
            <input
              type="number"
              value={template.maxParticipants}
              onChange={(e) => setTemplate({...template, maxParticipants: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="تعداد شرکت‌کنندگان"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={template.isActive}
              onChange={(e) => setTemplate({...template, isActive: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-2 space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            انصراف
          </button>
          <button
            onClick={applyTemplate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
          >
            اعمال قالب
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkshopTemplate;
