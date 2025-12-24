import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesService, videosService, audiosService, workshopsService, authService, messagesService, paymentsService } from '../services/api';
import { Course, Video, Audio, Workshop, UserMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

type TabId = 'courses' | 'workshops' | 'videos' | 'audios' | 'wallet' | 'messages';
type MainTabId = 'dashboard' | 'profile';

const UserDashboard: React.FC = () => {
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [myAudios, setMyAudios] = useState<Audio[]>([]);
  const [myWorkshops, setMyWorkshops] = useState<Workshop[]>([]);
  const [inboxMessages, setInboxMessages] = useState<UserMessage[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainTab, setMainTab] = useState<MainTabId>('dashboard');
  const [activeTab, setActiveTab] = useState<TabId>('courses');
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);

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
    setMessagesLoading(true);
    try {
      const [coursesData, videosData, audiosData, workshopsData, messagesData, invoicesData] = await Promise.all([
        coursesService.getMyCourses(),
        videosService.getMyVideos(),
        audiosService.getMyAudios(),
        workshopsService.getMyWorkshops(),
        messagesService.getMyMessages(),
        paymentsService.getMyInvoices(10),
      ]);
      setMyCourses(coursesData);
      setMyVideos(videosData);
      setMyAudios(audiosData);
      setMyWorkshops(workshopsData);
      setInboxMessages(messagesData || []);
      setInvoices(invoicesData || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت اطلاعات کاربر');
    } finally {
      setLoading(false);
      setMessagesLoading(false);
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

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      setPasswordSaving(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('رمز عبور جدید و تکرار آن یکسان نیستند');
      setPasswordSaving(false);
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword || undefined,
        newPassword: passwordForm.newPassword
      });
      setPasswordSuccess('رمز عبور با موفقیت تغییر یافت');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'خطا در تغییر رمز عبور');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePasswordReset = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const profileFieldsToComplete: Array<'education' | 'university' | 'job' | 'state' | 'gender'> = [
    'education',
    'university',
    'job',
    'state',
    'gender',
  ];
  const isProfileIncomplete = !!user && profileFieldsToComplete.some((field) => !(user as any)?.[field]);
  const unreadMessages = inboxMessages.filter((msg) => !msg.isRead).length;
  const tabsConfig: Array<{ id: TabId; name: string; icon: string; count: number }> = [
    { id: 'messages', name: 'پیام‌ها', icon: '✉️', count: unreadMessages },
    { id: 'courses', name: 'دوره‌های من', icon: '📚', count: myCourses.length },
    { id: 'workshops', name: 'کارگاه‌های من', icon: '🎓', count: myWorkshops.length },
    { id: 'videos', name: 'ویدیوهای من', icon: '🎥', count: myVideos.length },
    { id: 'audios', name: 'فایل‌های صوتی', icon: '🎵', count: myAudios.length },
    { id: 'wallet', name: 'کیف پول', icon: '💰', count: 0 },
  ];

  const handleVideoClick = (videoId: string, courseId: string) => {
    navigate(`/courses/${courseId}/videos/${videoId}`);
  };

  const handleMarkMessageRead = async (userMessageId: string) => {
    try {
      const updated = await messagesService.markAsRead(userMessageId);
      setInboxMessages((prev) =>
        prev.map((msg) => (msg.id === userMessageId ? { ...msg, ...updated } : msg))
      );
    } catch (err) {
      // Keep UX simple; log the error without breaking the page
      console.error('Failed to mark message as read', err);
    }
  };

  // Show loading while auth is checking or data is loading
  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />
        <div className="relative z-10 text-center px-6 py-8 rounded-2xl shadow-2xl bg-white/70 backdrop-blur-lg border border-white/40">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-gray-700 font-medium">در حال بارگذاری...</p>
          <p className="text-xs text-gray-500 mt-1">لطفاً چند لحظه صبر کنید</p>
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
        {/* Main Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xl mb-6 overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 px-3 sm:px-6 py-4">
            <nav className="flex gap-4">
              <button
                onClick={() => setMainTab('dashboard')}
                className={`flex items-center space-x-2 space-x-reverse px-6 py-3 text-base font-medium rounded-lg transition-all ${
                  mainTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📊</span>
                <span>داشبورد اصلی</span>
              </button>
              <button
                onClick={() => setMainTab('profile')}
                className={`flex items-center space-x-2 space-x-reverse px-6 py-3 text-base font-medium rounded-lg transition-all ${
                  mainTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">👤</span>
                <span>اطلاعات کاربری</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Dashboard Tab Content */}
        {mainTab === 'dashboard' && (
          <>
            {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xl mb-6 overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 px-3 sm:px-6 py-3">
            <nav className="custom-scrollbar flex gap-3 sm:gap-4 overflow-x-auto">
              {tabsConfig.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-pill flex items-center space-x-2 space-x-reverse whitespace-nowrap px-4 py-2 sm:px-5 sm:py-3 text-sm sm:text-base ${
                    activeTab === tab.id ? 'tab-pill-active' : 'tab-pill-inactive hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg sm:text-xl">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                  {tab.count > 0 && (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
          <div className="max-h-[82vh] sm:max-h-[86vh] overflow-y-auto custom-scrollbar">
            {activeTab === 'messages' && (
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">صندوق پیام‌ها</h2>
                    <p className="text-gray-600 text-sm">پیام‌های ارسالی توسط تیم ما برای شما</p>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="px-3 py-1 rounded-full text-sm bg-indigo-50 text-indigo-700">
                      پیام‌های جدید: {unreadMessages}
                    </span>
                  </div>
                </div>

                {messagesLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                      <p className="text-gray-600">در حال دریافت پیام‌ها...</p>
                    </div>
                  </div>
                ) : inboxMessages.length > 0 ? (
                  <div className="space-y-4 custom-scrollbar max-h-[58vh] overflow-y-auto pr-3">
                    {inboxMessages.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 transition-all ${
                          item.isRead ? 'border-gray-100 bg-white' : 'border-indigo-100 bg-indigo-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.isRead ? 'bg-gray-300' : 'bg-indigo-500'
                              }`}
                            ></span>
                            <h3 className="font-semibold text-gray-900">{item.message.title}</h3>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(item.message.createdAt).toLocaleString('fa-IR')}
                          </p>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed mb-3">{item.message.body}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {item.message.sendSms && <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">ارسال پیامک</span>}
                            {item.message.sendInApp && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">ارسال درون پنل</span>}
                          </div>
                          {!item.isRead && (
                            <button
                              onClick={() => handleMarkMessageRead(item.id)}
                              className="text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              علامت‌گذاری به عنوان خوانده شده
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-center py-8 sm:py-12">
                    <div>
                      <div className="w-20 sm:w-24 h-20 sm:h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl sm:text-4xl">✉️</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">پیامی ندارید</h3>
                      <p className="text-gray-600">به محض ارسال پیام جدید از سمت ما، اینجا نمایش داده می‌شود.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          {activeTab === 'courses' && (
            <div className="p-4 sm:p-6 space-y-6">
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
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                    {myCourses.map((course) => (
                      <div
                        key={course.id}
                        className="dashboard-card bg-gradient-to-br from-white to-gray-50 rounded-xl transform-gpu transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                      >
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
                <div className="text-center py-10 sm:py-14">
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
            <div className="p-4 sm:p-6 space-y-6">
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
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                    {myWorkshops.map((workshop) => (
                      <div
                        key={workshop.id}
                        className="dashboard-card bg-gradient-to-br from-white to-gray-50 rounded-xl transform-gpu transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                      >
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
                <div className="text-center py-10 sm:py-14">
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
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">ویدیوهای من</h2>
              </div>
              
              {myVideos.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                    {myVideos.map((video) => (
                      <div
                        key={video.id}
                        className="dashboard-card bg-gradient-to-br from-white to-gray-50 rounded-xl transform-gpu transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                      >
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
                <div className="text-center py-10 sm:py-14">
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
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">فایل‌های صوتی من</h2>
              </div>
              
              {myAudios.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
                    {myAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className="dashboard-card bg-gradient-to-br from-white to-gray-50 rounded-xl transform-gpu transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                      >
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
                <div className="text-center py-10 sm:py-14">
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
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">کیف پول و فاکتورها</h2>
                  <p className="text-gray-600 text-sm">مدیریت موجودی و سوابق تراکنش‌ها</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-lg">
                  <p className="text-xs opacity-80 mb-1">موجودی فعلی</p>
                  <p className="text-2xl font-bold">{user?.wallet?.balance ? Number(user.wallet.balance).toLocaleString() : 0} تومان</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Invoice List */}
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">آخرین فاکتورها</h3>
                  {invoices.length > 0 ? (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="dashboard-card p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              invoice.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                            }`}>
                              <span className="text-xl">
                                {invoice.type === 'COURSE_PURCHASE' ? '📚' : invoice.type === 'WALLET_CHARGE' ? '💰' : '🔗'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {invoice.type === 'COURSE_PURCHASE' ? `خرید دوره: ${invoice.course?.title || 'نامشخص'}` : 
                                 invoice.type === 'WALLET_CHARGE' ? 'شارژ کیف پول' : 'پرداخت لینک مستقیم'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                شماره فاکتور: {invoice.invoiceNumber} | {new Date(invoice.createdAt).toLocaleDateString('fa-IR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                            <p className="font-bold text-gray-900">{Number(invoice.amount).toLocaleString()} تومان</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              invoice.status === 'PAID' ? 'bg-green-50 text-green-700 border border-green-100' : 
                              invoice.status === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            }`}>
                              {invoice.status === 'PAID' ? 'پرداخت شده' : 
                               invoice.status === 'FAILED' ? 'ناموفق' : 'در انتظار'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">تراکنشی یافت نشد</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
        

        {/* Profile Tab Content */}
        {mainTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Information Form */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">تکمیل اطلاعات حساب کاربری</h2>
                <p className="text-sm text-gray-600 mt-1">
                  برای استفاده بهتر از خدمات سایت، لطفاً اطلاعات تماس و سوابق خود را به‌روزرسانی کنید.
                </p>
                {(user?.isOld || isProfileIncomplete) && (
                  <p className="text-xs text-indigo-600 mt-2">
                    {user?.isOld && 'حساب شما از سامانه قدیمی منتقل شده است. '}
                    {isProfileIncomplete && 'لطفاً اطلاعات ناقص را تکمیل نمایید.'}
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

            {/* Password Change Section - Only for USER role */}
            {user?.role === 'USER' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">تغییر رمز عبور</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    می‌توانید رمز عبور خود را تنظیم یا تغییر دهید
                  </p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="p-4 sm:p-6 space-y-4">
                  {passwordSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                      {passwordSuccess}
                    </div>
                  )}
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                      {passwordError}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        رمز عبور فعلی (در صورت وجود)
                      </label>
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                        placeholder="اگر قبلاً رمز عبور تنظیم کرده‌اید، وارد کنید"
                        disabled={passwordSaving}
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        رمز عبور جدید
                      </label>
                      <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                        placeholder="حداقل ۶ کاراکتر"
                        required
                        minLength={6}
                        disabled={passwordSaving}
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        تکرار رمز عبور جدید
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                        placeholder="رمز عبور جدید را دوباره وارد کنید"
                        required
                        minLength={6}
                        disabled={passwordSaving}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      disabled={passwordSaving}
                    >
                      بازنشانی
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      disabled={passwordSaving}
                    >
                      {passwordSaving ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default UserDashboard;
