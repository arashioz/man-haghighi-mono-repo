import React from 'react';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">بیوگرافی فراز قورچیان</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            موسس، مدیرعامل و راهبر گروه آموزشی من حقیقی
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Hero Section */}
          <div className="relative h-96 bg-gradient-to-r from-indigo-600 to-purple-600">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative h-full flex items-center justify-center">
              <div className="text-center text-white">
                <img 
                  src="/assets/faraz.jpg" 
                  alt="فراز قورچیان" 
                  className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white shadow-lg"
                />
                <h2 className="text-4xl font-bold mb-4">فراز قورچیان</h2>
                <p className="text-xl opacity-90">موسس و مدیرعامل گروه آموزشی من حقیقی</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 lg:p-12">
            {/* Introduction */}
            <div className="mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">درباره فراز قورچیان</h3>
              <div className="prose prose-lg max-w-none text-gray-600">
                <p className="mb-6">
                  فراز قورچیان موسس، مدیرعامل و راهبر گروه آموزشی من حقیقی می باشند. ایشان به عنوان محقق، مدرس و سخنران در حوزه خودآگاهی و توسعه فردی و معنا مشغول به فعالیت می باشند. همچنین به عنوان یک کارآفرین مدیریت و رهبری تیم کارکنان من حقیقی را برای رسیدن به اهداف، ماموریت و چشم انداز سازمان بر عهده دارند.
                </p>
                <p className="mb-6">
                  برگزاری موفقیت آمیز بیش از دو هزار کارگاه آموزشی برای بیش از دویست هزار نفر در زمینه های مختلف خودشناسی، ناخودآگاه، روابط عاطفی و روابط مالی بخشی از فعالیت های درخشان ایشان در مدت هجده سال گذشته می باشد.
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="text-center p-6 bg-indigo-50 rounded-xl">
                <div className="text-4xl font-bold text-indigo-600 mb-2">18+</div>
                <div className="text-sm text-gray-600">سال تجربه</div>
              </div>
              <div className="text-center p-6 bg-indigo-50 rounded-xl">
                <div className="text-4xl font-bold text-indigo-600 mb-2">300K+</div>
                <div className="text-sm text-gray-600">دانشجو</div>
              </div>
              <div className="text-center p-6 bg-indigo-50 rounded-xl">
                <div className="text-4xl font-bold text-indigo-600 mb-2">2,119</div>
                <div className="text-sm text-gray-600">کارگاه برگزار شده</div>
              </div>
              <div className="text-center p-6 bg-indigo-50 rounded-xl">
                <div className="text-4xl font-bold text-indigo-600 mb-2">193</div>
                <div className="text-sm text-gray-600">محتوای آموزشی</div>
              </div>
            </div>

            {/* Expertise Areas */}
            <div className="mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">حوزه‌های تخصصی</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">خودشناسی و خودآگاهی</h4>
                  <p className="text-gray-600">راهنمایی افراد در مسیر شناخت عمیق خود و کشف استعدادهای درونی</p>
                </div>
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">توسعه فردی</h4>
                  <p className="text-gray-600">ارائه راهکارهای عملی برای رشد شخصی و دستیابی به اهداف</p>
                </div>
                <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl">
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">روابط عاطفی</h4>
                  <p className="text-gray-600">آموزش مهارت‌های ارتباطی و بهبود روابط بین فردی</p>
                </div>
                <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">روابط مالی</h4>
                  <p className="text-gray-600">راهنمایی در مدیریت مالی شخصی و کسب ثروت</p>
                </div>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
              <h3 className="text-3xl font-bold mb-4">ماموریت و چشم‌انداز</h3>
              <p className="text-lg opacity-90 leading-relaxed">
                هدف اصلی فراز قورچیان و تیم من حقیقی، ایجاد تحول در زندگی افراد از طریق آموزش‌های کاربردی و عملی است. 
                ما معتقدیم که هر فردی قابلیت رشد و پیشرفت را دارد و با راهنمایی صحیح می‌تواند به بهترین نسخه خود تبدیل شود.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
