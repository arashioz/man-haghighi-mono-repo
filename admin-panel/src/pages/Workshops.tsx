import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import PersianDatePicker from '../components/PersianDatePicker';
import WorkshopTemplate from '../components/WorkshopTemplate';
import { workshopsService, usersService, salesTeamsService, API_ORIGIN } from '../services/api';
import { Workshop, User, SalesTeam } from '../types';
import { formatPersianDate } from '../utils/dateUtils';
import { truncateWords } from '../utils/text';
import { useAuth } from '../contexts/AuthContext';

const Workshops: React.FC = () => {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [editingThumbnail, setEditingThumbnail] = useState<File | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [workshopAccess, setWorkshopAccess] = useState<any[]>([]);
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [selectedSalesPersonIds, setSelectedSalesPersonIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    maxParticipants: 0,
    price: 0,
    isActive: true,
    createdBy: '',
    thumbnail: null as File | null,
    videos: [] as File[],
    audios: [] as File[],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const data = await workshopsService.getAll();
        setWorkshops(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت کارگاه‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshops();
  }, []);

  const handleAddWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', newWorkshop.title);
      formData.append('description', newWorkshop.description || '');
      formData.append('date', newWorkshop.date);
      formData.append('location', newWorkshop.location || '');
      formData.append('maxParticipants', newWorkshop.maxParticipants.toString());
      formData.append('price', newWorkshop.price.toString());
      formData.append('isActive', newWorkshop.isActive.toString());
      formData.append('createdBy', user?.id || '');
      
      if (newWorkshop.thumbnail) {
        formData.append('thumbnail', newWorkshop.thumbnail);
      }
      
      const createdWorkshop = await workshopsService.createWithThumbnail(formData);
      
      let totalFiles = 0;
      let uploadedFiles = 0;
      
      totalFiles += newWorkshop.videos.length;
      totalFiles += newWorkshop.audios.length;

      if (newWorkshop.videos.length > 0) {
        await workshopsService.uploadVideos(createdWorkshop.id, newWorkshop.videos);
        uploadedFiles += newWorkshop.videos.length;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      if (newWorkshop.audios.length > 0) {
        await workshopsService.uploadAudios(createdWorkshop.id, newWorkshop.audios);
        uploadedFiles += newWorkshop.audios.length;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      setWorkshops([...workshops, createdWorkshop]);
      setIsModalOpen(false);
      setNewWorkshop({
        title: '',
        description: '',
        date: '',
        location: '',
        maxParticipants: 0,
        price: 0,
        isActive: true,
        createdBy: '',
        thumbnail: null,
        videos: [],
        audios: [],
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد کارگاه');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditWorkshop = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setEditingThumbnail(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkshop) return;

    try {
      const formData = new FormData();
      formData.append('title', editingWorkshop.title);
      formData.append('description', editingWorkshop.description || '');
      formData.append('date', editingWorkshop.date);
      formData.append('location', editingWorkshop.location || '');
      formData.append('maxParticipants', (editingWorkshop.maxParticipants || 0).toString());
      formData.append('price', editingWorkshop.price.toString());
      formData.append('isActive', editingWorkshop.isActive.toString());
      
      if (editingThumbnail) {
        formData.append('thumbnail', editingThumbnail);
      }

      const updatedWorkshop = await workshopsService.updateWithThumbnail(editingWorkshop.id, formData);
      
      setWorkshops(workshops.map(workshop => 
        workshop.id === editingWorkshop.id ? updatedWorkshop : workshop
      ));
      
      setIsEditModalOpen(false);
      setEditingWorkshop(null);
      setEditingThumbnail(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ویرایش کارگاه');
    }
  };

  const handleDeleteWorkshop = async (workshopId: string) => {
    if (!window.confirm('آیا از حذف این کارگاه اطمینان دارید؟')) {
      return;
    }

    try {
      await workshopsService.delete(workshopId);
      setWorkshops(workshops.filter(workshop => workshop.id !== workshopId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف کارگاه');
    }
  };

  const handleToggleWorkshopStatus = async (workshopId: string, newStatus: boolean) => {
    const action = newStatus ? 'فعال کردن' : 'غیرفعال کردن';
    if (!window.confirm(`آیا از ${action} این کارگاه اطمینان دارید؟`)) {
      return;
    }

    try {
      const updatedWorkshop = await workshopsService.update(workshopId, { isActive: newStatus });
      setWorkshops(workshops.map(workshop => 
        workshop.id === workshopId ? updatedWorkshop : workshop
      ));
    } catch (err: any) {
      setError(err.response?.data?.message || `خطا در ${action} کارگاه`);
    }
  };

  const handleApplyTemplate = (templateData: any) => {
    setNewWorkshop({
      ...newWorkshop,
      ...templateData,
    });
    setIsModalOpen(true);
  };

  const getFilteredWorkshops = () => {
    switch (activeTab) {
      case 'active':
        return workshops.filter(workshop => workshop.isActive);
      case 'inactive':
        return workshops.filter(workshop => !workshop.isActive);
      default:
        return workshops;
    }
  };

  const openAccessModal = async (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setSelectedSalesPersonIds([]);
    setSelectedTeamIds([]);
    try {
      const [accessData, salesData, teamsData] = await Promise.all([
        workshopsService.getWorkshopSalesPersonAccess(workshop.id),
        usersService.getSalesPersons(),
        salesTeamsService.getAll()
      ]);
      setWorkshopAccess(accessData);
      setSalesPersons(salesData);
      setSalesTeams(teamsData);
      setIsAccessModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت اطلاعات دسترسی');
    }
  };

  const handleGrantAccess = async (salesPersonId: string) => {
    if (!selectedWorkshop) return;

    try {
      await workshopsService.grantSalesPersonAccess(selectedWorkshop.id, salesPersonId);
      const accessData = await workshopsService.getWorkshopSalesPersonAccess(selectedWorkshop.id);
      setWorkshopAccess(accessData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در اعطای دسترسی');
    }
  };

  const handleBulkGrantAccess = async () => {
    if (!selectedWorkshop) return;
    if (selectedSalesPersonIds.length === 0 && selectedTeamIds.length === 0) {
      setError('لطفا حداقل یک فروشنده یا تیم را انتخاب کنید');
      return;
    }

    setIsGrantingAccess(true);
    setError('');

    try {
      const salesPersonIdsToGrant: string[] = [...selectedSalesPersonIds];

      // اضافه کردن اعضای تیم‌های انتخاب شده
      selectedTeamIds.forEach(teamId => {
        const team = salesTeams.find(t => t.id === teamId);
        if (team) {
          team.members.forEach(member => {
            if (member.isActive && member.salesPerson) {
              const salesPersonId = member.salesPerson.id;
              if (!salesPersonIdsToGrant.includes(salesPersonId) &&
                  !workshopAccess.some(access => access.salesPersonId === salesPersonId)) {
                salesPersonIdsToGrant.push(salesPersonId);
              }
            }
          });
        }
      });

      // اعطای دسترسی به همه فروشندگان انتخاب شده
      const grantPromises = salesPersonIdsToGrant.map(salesPersonId =>
        workshopsService.grantSalesPersonAccess(selectedWorkshop.id, salesPersonId)
      );

      await Promise.all(grantPromises);

      // به‌روزرسانی لیست دسترسی‌ها
      const accessData = await workshopsService.getWorkshopSalesPersonAccess(selectedWorkshop.id);
      setWorkshopAccess(accessData);
      
      // پاک کردن انتخاب‌ها
      setSelectedSalesPersonIds([]);
      setSelectedTeamIds([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در اعطای دسترسی');
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleToggleSalesPersonSelection = (salesPersonId: string) => {
    if (selectedSalesPersonIds.includes(salesPersonId)) {
      setSelectedSalesPersonIds(selectedSalesPersonIds.filter(id => id !== salesPersonId));
    } else {
      setSelectedSalesPersonIds([...selectedSalesPersonIds, salesPersonId]);
    }
  };

  const handleToggleTeamSelection = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const getSelectedTeamMembersCount = (teamId: string) => {
    const team = salesTeams.find(t => t.id === teamId);
    if (!team) return 0;
    return team.members.filter(member => 
      member.isActive && 
      !workshopAccess.some(access => access.salesPersonId === member.salesPersonId)
    ).length;
  };

  const handleRevokeAccess = async (salesPersonId: string) => {
    if (!selectedWorkshop) return;

    try {
      await workshopsService.revokeSalesPersonAccess(selectedWorkshop.id, salesPersonId);
      const accessData = await workshopsService.getWorkshopSalesPersonAccess(selectedWorkshop.id);
      setWorkshopAccess(accessData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در لغو دسترسی');
    }
  };

  const AddButton = () => (
    <div className="flex space-x-2 space-x-reverse">
      <button 
        onClick={() => setIsTemplateModalOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="mr-2">قالب فارسی</span>
      </button>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="mr-2">کارگاه جدید</span>
      </button>
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const SchoolIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="کارگاه‌ها" 
        description="مدیریت کارگاه‌های آموزشی"
        action={<AddButton />}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 space-x-reverse">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              همه کارگاه‌ها ({workshops.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              کارگاه‌های فعال ({workshops.filter(w => w.isActive).length})
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inactive'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              کارگاه‌های غیرفعال ({workshops.filter(w => !w.isActive).length})
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {getFilteredWorkshops().length > 0 ? (
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کارگاه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مکان
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    قیمت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredWorkshops().map((workshop) => (
                  <tr key={workshop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {workshop.thumbnail ? (
                            <img
                              src={workshop.thumbnail.startsWith('http') ? workshop.thumbnail : `${API_ORIGIN}/uploads/${workshop.thumbnail}`}
                              alt={workshop.title}
                              className="h-10 w-10 rounded-lg object-cover"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center text-white font-medium ${workshop.thumbnail ? 'hidden' : ''}`}>
                            {workshop.title?.[0] || 'W'}
                          </div>
                        </div>
                        <div className="mr-4 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {workshop.title}
                          </div>
                          <div className="text-sm text-gray-500 leading-relaxed">
                            {truncateWords(workshop.description || '', 20)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPersianDate(workshop.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                      {workshop.location || 'نامشخص'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {workshop.price ? `${workshop.price.toLocaleString()} تومان` : 'رایگان'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workshop.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {workshop.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button 
                          onClick={() => handleEditWorkshop(workshop)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="ویرایش"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {(user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER') && (
                          <button 
                            onClick={() => openAccessModal(workshop)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="مدیریت دسترسی فروشندگان"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </button>
                        )}
                        {(user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER') && (
                          <button 
                            onClick={() => handleToggleWorkshopStatus(workshop.id, !workshop.isActive)}
                            className={`p-1 rounded hover:bg-gray-50 ${
                              workshop.isActive 
                                ? 'text-orange-600 hover:text-orange-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={workshop.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {workshop.isActive ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </button>
                        )}
                        {(user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER') && (
                          <button 
                            onClick={() => handleDeleteWorkshop(workshop.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="حذف"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={<SchoolIcon />}
              title={
                activeTab === 'active' 
                  ? "کارگاه فعالی یافت نشد" 
                  : activeTab === 'inactive'
                  ? "کارگاه غیرفعالی یافت نشد"
                  : "کارگاهی یافت نشد"
              }
              description={
                activeTab === 'active' 
                  ? "در حال حاضر هیچ کارگاه فعالی وجود ندارد." 
                  : activeTab === 'inactive'
                  ? "در حال حاضر هیچ کارگاه غیرفعالی وجود ندارد."
                  : "هنوز کارگاهی ثبت نشده است."
              }
              action={activeTab === 'all' ? <AddButton /> : undefined}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="کارگاه جدید"
      >
        {isUploading && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">در حال آپلود...</span>
              <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
            </div>
            <ProgressBar progress={uploadProgress} />
          </div>
        )}

        <form onSubmit={handleAddWorkshop} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان کارگاه
            </label>
            <input
              type="text"
              value={newWorkshop.title}
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={newWorkshop.description}
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {newWorkshop.description.length}/2000 کاراکتر
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تاریخ برگزاری
            </label>
            <PersianDatePicker
              value={newWorkshop.date}
              onChange={(value) => setNewWorkshop((prev) => ({ ...prev, date: value }))}
              placeholder="تاریخ برگزاری کارگاه را انتخاب کنید"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مکان برگزاری
            </label>
            <input
              type="text"
              value={newWorkshop.location}
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              حداکثر تعداد شرکت‌کنندگان
            </label>
            <input
              type="number"
              value={newWorkshop.maxParticipants}
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, maxParticipants: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان)
            </label>
            <input
              type="number"
              value={newWorkshop.price}
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عکس کارگاه
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, thumbnail: e.target.files?.[0] || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {newWorkshop.thumbnail && (
              <p className="text-sm text-gray-500 mt-1">
                {newWorkshop.thumbnail.name} انتخاب شده
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ویدیوهای کارگاه
            </label>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, videos: Array.from(e.target.files || []) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {newWorkshop.videos.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {newWorkshop.videos.length} ویدیو انتخاب شده
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فایل‌های صوتی کارگاه
            </label>
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, audios: Array.from(e.target.files || []) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {newWorkshop.audios.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {newWorkshop.audios.length} فایل صوتی انتخاب شده
              </p>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={newWorkshop.isActive}
              onChange={(e) => setNewWorkshop((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال
            </label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isUploading}
              className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                isUploading 
                  ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' 
                  : 'text-gray-700 bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors ${
                isUploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUploading ? 'در حال آپلود...' : 'ایجاد کارگاه'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWorkshop(null);
        }}
        title="ویرایش کارگاه"
      >
        <form onSubmit={handleUpdateWorkshop} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان کارگاه
            </label>
            <input
              type="text"
              value={editingWorkshop?.title || ''}
              onChange={(e) => setEditingWorkshop(prev => prev ? {...prev, title: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={editingWorkshop?.description || ''}
              onChange={(e) => setEditingWorkshop(prev => prev ? {...prev, description: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {editingWorkshop?.description?.length || 0}/2000 کاراکتر
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تاریخ برگزاری
            </label>
            <PersianDatePicker
              value={editingWorkshop?.date || ''}
              onChange={(value) => setEditingWorkshop(prev => prev ? {...prev, date: value} : null)}
              placeholder="تاریخ برگزاری کارگاه را انتخاب کنید"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مکان برگزاری
            </label>
            <input
              type="text"
              value={editingWorkshop?.location || ''}
              onChange={(e) => setEditingWorkshop(prev => prev ? {...prev, location: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              حداکثر تعداد شرکت‌کنندگان
            </label>
            <input
              type="number"
              value={editingWorkshop?.maxParticipants || 0}
              onChange={(e) => setEditingWorkshop(prev => prev ? {...prev, maxParticipants: Number(e.target.value)} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان)
            </label>
            <input
              type="number"
              value={editingWorkshop?.price || 0}
              onChange={(e) => setEditingWorkshop(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عکس کارگاه
            </label>
            {editingWorkshop?.thumbnail && !editingThumbnail && (
              <div className="mb-2">
                <img
                  src={editingWorkshop.thumbnail.startsWith('http') ? editingWorkshop.thumbnail : `${API_ORIGIN}/uploads/${editingWorkshop.thumbnail}`}
                  alt={editingWorkshop.title}
                  className="h-20 w-20 rounded-lg object-cover border border-gray-300"
                  crossOrigin="anonymous"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEditingThumbnail(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {editingThumbnail && (
              <p className="text-sm text-gray-500 mt-1">
                {editingThumbnail.name} انتخاب شده
              </p>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editingWorkshop?.isActive || false}
              onChange={(e) => setEditingWorkshop(prev => prev ? {...prev, isActive: e.target.checked} : null)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال
            </label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingWorkshop(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
            >
              ویرایش کارگاه
            </button>
          </div>
        </form>
      </Modal>

      {}
      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => {
          setIsAccessModalOpen(false);
          setSelectedWorkshop(null);
          setWorkshopAccess([]);
          setSelectedSalesPersonIds([]);
          setSelectedTeamIds([]);
        }}
        title="مدیریت دسترسی فروشندگان"
      >
        {selectedWorkshop && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900">{selectedWorkshop.title}</h4>
            <p className="text-sm text-gray-600 mt-1">
              تاریخ: {formatPersianDate(selectedWorkshop.date)}
            </p>
            {selectedWorkshop.location && (
              <p className="text-sm text-gray-600">مکان: {selectedWorkshop.location}</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h5 className="text-lg font-medium text-gray-900">فروشندگان با دسترسی</h5>
          
          {workshopAccess.length === 0 ? (
            <p className="text-gray-500 text-sm">هیچ فروشنده‌ای دسترسی ندارد</p>
          ) : (
            <div className="space-y-2">
              {workshopAccess.map((access) => (
                <div key={access.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {access.salesPerson?.firstName} {access.salesPerson?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{access.salesPerson?.username}</p>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      access.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {access.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                    <button
                      onClick={() => handleRevokeAccess(access.salesPersonId || access.salesPerson?.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      لغو دسترسی
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <h6 className="text-md font-medium text-gray-900 mb-3">اعطای دسترسی جدید</h6>
            
            {/* انتخاب تیم‌ها */}
            {salesTeams.length > 0 && (
              <div className="mb-4">
                <h6 className="text-sm font-medium text-gray-700 mb-2 block">انتخاب تیم‌ها</h6>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {salesTeams
                    .filter(team => team.isActive)
                    .map((team) => {
                      const availableMembersCount = getSelectedTeamMembersCount(team.id);
                      if (availableMembersCount === 0) return null;
                      
                      return (
                        <div key={team.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={() => handleToggleTeamSelection(team.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ml-2"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {team.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {availableMembersCount} فروشنده قابل انتخاب
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* انتخاب فروشندگان */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="text-sm font-medium text-gray-700">انتخاب فروشندگان</h6>
                {selectedSalesPersonIds.length > 0 && (
                  <span className="text-xs text-blue-600">
                    {selectedSalesPersonIds.length} نفر انتخاب شده
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {salesPersons
                  .filter(salesPerson => 
                    salesPerson.role === 'SALES_PERSON' && 
                    !workshopAccess.some(access => access.salesPersonId === salesPerson.id)
                  )
                  .map((salesPerson) => (
                    <div key={salesPerson.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSalesPersonIds.includes(salesPerson.id)}
                        onChange={() => handleToggleSalesPersonSelection(salesPerson.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ml-2"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {salesPerson.firstName} {salesPerson.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{salesPerson.username}</p>
                      </div>
                    </div>
                  ))}
                {salesPersons.filter(salesPerson => 
                  salesPerson.role === 'SALES_PERSON' && 
                  !workshopAccess.some(access => access.salesPersonId === salesPerson.id)
                ).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    همه فروشندگان دسترسی دارند
                  </p>
                )}
              </div>
            </div>

            {/* دکمه اعطای دسترسی گروهی */}
            {(selectedSalesPersonIds.length > 0 || selectedTeamIds.length > 0) && (
              <div className="flex justify-end pt-2 border-t">
                <button
                  onClick={handleBulkGrantAccess}
                  disabled={isGrantingAccess}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    isGrantingAccess
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isGrantingAccess 
                    ? 'در حال اعطای دسترسی...' 
                    : (() => {
                        // محاسبه تعداد کل فروشندگانی که دسترسی دریافت می‌کنند
                        let totalCount = selectedSalesPersonIds.length;
                        selectedTeamIds.forEach(teamId => {
                          totalCount += getSelectedTeamMembersCount(teamId);
                        });
                        return `اعطای دسترسی به ${totalCount} فروشنده`;
                      })()
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => {
              setIsAccessModalOpen(false);
              setSelectedWorkshop(null);
              setWorkshopAccess([]);
              setSelectedSalesPersonIds([]);
              setSelectedTeamIds([]);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            بستن
          </button>
        </div>
      </Modal>

      {}
      {isTemplateModalOpen && (
        <WorkshopTemplate
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Workshops;