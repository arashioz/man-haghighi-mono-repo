import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesService, videosService, audiosService, workshopsService } from '../services/api';
import { Course, Video, Audio, Workshop } from '../types';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard: React.FC = () => {
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [myAudios, setMyAudios] = useState<Audio[]>([]);
  const [myWorkshops, setMyWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'courses' | 'workshops' | 'videos' | 'audios' | 'wallet'>('courses');
  const navigate = useNavigate();
  const { user, loading: authLoading, updateProfile: saveProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    education: '',
    university: '',
    job: '',
    state: '',
    gender: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    if (user) {
      fetchUserData();
    } else {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    try {
      const [coursesData, videosData, audiosData, workshopsData] = await Promise.all([
        coursesService.getMyCourses(),
        videosService.getMyVideos(),
        audiosService.getMyAudios(),
        workshopsService.getMyWorkshops(),
      ]);
      setMyCourses(coursesData);
      setMyVideos(videosData);
      setMyAudios(audiosData);
      setMyWorkshops(workshopsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت اطلاعات کاربر');
    } finally {
      setLoading(false);
    }
  };

  const resetProfileForm = useCallback(() => {
    if (!user) {
      return;
    }
    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      education: user.education || '',
      university: user.university || '',
      job: user.job || '',
      state: user.state || '',
      gender: user.gender || '',
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      resetProfileForm();
    }
  }, [user, resetProfileForm]);

  useEffect(() => {
    if (profileSuccess) {
      const timeout = setTimeout(() => {
        setProfileSuccess('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [profileSuccess]);

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await saveProfile({
        firstName: profileForm.firstName.trim() || null,
        lastName: profileForm.lastName.trim() || null,
        email: profileForm.email.trim() || null,
        phone: profileForm.phone.trim() || null,
        education: profileForm.education.trim() || null,
        university: profileForm.university.trim() || null,
        job: profileForm.job.trim() || null,
        state: profileForm.state.trim() || null,
        gender: profileForm.gender.trim() || null,
      });
      setProfileSuccess('اطلاعات شما با موفقیت به‌روزرسانی شد.');
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'خطا در به‌روزرسانی اطلاعات');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileReset = () => {
    resetProfileForm();
    setProfileError('');
    setProfileSuccess('');
  };

  const profileFieldsToComplete: Array<'education' | 'university' | 'job' | 'state' | 'gender'> = [
    'education',
    'university',
    'job',
    'state',
    'gender',
  ];
  const isProfileIncomplete = !!user && profileFieldsToComplete.some((field) => !(user as any)?.[field]);

  const handleVideoClick = (videoId: string, courseId: string) => {
    navigate(`/courses/${courseId}/videos/${videoId}`);
  };

  // Show loading while auth is checking or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">خطا در بارگذاری</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchUserData}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">داشبورد من</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">خوش آمدید، {user?.firstName} {user?.lastName}</p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-500">کیف پول</p>
                <p className="text-lg sm:text-xl font-bold text-green-600">۰ تومان</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {(user?.isOld || isProfileIncomplete) && (
          <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-8">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">تکمیل اطلاعات حساب کاربری</h2>
              <p className="text-sm text-gray-600 mt-1">
                برای استفاده بهتر از خدمات سایت، لطفاً اطلاعات تماس و سوابق خود را به‌روزرسانی کنید.
              </p>
              {user?.isOld && (
                <p className="text-xs text-indigo-600 mt-2">
                  حساب شما از سامانه قدیمی منتقل شده است. لطفاً شماره تلفن و سایر اطلاعات را بازبینی نمایید.
                </p>
              )}
            </div>
            <form onSubmit={handleProfileSubmit} className="p-4 sm:p-6 space-y-4">
              {profileSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {profileError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-firstName" className="block text-sm font-medium text-gray-700">
                    نام
                  </label>
                  <input
                    id="profile-firstName"
                    name="firstName"
                    type="text"
                    value={profileForm.firstName}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="نام شما"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-lastName" className="block text-sm font-medium text-gray-700">
                    نام خانوادگی
                  </label>
                  <input
                    id="profile-lastName"
                    name="lastName"
                    type="text"
                    value={profileForm.lastName}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="نام خانوادگی"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700">
                    شماره تلفن همراه
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="09123456789"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">
                    ایمیل (اختیاری)
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="example@email.com"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-education" className="block text-sm font-medium text-gray-700">
                    مقطع تحصیلی
                  </label>
                  <input
                    id="profile-education"
                    name="education"
                    type="text"
                    value={profileForm.education}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="مثال: کارشناسی ارشد"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-university" className="block text-sm font-medium text-gray-700">
                    دانشگاه
                  </label>
                  <input
                    id="profile-university"
                    name="university"
                    type="text"
                    value={profileForm.university}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="دانشگاه محل تحصیل"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-job" className="block text-sm font-medium text-gray-700">
                    شغل
                  </label>
                  <input
                    id="profile-job"
                    name="job"
                    type="text"
                    value={profileForm.job}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="عنوان شغلی"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-state" className="block text-sm font-medium text-gray-700">
                    استان محل سکونت
                  </label>
                  <input
                    id="profile-state"
                    name="state"
                    type="text"
                    value={profileForm.state}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="مثال: تهران"
                    disabled={profileSaving}
                  />
                </div>
                <div>
                  <label htmlFor="profile-gender" className="block text-sm font-medium text-gray-700">
                    جنسیت
                  </label>
                  <select
                    id="profile-gender"
                    name="gender"
                    value={profileForm.gender}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    disabled={profileSaving}
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="female">زن</option>
                    <option value="male">مرد</option>
                    <option value="other">دیگر</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleProfileReset}
                  className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={profileSaving}
                >
                  بازنشانی
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-8">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 space-x-reverse min-w-max sm:min-w-0">
              {[
                { id: 'courses', name: 'دوره‌های من', icon: '📚', count: myCourses.length },
                { id: 'workshops', name: 'کارگاه‌های من', icon: '🎓', count: myWorkshops.length },
                { id: 'videos', name: 'ویدیوهای من', icon: '🎥', count: myVideos.length },
                { id: 'audios', name: 'فایل‌های صوتی', icon: '🎵', count: myAudios.length },
                { id: 'wallet', name: 'کیف پول', icon: '💰', count: 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 sm:py-4 px-4 sm:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-base sm:text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                  {tab.count > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {activeTab === 'courses' && (
            <div className="p-4 sm:p-6 flex flex-col h-full max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-320px)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">دوره‌های من</h2>
                <button
                  onClick={() => navigate('/courses')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
                >
                  مشاهده همه دوره‌ها
                </button>
              </div>
              
              {myCourses.length > 0 ? (
                <div className="overflow-y-auto flex-1 -mr-4 pr-4 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                  {myCourses.map((course) => (
                    <div key={course.id} className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-600">
                            {course.price.toLocaleString()} تومان
                          </span>
                          <button
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            مشاهده دوره
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 flex-1 flex items-center justify-center">
                  <div>
                    <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl sm:text-4xl">📚</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">هنوز در هیچ دوره‌ای شرکت نکرده‌اید</h3>
                    <p className="text-gray-600 mb-6">دوره‌های جذاب ما را کشف کنید</p>
                    <button
                      onClick={() => navigate('/courses')}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      مشاهده دوره‌ها
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workshops' && (
            <div className="p-4 sm:p-6 flex flex-col h-full max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-320px)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">کارگاه‌های من</h2>
                <button
                  onClick={() => navigate('/workshops')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
                >
                  مشاهده همه کارگاه‌ها
                </button>
              </div>
              
              {myWorkshops.length > 0 ? (
                <div className="overflow-y-auto flex-1 -mr-4 pr-4 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                  {myWorkshops.map((workshop) => (
                    <div key={workshop.id} className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {workshop.thumbnail && (
                        <img
                          src={workshop.thumbnail}
                          alt={workshop.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {workshop.title}
                        </h3>
                        {workshop.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{workshop.description}</p>
                        )}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="ml-2">📅</span>
                            <span>{workshop.date}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="ml-2">📍</span>
                            <span>{workshop.location}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-600">
                            {workshop.price.toLocaleString()} تومان
                          </span>
                          <button
                            onClick={() => navigate(`/workshops/${workshop.id}`)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            مشاهده کارگاه
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 flex-1 flex items-center justify-center">
                  <div>
                    <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl sm:text-4xl">🎓</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">هنوز در هیچ کارگاهی شرکت نکرده‌اید</h3>
                    <p className="text-gray-600 mb-6">کارگاه‌های جذاب ما را کشف کنید</p>
                    <button
                      onClick={() => navigate('/workshops')}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      مشاهده کارگاه‌ها
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="p-4 sm:p-6 flex flex-col h-full max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-320px)]">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">ویدیوهای من</h2>
              </div>
              
              {myVideos.length > 0 ? (
                <div className="overflow-y-auto flex-1 -mr-4 pr-4 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                  {myVideos.map((video) => (
                    <div key={video.id} className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{video.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {video.duration}
                          </span>
                          <button
                            onClick={() => handleVideoClick(video.id, video.courseId)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            تماشا
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 flex-1 flex items-center justify-center">
                  <div>
                    <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl sm:text-4xl">🎥</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">ویدیویی برای تماشا ندارید</h3>
                    <p className="text-gray-600 mb-6">ابتدا در دوره‌ای شرکت کنید</p>
                    <button
                      onClick={() => navigate('/courses')}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      مشاهده دوره‌ها
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audios' && (
            <div className="p-4 sm:p-6 flex flex-col h-full max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-320px)]">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">فایل‌های صوتی من</h2>
              </div>
              
              {myAudios.length > 0 ? (
                <div className="overflow-y-auto flex-1 -mr-4 pr-4 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                  {myAudios.map((audio) => (
                    <div key={audio.id} className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {audio.thumbnail && (
                        <img
                          src={audio.thumbnail}
                          alt={audio.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <div className="flex items-center mb-3">
                          <svg className="w-8 h-8 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                          </svg>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {audio.title}
                          </h3>
                        </div>
                        {audio.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{audio.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {audio.duration ? `${Math.floor(audio.duration / 60)} دقیقه` : 'نامشخص'}
                          </span>
                          <button
                            onClick={() => {
                              const audioUrl = `http://localhost:3000/uploads/${audio.audioFile}`;
                              window.open(audioUrl, '_blank');
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            پخش
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 flex-1 flex items-center justify-center">
                  <div>
                    <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl sm:text-4xl">🎵</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">فایل صوتی برای پخش ندارید</h3>
                    <p className="text-gray-600 mb-6">ابتدا در دوره‌ای شرکت کنید</p>
                    <button
                      onClick={() => navigate('/courses')}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      مشاهده دوره‌ها
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="p-4 sm:p-6">
              <div className="text-center py-8 sm:py-12">
                <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl sm:text-4xl">💰</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">کیف پول</h3>
                <p className="text-gray-600 mb-6">موجودی فعلی شما</p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-8 mb-8">
                  <p className="text-4xl font-bold text-green-600 mb-2">۰ تومان</p>
                  <p className="text-gray-600">موجودی قابل برداشت</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                    واریز وجه
                  </button>
                  <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                    برداشت وجه
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;