import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { usersService, salesTeamsService } from '../services/api';
import { User, SalesTeam } from '../types';

const SalesManagement: React.FC = () => {
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [salesManagers, setSalesManagers] = useState<User[]>([]);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isTeamDetailsModalOpen, setIsTeamDetailsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<SalesTeam | null>(null);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<User | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedTeamManagerId, setSelectedTeamManagerId] = useState('');
  const [selectedSalesPersonIds, setSelectedSalesPersonIds] = useState<string[]>([]);
  const [availableSalesPersons, setAvailableSalesPersons] = useState<User[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [personsData, managersData, teamsData] = await Promise.all([
        usersService.getSalesPersons(),
        usersService.getSalesManagers(),
        salesTeamsService.getAll(),
      ]);
      
      setSalesPersons(personsData);
      setSalesManagers(managersData);
      setSalesTeams(teamsData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (!selectedSalesPerson || !selectedManagerId) return;

    try {
      await usersService.assignSalesPersonToManager(selectedSalesPerson.id, selectedManagerId);
      await fetchData();
      setIsModalOpen(false);
      setSelectedSalesPerson(null);
      setSelectedManagerId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در انتساب فروشنده');
    }
  };

  const handleUnassign = async (salesPersonId: string) => {
    if (!window.confirm('آیا از حذف انتساب این فروشنده اطمینان دارید؟')) {
      return;
    }

    try {
      await usersService.unassignSalesPersonFromManager(salesPersonId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف انتساب');
    }
  };

  const openAssignModal = (salesPerson: User) => {
    setSelectedSalesPerson(salesPerson);
    setSelectedManagerId(salesPerson.parentId || '');
    setIsModalOpen(true);
  };

  const getManagerName = (managerId: string) => {
    const manager = salesManagers.find(m => m.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'نامشخص';
  };

  const handleCreateTeam = async () => {
    if (!teamName || !selectedTeamManagerId) return;

    try {
      await salesTeamsService.create({
        name: teamName,
        managerId: selectedTeamManagerId,
        description: teamDescription,
        salesPersonIds: selectedSalesPersonIds,
      });
      
      await fetchData();
      setIsCreateTeamModalOpen(false);
      setTeamName('');
      setTeamDescription('');
      setSelectedTeamManagerId('');
      setSelectedSalesPersonIds([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد تیم فروش');
    }
  };

  const handleAddSalesPersonToTeam = (salesPersonId: string) => {
    if (!selectedSalesPersonIds.includes(salesPersonId)) {
      setSelectedSalesPersonIds([...selectedSalesPersonIds, salesPersonId]);
    }
  };

  const handleRemoveSalesPersonFromTeam = (salesPersonId: string) => {
    setSelectedSalesPersonIds(selectedSalesPersonIds.filter(id => id !== salesPersonId));
  };

  const openCreateTeamModal = async () => {
    try {
      const availablePersons = await salesTeamsService.getAvailableSalesPersons();
      setAvailableSalesPersons(availablePersons);
      setIsCreateTeamModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت فروشندگان موجود');
    }
  };

  const openTeamDetailsModal = (team: SalesTeam) => {
    setSelectedTeam(team);
    setIsTeamDetailsModalOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const SalesIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="مدیریت فروشندگان" 
        description="انتساب فروشندگان به مدیران فروش"
      />

      <div className="mb-6 flex justify-end">
        <button
          onClick={openCreateTeamModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>اضافه کردن تیم فروش</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {}
      {salesTeams.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">تیم‌های فروش</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {salesTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => openTeamDetailsModal(team)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{team.name}</h4>
                        <p className="text-xs text-gray-500">{team.members.length} عضو</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      team.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {team.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>مدیر: {team.manager.firstName} {team.manager.lastName}</span>
                    </div>
                    
                    {team.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(team.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                    <div className="flex items-center text-blue-600 text-xs">
                      <span>مشاهده جزئیات</span>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">فروشندگان</h3>
        </div>
        {salesPersons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    فروشنده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مدیر فروش
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
                {salesPersons.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-medium">
                            {person.firstName?.[0] || 'F'}
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {person.firstName} {person.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {person.username} - {person.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {person.parentId ? getManagerName(person.parentId) : 'انتساب نشده'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        person.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {person.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button 
                          onClick={() => openAssignModal(person)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="انتساب/تغییر مدیر"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        {person.parentId && (
                          <button 
                            onClick={() => handleUnassign(person.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="حذف انتساب"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              icon={<SalesIcon />}
              title="فروشنده‌ای یافت نشد"
              description="هنوز فروشنده‌ای ثبت نشده است."
            />
          </div>
        )}
      </div>

      {}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSalesPerson(null);
          setSelectedManagerId('');
        }}
        title={`انتساب فروشنده: ${selectedSalesPerson?.firstName} ${selectedSalesPerson?.lastName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              انتخاب مدیر فروش
            </label>
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">انتخاب کنید...</option>
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} - {manager.username}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedSalesPerson(null);
                setSelectedManagerId('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!selectedManagerId}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors ${
                selectedManagerId 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              انتساب
            </button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        isOpen={isCreateTeamModalOpen}
        onClose={() => {
          setIsCreateTeamModalOpen(false);
          setTeamName('');
          setTeamDescription('');
          setSelectedTeamManagerId('');
          setSelectedSalesPersonIds([]);
        }}
        title="ایجاد تیم فروش جدید"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام تیم *
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="نام تیم فروش"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="توضیحات تیم (اختیاری)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مدیر تیم *
            </label>
            <select
              value={selectedTeamManagerId}
              onChange={(e) => setSelectedTeamManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">انتخاب مدیر فروش...</option>
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} - {manager.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فروشندگان تیم
            </label>
            
            {}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">فروشندگان موجود:</h4>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {availableSalesPersons.length > 0 ? (
                  availableSalesPersons.map((person) => (
                    <div key={person.id} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700">
                        {person.firstName} {person.lastName} - {person.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddSalesPersonToTeam(person.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        +
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">فروشنده موجودی یافت نشد</p>
                )}
              </div>
            </div>

            {}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">فروشندگان انتخاب شده:</h4>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {selectedSalesPersonIds.length > 0 ? (
                  selectedSalesPersonIds.map((personId) => {
                    const person = availableSalesPersons.find(p => p.id === personId);
                    return person ? (
                      <div key={personId} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-700">
                          {person.firstName} {person.lastName} - {person.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSalesPersonFromTeam(personId)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-sm text-gray-500">هیچ فروشنده‌ای انتخاب نشده</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateTeamModalOpen(false);
                setTeamName('');
                setTeamDescription('');
                setSelectedTeamManagerId('');
                setSelectedSalesPersonIds([]);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleCreateTeam}
              disabled={!teamName || !selectedTeamManagerId}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors ${
                teamName && selectedTeamManagerId
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              ایجاد تیم
            </button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        isOpen={isTeamDetailsModalOpen}
        onClose={() => {
          setIsTeamDetailsModalOpen(false);
          setSelectedTeam(null);
        }}
        title={`جزئیات تیم: ${selectedTeam?.name}`}
      >
        {selectedTeam && (
          <div className="space-y-6">
            {}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">اطلاعات تیم</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">نام تیم</label>
                  <p className="text-sm font-medium text-gray-900">{selectedTeam.name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">مدیر تیم</label>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedTeam.manager.firstName} {selectedTeam.manager.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">تعداد اعضا</label>
                  <p className="text-sm font-medium text-gray-900">{selectedTeam.members.length} نفر</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">وضعیت</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTeam.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedTeam.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
              </div>
              {selectedTeam.description && (
                <div className="mt-4">
                  <label className="text-xs text-gray-500">توضیحات</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTeam.description}</p>
                </div>
              )}
            </div>

            {}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">اعضای تیم</h4>
              {selectedTeam.members.length > 0 ? (
                <div className="space-y-3">
                  {selectedTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.salesPerson.firstName?.[0] || 'F'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.salesPerson.firstName} {member.salesPerson.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.salesPerson.username} - {member.salesPerson.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        عضویت از: {new Date(member.joinedAt).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>هنوز عضوی به این تیم اضافه نشده است</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsTeamDetailsModalOpen(false);
                  setSelectedTeam(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesManagement;
