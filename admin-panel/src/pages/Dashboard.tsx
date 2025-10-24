import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService, slidersService, articlesService, podcastsService, coursesService, videosService, salesService, salesTeamsService } from '../services/api';
import { SalesTeam } from '../types';

const PeopleIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const SlideshowIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
  </svg>
);

const ArticleIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PodcastsIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const SchoolIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const VideoLibraryIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const TeamIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const WorkshopIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    sliders: 0,
    articles: 0,
    podcasts: 0,
    courses: 0,
    videos: 0,
    salesTeam: 0,
    enrollments: 0,
    workshops: 0,
    teamMembers: 0,
    activeWorkshops: 0,
    monthlySales: 0,
  });
  const [myTeam, setMyTeam] = useState<SalesTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'ADMIN') {
          const [users, sliders, articles, podcasts, courses, videos] = await Promise.all([
            usersService.getAll(),
            slidersService.getAll(),
            articlesService.getAll(),
            podcastsService.getAll(),
            coursesService.getAll(),
            videosService.getAll(),
          ]);

          setStats({
            users: users.length,
            sliders: sliders.length,
            articles: articles.length,
            podcasts: podcasts.length,
            courses: courses.length,
            videos: videos.length,
            salesTeam: 0,
            enrollments: 0,
            workshops: 0,
            teamMembers: 0,
            activeWorkshops: 0,
            monthlySales: 0,
          });
        } else if (user?.role === 'SALES_MANAGER') {
          try {
            const [teams] = await Promise.all([
              salesTeamsService.getAll(),
            ]);
            
            const managerTeam = teams.find((t: SalesTeam) => t.managerId === user.id);
            setMyTeam(managerTeam || null);
            
            const teamMembers = managerTeam ? managerTeam.members.length : 0;
            
            setStats({
              users: 0,
              sliders: 0,
              articles: 0,
              podcasts: 0,
              courses: 0,
              videos: 0,
              salesTeam: managerTeam ? 1 : 0,
              enrollments: 0,
              workshops: 0,
              teamMembers,
              activeWorkshops: 0,
              monthlySales: 0,
            });
          } catch (teamError) {
            console.error('Error fetching team data:', teamError);
            setStats({
              users: 0,
              sliders: 0,
              articles: 0,
              podcasts: 0,
              courses: 0,
              videos: 0,
              salesTeam: 0,
              enrollments: 0,
              workshops: 0,
              teamMembers: 0,
              activeWorkshops: 0,
              monthlySales: 0,
            });
          }
        } else if (user?.role === 'SALES_PERSON') {
          const myReport = await salesService.getMySalesReport();
          setStats({
            users: 0,
            sliders: 0,
            articles: 0,
            podcasts: 0,
            courses: 0,
            videos: 0,
            salesTeam: 0,
            enrollments: myReport.enrollments || 0,
            workshops: myReport.workshops || 0,
            teamMembers: 0,
            activeWorkshops: 0,
            monthlySales: 0,
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت آمار');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  const getStatCards = () => {
    if (user?.role === 'ADMIN') {
      return [
        { title: 'کاربران', value: stats.users, icon: <PeopleIcon />, color: 'bg-blue-500' },
        { title: 'اسلایدرها', value: stats.sliders, icon: <SlideshowIcon />, color: 'bg-red-500' },
        { title: 'مقالات', value: stats.articles, icon: <ArticleIcon />, color: 'bg-green-500' },
        { title: 'پادکست‌ها', value: stats.podcasts, icon: <PodcastsIcon />, color: 'bg-orange-500' },
        { title: 'دوره‌ها', value: stats.courses, icon: <SchoolIcon />, color: 'bg-purple-500' },
        { title: 'ویدیوها', value: stats.videos, icon: <VideoLibraryIcon />, color: 'bg-pink-500' },
      ];
    } else if (user?.role === 'SALES_MANAGER') {
      return [
        { title: 'تیم فروش', value: stats.salesTeam, icon: <TeamIcon />, color: 'bg-blue-500' },
        { title: 'اعضای تیم', value: stats.teamMembers, icon: <PeopleIcon />, color: 'bg-green-500' },
        { title: 'کارگاه‌های فعال', value: stats.activeWorkshops, icon: <WorkshopIcon />, color: 'bg-purple-500' },
        { title: 'فروش ماهانه', value: stats.monthlySales, icon: <ChartIcon />, color: 'bg-orange-500' },
      ];
    } else if (user?.role === 'SALES_PERSON') {
      return [
        { title: 'ثبت‌نام‌ها', value: stats.enrollments, icon: <SchoolIcon />, color: 'bg-green-500' },
        { title: 'کارگاه‌ها', value: stats.workshops, icon: <VideoLibraryIcon />, color: 'bg-purple-500' },
      ];
    }
    return [];
  };

  const getPageTitle = () => {
    if (user?.role === 'ADMIN') {
      return 'داشبورد مدیریت';
    } else if (user?.role === 'SALES_MANAGER') {
      return 'داشبورد مدیر فروش';
    } else if (user?.role === 'SALES_PERSON') {
      return 'داشبورد فروشنده';
    }
    return 'داشبورد';
  };

  const getPageDescription = () => {
    if (user?.role === 'ADMIN') {
      return 'به پنل مدیریت پلتفرم حقیقی خوش آمدید';
    } else if (user?.role === 'SALES_MANAGER') {
      return 'مدیریت تیم فروش و گزارش‌گیری';
    } else if (user?.role === 'SALES_PERSON') {
      return 'گزارش فروش و مدیریت مشتریان';
    }
    return 'داشبورد کاربری';
  };

  const statCards = getStatCards();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{getPageTitle()}</h1>
        <p className="text-gray-600">{getPageDescription()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} text-white p-3 rounded-lg`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {}
      {user?.role === 'SALES_MANAGER' && myTeam && (
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">اطلاعات تیم شما</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">جزئیات تیم</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">نام تیم:</span>
                      <span className="text-sm font-medium text-gray-900">{myTeam.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">تعداد اعضا:</span>
                      <span className="text-sm font-medium text-gray-900">{myTeam.members.length} نفر</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">وضعیت:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        myTeam.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {myTeam.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">تاریخ ایجاد:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(myTeam.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">اعضای تیم</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {myTeam.members.length > 0 ? (
                      myTeam.members.map((member) => (
                        <div key={member.id} className="flex items-center space-x-3 space-x-reverse p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {member.salesPerson.firstName?.[0] || 'F'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {member.salesPerson.firstName} {member.salesPerson.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{member.salesPerson.username}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">هیچ عضوی در تیم شما نیست</p>
                    )}
                  </div>
                </div>
              </div>
              
              {myTeam.description && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">توضیحات تیم</h5>
                  <p className="text-sm text-gray-700">{myTeam.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;