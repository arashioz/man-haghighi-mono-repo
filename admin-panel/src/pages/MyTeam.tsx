import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { salesTeamsService } from '../services/api';
import { SalesTeam } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MyTeam: React.FC = () => {
  const { user } = useAuth();
  const [myTeam, setMyTeam] = useState<SalesTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyTeam = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const teams = await salesTeamsService.getAll();
      const team = teams.find((t: SalesTeam) => t.managerId === user?.id);
      setMyTeam(team || null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در دریافت اطلاعات تیم');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchMyTeam();
    }
  }, [user?.id, fetchMyTeam]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const TeamIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="تیم من" 
        description="مدیریت و مشاهده اعضای تیم فروش شما"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {myTeam ? (
        <div className="space-y-6">
          {}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">اطلاعات تیم</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">{myTeam.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">نام تیم</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-green-600">{myTeam.members.length}</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">تعداد اعضا</h4>
                  <p className="text-xs text-gray-500 mt-1">فروشندگان فعال</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {new Date(myTeam.createdAt).toLocaleDateString('fa-IR')}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">تاریخ ایجاد</p>
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

          {}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">اعضای تیم</h3>
            </div>
            <div className="p-6">
              {myTeam.members.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myTeam.members.map((member) => (
                    <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 space-x-reverse mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-medium text-blue-600">
                            {member.salesPerson.firstName?.[0] || 'F'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {member.salesPerson.firstName} {member.salesPerson.lastName}
                          </h4>
                          <p className="text-xs text-gray-500">{member.salesPerson.username}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{member.salesPerson.phone}</span>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>عضویت از: {new Date(member.joinedAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          فعال
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <EmptyState
                    icon={<TeamIcon />}
                    title="هیچ عضوی در تیم شما نیست"
                    description="هنوز فروشنده‌ای به تیم شما اضافه نشده است."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-12 text-center">
            <EmptyState
              icon={<TeamIcon />}
              title="تیمی برای شما تعریف نشده"
              description="شما هنوز مدیر هیچ تیم فروشی نیستید."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTeam;
