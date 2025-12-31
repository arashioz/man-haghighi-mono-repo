import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import UserDetailsModal from '../components/UserDetailsModal';
import Modal from '../components/Modal';
import MobileLayout from '../components/MobileLayout';
import MobileCard from '../components/MobileCard';
import MobileModal from '../components/MobileModal';
import { usersService, workshopsService } from '../services/api';
import { User, Workshop } from '../types';

const SalesPersons: React.FC = () => {
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [salesManagers, setSalesManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<User | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopIds, setSelectedWorkshopIds] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [personsResponse, managersData] = await Promise.all([
        usersService.getAll(),
        usersService.getSalesManagers(),
      ]);
      
      const sellers = personsResponse.data.filter(user => user.role === 'SALES_PERSON');
      setSalesPersons(sellers);
      setSalesManagers(managersData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (!selectedSalesPerson) return;

    try {
      setError('');
      
      // Handle manager assignment/unassignment
      if (selectedManagerId) {
        // Assign new manager or change existing one
        await usersService.assignSalesPersonToManager(selectedSalesPerson.id, selectedManagerId);
      } else if (selectedSalesPerson.parentId) {
        // Unassign if no manager selected but had one before
        await usersService.unassignSalesPersonFromManager(selectedSalesPerson.id);
      }

      await fetchData();
      setIsAssignModalOpen(false);
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
      setError('');
      await usersService.unassignSalesPersonFromManager(salesPersonId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف انتساب');
    }
  };

  const openAssignModal = (salesPerson: User) => {
    setSelectedSalesPerson(salesPerson);
    setSelectedManagerId(salesPerson.parentId || '');
    setIsAssignModalOpen(true);
  };

  const openWorkshopModal = async (salesPerson: User) => {
    setSelectedSalesPerson(salesPerson);
    try {
      setLoading(true);
      const allWorkshops = await workshopsService.getActive();
      setWorkshops(allWorkshops);
      
      // Get access for each workshop
      const accessPromises = allWorkshops.map(async (workshop) => {
        try {
          const accessList = await workshopsService.getWorkshopSalesPersonAccess(workshop.id);
          return accessList.find((a: any) => a.salesPersonId === salesPerson.id && a.isActive);
        } catch {
          return null;
        }
      });
      
      const accessResults = await Promise.all(accessPromises);
      const accessibleWorkshopIds = accessResults
        .map((access, index) => access ? allWorkshops[index].id : null)
        .filter(Boolean) as string[];
      
      setSelectedWorkshopIds(accessibleWorkshopIds);
      setIsWorkshopModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت کارگاه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkshopToggle = (workshopId: string) => {
    setSelectedWorkshopIds(prev => 
      prev.includes(workshopId)
        ? prev.filter(id => id !== workshopId)
        : [...prev, workshopId]
    );
  };

  const handleSaveWorkshops = async () => {
    if (!selectedSalesPerson) return;

    try {
      setError('');
      setLoading(true);

      // Get current access for all workshops
      const currentAccessPromises = workshops.map(async (workshop) => {
        try {
          const accessList = await workshopsService.getWorkshopSalesPersonAccess(workshop.id);
          return {
            workshopId: workshop.id,
            hasAccess: accessList.some((a: any) => a.salesPersonId === selectedSalesPerson.id && a.isActive),
          };
        } catch {
          return { workshopId: workshop.id, hasAccess: false };
        }
      });
      
      const currentAccess = await Promise.all(currentAccessPromises);
      const currentAccessIds = currentAccess
        .filter(a => a.hasAccess)
        .map(a => a.workshopId);
      
      // Find workshops to add
      const toAdd = selectedWorkshopIds.filter(id => !currentAccessIds.includes(id));
      
      // Find workshops to remove
      const toRemove = currentAccessIds.filter((id: string) => !selectedWorkshopIds.includes(id));

      // Grant access to new workshops
      for (const workshopId of toAdd) {
        await workshopsService.grantSalesPersonAccess(workshopId, selectedSalesPerson.id);
      }

      // Revoke access from removed workshops
      for (const workshopId of toRemove) {
        await workshopsService.revokeSalesPersonAccess(workshopId, selectedSalesPerson.id);
      }

      await fetchData();
      setIsWorkshopModalOpen(false);
      setSelectedSalesPerson(null);
      setSelectedWorkshopIds([]);
      setWorkshops([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ذخیره کارگاه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const getManagerName = (managerId: string) => {
    const manager = salesManagers.find(m => m.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'نامشخص';
  };

  const AddButton = () => (
    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span className="mr-2">فروشنده جدید</span>
    </button>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const isInDashboard = window.location.pathname.includes('sales-dashboard');

  return (
    <div>
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileLayout
          title="فروشندگان"
          actions={
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="p-2 bg-blue-600 text-white rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          }
        >
          {/* Search Bar for Mobile */}
          {salesPersons.length > 0 && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="جستجو بر اساس نام، موبایل یا ایمیل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {error && (
            <MobileCard className="bg-red-50 border-red-200">
              <p className="text-red-700">{error}</p>
            </MobileCard>
          )}

          {salesPersons.length === 0 ? (
            <MobileCard>
              <EmptyState
                icon={
                  <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 17c0-2 4-2 4 0M12 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                }
                title="فروشنده‌ای یافت نشد"
                description="هنوز فروشنده‌ای تحت نظر شما ثبت نشده است"
              />
            </MobileCard>
          ) : (
            <div className="space-y-4">
              {salesPersons
                .filter(seller => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    seller.firstName?.toLowerCase().includes(term) ||
                    seller.lastName?.toLowerCase().includes(term) ||
                    seller.username?.toLowerCase().includes(term) ||
                    seller.phone?.includes(term) ||
                    seller.email?.toLowerCase().includes(term)
                  );
                })
                .map((seller) => (
                <MobileCard key={seller.id} onClick={() => {
                  setSelectedUserForDetails(seller);
                  setIsUserDetailsModalOpen(true);
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold mr-3">
                        {seller.firstName?.[0] || seller.phone?.[0] || 'S'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{seller.firstName} {seller.lastName}</h3>
                        <p className="text-sm text-gray-600">@{seller.username}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {seller.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>📱 {seller.phone}</p>
                    {seller.email && <p>✉️ {seller.email}</p>}
                  </div>
                </MobileCard>
              ))}
            </div>
          )}
        </MobileLayout>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        {!isInDashboard && (
          <PageHeader
            title="فروشندگان"
            description="مدیریت فروشندگان تحت نظر شما"
            action={<AddButton />}
          />
        )}

        {isInDashboard && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">فروشندگان</h2>
            <p className="text-gray-600 mt-1">مدیریت فروشندگان تحت نظر شما</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
        )}

        {/* فیلتر جستجو */}
        {salesPersons.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو بر اساس نام، موبایل یا ایمیل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}


        {/* مودال جزئیات کاربر */}
        {selectedUserForDetails && (
          <UserDetailsModal
            isOpen={isUserDetailsModalOpen}
            onClose={() => {
              setIsUserDetailsModalOpen(false);
              setSelectedUserForDetails(null);
            }}
            userId={selectedUserForDetails.id}
            userName={`${selectedUserForDetails.firstName} ${selectedUserForDetails.lastName}`}
          />
        )}

        {/* مودال انتساب مدیر - Mobile */}
        <div className="lg:hidden">
          <MobileModal
            isOpen={isAssignModalOpen}
            onClose={() => {
              setIsAssignModalOpen(false);
              setSelectedSalesPerson(null);
              setSelectedManagerId('');
            }}
            title="انتساب فروشنده"
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
                  <option value="">بدون مدیر (حذف انتساب)</option>
                  {salesManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedSalesPerson(null);
                    setSelectedManagerId('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </MobileModal>
        </div>

        {/* مودال انتساب مدیر - Desktop */}
        <div className="hidden lg:block">
          <Modal
            isOpen={isAssignModalOpen}
            onClose={() => {
              setIsAssignModalOpen(false);
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
                  <option value="">بدون مدیر (حذف انتساب)</option>
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
                    setIsAssignModalOpen(false);
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          </Modal>
        </div>

        {/* مودال انتساب کارگاه‌ها - Mobile */}
        <div className="lg:hidden">
          <MobileModal
            isOpen={isWorkshopModalOpen}
            onClose={() => {
              setIsWorkshopModalOpen(false);
              setSelectedSalesPerson(null);
              setSelectedWorkshopIds([]);
              setWorkshops([]);
            }}
            title="انتساب کارگاه"
          >
            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto">
                {workshops.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">کارگاه فعالی یافت نشد</p>
                ) : (
                  <div className="space-y-2">
                    {workshops.map((workshop) => (
                      <label
                        key={workshop.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                          selectedWorkshopIds.includes(workshop.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkshopIds.includes(workshop.id)}
                          onChange={() => handleWorkshopToggle(workshop.id)}
                          className="ml-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{workshop.title}</div>
                          <div className="text-sm text-gray-500">
                            {workshop.date}
                          </div>
                          <div className="text-sm font-semibold text-purple-600 mt-1">
                            {(workshop.price / 10).toLocaleString('fa-IR')} تومان
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkshopModalOpen(false);
                    setSelectedSalesPerson(null);
                    setSelectedWorkshopIds([]);
                    setWorkshops([]);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveWorkshops}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </MobileModal>
        </div>

        {/* مودال انتساب کارگاه‌ها - Desktop */}
        <div className="hidden lg:block">
          <Modal
            isOpen={isWorkshopModalOpen}
            onClose={() => {
              setIsWorkshopModalOpen(false);
              setSelectedSalesPerson(null);
              setSelectedWorkshopIds([]);
              setWorkshops([]);
            }}
            title={`انتساب کارگاه‌های فعال به: ${selectedSalesPerson?.firstName} ${selectedSalesPerson?.lastName}`}
          >
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {workshops.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">کارگاه فعالی یافت نشد</p>
                ) : (
                  <div className="space-y-2">
                    {workshops.map((workshop) => (
                      <label
                        key={workshop.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedWorkshopIds.includes(workshop.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkshopIds.includes(workshop.id)}
                          onChange={() => handleWorkshopToggle(workshop.id)}
                          className="ml-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{workshop.title}</div>
                          <div className="text-sm text-gray-500">
                            {workshop.date} {workshop.location && `• ${workshop.location}`}
                          </div>
                          <div className="text-sm font-semibold text-purple-600 mt-1">
                            {(workshop.price / 10).toLocaleString('fa-IR')} تومان
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkshopModalOpen(false);
                    setSelectedSalesPerson(null);
                    setSelectedWorkshopIds([]);
                    setWorkshops([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveWorkshops}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 transition-colors"
                >
                  ذخیره کارگاه‌ها
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default SalesPersons;
