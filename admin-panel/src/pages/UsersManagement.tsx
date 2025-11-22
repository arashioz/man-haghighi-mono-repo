import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { usersService, coursesService } from '../services/api';
import { User, Course } from '../types';

const AddIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PeopleIcon = () => (
  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

type TabType = 'users' | 'sales-managers' | 'sales-persons' | 'site-managers';

const UsersManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCoursesCount, setUserCoursesCount] = useState<{[userId: string]: number}>({});
  const [userProductsCount, setUserProductsCount] = useState<{[userId: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedUserForProducts, setSelectedUserForProducts] = useState<User | null>(null);
  const [selectedUserProductsData, setSelectedUserProductsData] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    phone: '',
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'USER' as 'ADMIN' | 'SALES_MANAGER' | 'SALES_PERSON' | 'USER',
    isActive: true,
    selectedCourses: [] as string[],
  });
  const [editingUserCourses, setEditingUserCourses] = useState<string[]>([]);

  const tabs = [
    { id: 'users' as TabType, label: 'کاربران', role: 'USER' },
    { id: 'sales-managers' as TabType, label: 'مدیران فروش', role: 'SALES_MANAGER' },
    { id: 'sales-persons' as TabType, label: 'فروشنده‌ها', role: 'SALES_PERSON' },
    { id: 'site-managers' as TabType, label: 'مدیرهای سایت', role: 'ADMIN' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const roleFilter = tabs.find(t => t.id === activeTab)?.role;
        const [usersResponse, coursesResponse] = await Promise.all([
          usersService.getAll({
            page: currentPage,
            limit,
            search: searchTerm || undefined,
            role: roleFilter,
          }),
          coursesService.getAll(),
        ]);
        
        setUsers(usersResponse.data);
        setTotal(usersResponse.meta.total);
        setTotalPages(usersResponse.meta.totalPages);
        setCourses(coursesResponse);
        
        // Fetch all counts in parallel for MUCH better performance
        const coursesCountData: {[userId: string]: number} = {};
        const productsCountData: {[userId: string]: number} = {};
        
        // Create array of promises for parallel execution
        const userDataPromises = usersResponse.data.map(async (user) => {
          try {
            // Get courses count
            const userCoursesResponse = await usersService.getUserCourses(user.id);
            coursesCountData[user.id] = userCoursesResponse.length;
            
            // Get products count (only for old users)
            if (user.isOld) {
              try {
                const userProductsResponse = await usersService.getUserWithProducts(user.id);
                productsCountData[user.id] = userProductsResponse.oldProducts?.length || 0;
              } catch (err) {
                productsCountData[user.id] = 0;
              }
            }
          } catch (err) {
            console.error(`Failed to fetch data for user ${user.id}:`, err);
            coursesCountData[user.id] = 0;
            productsCountData[user.id] = 0;
          }
        });
        
        // Wait for all requests to complete in parallel
        await Promise.all(userDataPromises);
        
        setUserCoursesCount(coursesCountData);
        setUserProductsCount(productsCountData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت داده‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, currentPage, limit, searchTerm]);
  
  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleDelete = async (id: string, userName: string) => {
    if (!window.confirm(`آیا از حذف "${userName}" اطمینان دارید؟\n\nاین عمل غیرقابل بازگشت است و تمام اطلاعات مربوط به این کاربر حذف خواهد شد.`)) {
      return;
    }

    try {
      await usersService.remove(id);
      setUsers(users.filter(user => user.id !== id));
      // Remove user courses and products counts from state
      setUserCoursesCount(prev => {
        const newCounts = { ...prev };
        delete newCounts[id];
        return newCounts;
      });
      setUserProductsCount(prev => {
        const newCounts = { ...prev };
        delete newCounts[id];
        return newCounts;
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف کاربر');
    }
  };

  // Phone validation function (matches backend normalizePhone logic)
  const validatePhone = (phone: string): boolean => {
    if (!phone || !phone.trim()) {
      return false;
    }

    let digits = phone.trim().replace(/[^\d+]/g, '');

    if (!digits) {
      return false;
    }

    if (digits.startsWith('+98')) {
      digits = '0' + digits.slice(3);
    } else if (digits.startsWith('98') && digits.length >= 11) {
      digits = '0' + digits.slice(2);
    } else if (!digits.startsWith('0') && digits.length === 10) {
      digits = '0' + digits;
    }

    if (digits.length > 11) {
      digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
    }

    return /^0\d{9,10}$/.test(digits);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    
    if (!newUser.username.trim()) {
      setError('نام کاربری الزامی است');
      return;
    }
    
    if (!newUser.password.trim()) {
      setError('رمز عبور الزامی است');
      return;
    }
    
    if (newUser.password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    
    // Validate role-specific requirements
    if (newUser.role === 'ADMIN' && !newUser.email.trim()) {
      setError('مدیران باید ایمیل داشته باشند');
      return;
    }
    
    if (newUser.role !== 'ADMIN' && !newUser.phone.trim()) {
      setError('کاربران غیرمدیر باید شماره تلفن داشته باشند');
      return;
    }

    // Validate phone number format for non-admin users
    if (newUser.role !== 'ADMIN' && newUser.phone.trim() && !validatePhone(newUser.phone)) {
      setError('فرمت شماره تلفن نامعتبر است. شماره باید با 0 شروع شود و 10 یا 11 رقم داشته باشد (مثال: 09123456789)');
      return;
    }
    
    try {
      const userData: any = {
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
        isActive: newUser.isActive,
      };

      if (newUser.phone.trim()) userData.phone = newUser.phone.trim();
      if (newUser.email.trim()) userData.email = newUser.email.trim();
      if (newUser.firstName.trim()) userData.firstName = newUser.firstName.trim();
      if (newUser.lastName.trim()) userData.lastName = newUser.lastName.trim();

      const createdUser = await usersService.create(userData);
      setUsers([...users, createdUser]);
      
      if (newUser.selectedCourses.length > 0) {
        await usersService.assignCourses(createdUser.id, newUser.selectedCourses);
        // Update courses count
        setUserCoursesCount(prev => ({
          ...prev,
          [createdUser.id]: newUser.selectedCourses.length
        }));
      } else {
        setUserCoursesCount(prev => ({
          ...prev,
          [createdUser.id]: 0
        }));
      }
      
      setIsModalOpen(false);
      setNewUser({
        phone: '',
        email: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'USER',
        isActive: true,
        selectedCourses: [],
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد کاربر');
    }
  };

  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
    
    try {
      const userCourses = await usersService.getUserCourses(user.id);
      const courseIds = userCourses
        .map((item: any) => {
          // If it's an enrollment object with a course property
          if (item.course && item.course.id) {
            return item.course.id;
          }
          // If it's directly a course object
          if (item.id) {
            return item.id;
          }
          return null;
        })
        .filter((id: any) => id !== null);
      setEditingUserCourses(courseIds);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت دوره‌های کاربر');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setError(''); // Clear any previous errors

    // Validate phone number format if provided and user is not admin
    if (editingUser.role !== 'ADMIN' && editingUser.phone && editingUser.phone.trim() && !validatePhone(editingUser.phone)) {
      setError('فرمت شماره تلفن نامعتبر است. شماره باید با 0 شروع شود و 10 یا 11 رقم داشته باشد (مثال: 09123456789)');
      return;
    }
    
    try {
      // Only send editable fields
      const updateData = {
        username: editingUser.username,
        phone: editingUser.phone,
        email: editingUser.email,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        isActive: editingUser.isActive,
      };
      
      const updatedUser = await usersService.update(editingUser.id, updateData);
      setUsers(users.map(user => user.id === editingUser.id ? updatedUser : user));
      
      await usersService.assignCourses(editingUser.id, editingUserCourses);
      
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditingUserCourses([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در به‌روزرسانی کاربر');
    }
  };

  const handleViewProducts = async (user: User) => {
    setSelectedUserForProducts(user);
    setIsProductsModalOpen(true);
    
    try {
      const userData = await usersService.getUserWithProducts(user.id);
      setSelectedUserProductsData(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت محصولات کاربر');
      setSelectedUserProductsData(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { text: 'مدیر سایت', color: 'bg-red-100 text-red-800' },
      SALES_MANAGER: { text: 'مدیر فروش', color: 'bg-blue-100 text-blue-800' },
      SALES_PERSON: { text: 'فروشنده', color: 'bg-green-100 text-green-800' },
      USER: { text: 'کاربر', color: 'bg-gray-100 text-gray-800' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.USER;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTabTitle = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.label || 'کاربران';
  };

  const getAddButtonText = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.label || 'کاربر';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const AddButton = () => (
    <button 
      onClick={() => {
        setError('');
        setIsModalOpen(true);
      }}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
    >
      <AddIcon />
      <span className="mr-2">{getAddButtonText()} جدید</span>
    </button>
  );

  return (
    <div>
      <PageHeader 
        title="مدیریت کاربران" 
        description="مدیریت تمام کاربران سیستم با دسته‌بندی بر اساس نقش"
        action={<AddButton />}
      />

      {error && (
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
      )}

      {}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 space-x-reverse px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {}
      <div className="mb-6 flex items-center justify-between gap-4 relative z-10">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={`جستجو در ${getTabTitle()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {!loading && total > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
            <span className="text-sm text-gray-600">تعداد کل:</span>
            <span className="text-lg font-bold text-blue-600">{total.toLocaleString('fa-IR')}</span>
            <span className="text-sm text-gray-600">{getTabTitle()}</span>
          </div>
        )}
      </div>

      {}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-48 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getTabTitle()}
                </th>
                <th className="w-24 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نقش
                </th>
                <th className="w-36 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تماس
                </th>
                <th className="w-28 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  دوره‌ها
                </th>
                <th className="w-28 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  محصولات <span className="text-red-600 font-bold">قدیمی</span>
                </th>
                <th className="w-20 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="w-28 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاریخ
                </th>
                <th className="w-24 px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                          {user.firstName?.[0] || user.phone?.[0] || 'U'}
                        </div>
                      </div>
                      <div className="mr-2 min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-xs text-gray-900 truncate" title={user.phone}>{user.phone}</div>
                    <div className="text-xs text-gray-500 truncate" title={user.email}>{user.email}</div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {userCoursesCount[user.id] > 0 ? (
                      <button
                        onClick={() => handleViewProducts(user)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        {userCoursesCount[user.id]}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {user.isOld && userProductsCount[user.id] > 0 ? (
                      <button
                        onClick={() => handleViewProducts(user)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200"
                      >
                        {userProductsCount[user.id]}
                      </button>
                    ) : user.isOld ? (
                      <button
                        onClick={() => handleViewProducts(user)}
                        className="text-orange-600 hover:text-orange-800 text-xs"
                      >
                        نمایش
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex justify-center gap-1">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="ویرایش"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="حذف"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <EmptyState
              icon={<PeopleIcon />}
              title="کاربری یافت نشد"
              description={`${getTabTitle()}ی با این فیلترها یافت نشد.`}
            />
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between mt-4">
          <div className="flex-1 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              نمایش <span className="font-medium">{((currentPage - 1) * limit) + 1}</span> تا{' '}
              <span className="font-medium">
                {Math.min(currentPage * limit, total)}
              </span>{' '}
              از <span className="font-medium">{total}</span> نتیجه
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                قبلی
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                بعدی
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Products Modal */}
      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setSelectedUserForProducts(null);
          setSelectedUserProductsData(null);
        }}
        title={`محصولات و دوره‌های ${selectedUserForProducts?.firstName} ${selectedUserForProducts?.lastName}`}
        size="large"
      >
        {selectedUserProductsData ? (
          <div className="space-y-6">
            {/* Old Products */}
            {selectedUserProductsData.oldProducts && selectedUserProductsData.oldProducts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full ml-2"></span>
                  محصولات <span className="text-red-600 font-bold mx-1">قدیمی</span> ({selectedUserProductsData.oldProducts.length})
                </h3>
                <div className="space-y-2">
                  {selectedUserProductsData.oldProducts.map((product: any, idx: number) => (
                    <div key={product.id || idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{product.productName || product.name || 'محصول بدون نام'}</h4>
                          {product.productCategory && (
                            <p className="text-sm text-gray-500 mt-1">دسته: {product.productCategory}</p>
                          )}
                          {product.productId && (
                            <p className="text-xs text-gray-400 mt-1">شناسه: {product.productId}</p>
                          )}
                        </div>
                        {product.importedAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(product.importedAt).toLocaleDateString('fa-IR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Purchased Courses */}
            {selectedUserProductsData.purchasedCourses && selectedUserProductsData.purchasedCourses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                  دوره‌های خریداری شده ({selectedUserProductsData.purchasedCourses.length})
                </h3>
                <div className="space-y-4">
                  {selectedUserProductsData.purchasedCourses.map((enrollment: any) => (
                    <div key={enrollment.id || enrollment.course?.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {enrollment.course && (
                        <>
                          <div className="bg-gray-50 p-4 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 text-lg">{enrollment.course.title}</h4>
                                {enrollment.course.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{enrollment.course.description}</p>
                                )}
                              </div>
                              <div className="text-left mr-4 flex-shrink-0">
                                {enrollment.course.price && (
                                  <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
                                    {enrollment.course.price.toLocaleString()} تومان
                                  </span>
                                )}
                                {enrollment.enrolledAt && (
                                  <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">
                                    {new Date(enrollment.enrolledAt).toLocaleDateString('fa-IR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            {/* Videos Section */}
                            {enrollment.course.videos && enrollment.course.videos.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  ویدیوهای دوره ({enrollment.course.videos.length})
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {enrollment.course.videos.map((video: any, idx: number) => (
                                    <div key={video.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                                        {idx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-gray-900 truncate">{video.title}</p>
                                        {video.duration && (
                                          <p className="text-xs text-gray-500">
                                            {Math.floor(video.duration / 60)} دقیقه
                                          </p>
                                        )}
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded ${video.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {video.published ? 'منتشر شده' : 'پیش‌نویس'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Attachments Section */}
                            {enrollment.course.attachments && enrollment.course.attachments.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  فایل‌های ضمیمه ({enrollment.course.attachments.length})
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {enrollment.course.attachments.map((attachment: string, idx: number) => {
                                    const fileName = attachment.split('/').pop() || attachment;
                                    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                                    return (
                                      <a 
                                        key={idx}
                                        href={attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm hover:bg-green-100 transition-colors"
                                      >
                                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-gray-900 truncate">{fileName}</p>
                                          <p className="text-xs text-gray-500 uppercase">{fileExt}</p>
                                        </div>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {(!enrollment.course.videos || enrollment.course.videos.length === 0) && 
                             (!enrollment.course.attachments || enrollment.course.attachments.length === 0) && (
                              <p className="text-sm text-gray-500 text-center py-4">
                                هیچ محتوای اضافی برای این دوره موجود نیست
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!selectedUserProductsData.oldProducts || selectedUserProductsData.oldProducts.length === 0) &&
             (!selectedUserProductsData.purchasedCourses || selectedUserProductsData.purchasedCourses.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">این کاربر محصول یا دوره‌ای ندارد.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">در حال بارگذاری...</p>
          </div>
        )}
      </Modal>
      
      {users.length === 0 && loading && (
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
            title={`${getTabTitle()}ی یافت نشد`}
            description={searchTerm ? `هیچ ${getTabTitle()}ی با این مشخصات یافت نشد.` : `هنوز ${getTabTitle()}ی ثبت نشده است.`}
            action={!searchTerm ? <AddButton /> : undefined}
          />
        )}
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${getAddButtonText()} جدید`}
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام
            </label>
            <input
              type="text"
              value={newUser.firstName}
              onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام خانوادگی
            </label>
            <input
              type="text"
              value={newUser.lastName}
              onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام کاربری <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="نام کاربری منحصر به فرد"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              شماره تلفن {newUser.role !== 'ADMIN' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="tel"
              value={newUser.phone}
              onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={newUser.role !== 'ADMIN'}
              disabled={newUser.role === 'ADMIN'}
            />
            {newUser.role === 'ADMIN' && (
              <p className="text-xs text-gray-500 mt-1">مدیران فقط با ایمیل وارد می‌شوند</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ایمیل {newUser.role === 'ADMIN' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={newUser.role === 'ADMIN'}
              disabled={newUser.role !== 'ADMIN'}
            />
            {newUser.role !== 'ADMIN' && (
              <p className="text-xs text-gray-500 mt-1">کاربران عادی فقط با شماره تلفن وارد می‌شوند</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رمز عبور
            </label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نقش
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value as 'ADMIN' | 'SALES_MANAGER' | 'SALES_PERSON' | 'USER'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="USER">کاربر</option>
              <option value="SALES_PERSON">فروشنده</option>
              <option value="SALES_MANAGER">مدیر فروش</option>
              <option value="ADMIN">مدیر سایت</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              دوره‌های اختصاصی
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`new-course-${course.id}`}
                    checked={newUser.selectedCourses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewUser({...newUser, selectedCourses: [...newUser.selectedCourses, course.id]});
                      } else {
                        setNewUser({...newUser, selectedCourses: newUser.selectedCourses.filter(id => id !== course.id)});
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`new-course-${course.id}`} className="mr-2 block text-sm text-gray-900 cursor-pointer">
                    {course.title}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={newUser.isActive}
              onChange={(e) => setNewUser({...newUser, isActive: e.target.checked})}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
            >
              ایجاد {getAddButtonText()}
            </button>
          </div>
        </form>
      </Modal>

      {}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش کاربر"
      >
        {editingUser ? (
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام
              </label>
              <input
                type="text"
                value={editingUser.firstName || ''}
                onChange={(e) => editingUser && setEditingUser({...editingUser, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام خانوادگی
              </label>
              <input
                type="text"
                value={editingUser.lastName || ''}
                onChange={(e) => editingUser && setEditingUser({...editingUser, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام کاربری <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingUser.username || ''}
                onChange={(e) => editingUser && setEditingUser({...editingUser, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="نام کاربری منحصر به فرد"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شماره تلفن
              </label>
              <input
                type="tel"
                value={editingUser.phone || ''}
                onChange={(e) => editingUser && setEditingUser({...editingUser, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ایمیل
              </label>
              <input
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => editingUser && setEditingUser({...editingUser, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نقش
              </label>
              <select
                value={editingUser.role}
                onChange={(e) => editingUser && setEditingUser({...editingUser, role: e.target.value as 'ADMIN' | 'SALES_MANAGER' | 'SALES_PERSON' | 'USER'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USER">کاربر</option>
                <option value="SALES_PERSON">فروشنده</option>
                <option value="SALES_MANAGER">مدیر فروش</option>
                <option value="ADMIN">مدیر سایت</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                دوره‌های اختصاصی
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`edit-course-${course.id}`}
                      checked={editingUserCourses.includes(course.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingUserCourses([...editingUserCourses, course.id]);
                        } else {
                          setEditingUserCourses(editingUserCourses.filter(id => id !== course.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`edit-course-${course.id}`} className="mr-2 block text-sm text-gray-900 cursor-pointer">
                      {course.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editingUser.isActive}
                onChange={(e) => editingUser && setEditingUser({...editingUser, isActive: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="mr-2 block text-sm text-gray-900">
                فعال
              </label>
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
              >
                به‌روزرسانی کاربر
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
};

export default UsersManagement;
