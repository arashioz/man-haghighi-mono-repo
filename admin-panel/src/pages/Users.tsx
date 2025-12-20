import React, { useState, useEffect } from 'react';
import { usersService, coursesService } from '../services/api';
import { User, Course } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { truncateWords } from '../utils/text';

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

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCoursesCount, setUserCoursesCount] = useState<{[userId: string]: number}>({});
  const [userProductsCount, setUserProductsCount] = useState<{[userId: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  // این صفحه فقط برای «کاربران عادی سایت» است، پس نقش را روی USER قفل می‌کنیم
  const [roleFilter, setRoleFilter] = useState<string>('USER');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedUserForProducts, setSelectedUserForProducts] = useState<User | null>(null);
  const [selectedUserProductsData, setSelectedUserProductsData] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    education: '',
    university: '',
    job: '',
    state: '',
    gender: '',
    role: 'USER' as 'ADMIN' | 'SALES_MANAGER' | 'SALES_PERSON' | 'USER',
    isActive: true,
    selectedCourses: [] as string[],
  });
  const [editingUserCourses, setEditingUserCourses] = useState<string[]>([]);
  
  // Export filters
  const [exportFilters, setExportFilters] = useState({
    userType: 'all' as 'all' | 'old' | 'new',
    startDate: '',
    endDate: '',
    role: 'USER',
  });
  const [exporting, setExporting] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch courses once on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesData = await coursesService.getAll();
        setCourses(coursesData);
      } catch (err: any) {
        console.error('Failed to fetch courses:', err);
      }
    };

    fetchCourses();
  }, []);

  // Fetch users when pagination/filter changes
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersResponse = await usersService.getAll({ 
          page: currentPage, 
          limit: itemsPerPage, 
          search: debouncedSearchTerm,
          // همیشه فقط کاربران عادی (USER) را دریافت می‌کنیم
          role: 'USER',
        });
        
        setUsers(usersResponse.data);
        setTotalPages(usersResponse.meta.totalPages);
        setTotalUsers(usersResponse.meta.total);
        
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

    fetchUsers();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, roleFilter]);

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      const blob = await usersService.exportUsers(exportFilters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      let filename = `users_export_${date}`;
      if (exportFilters.userType !== 'all') {
        filename += `_${exportFilters.userType}`;
      }
      if (exportFilters.startDate || exportFilters.endDate) {
        filename += `_${exportFilters.startDate || 'start'}_${exportFilters.endDate || 'end'}`;
      }
      if (exportFilters.role) {
        filename += `_${exportFilters.role}`;
      }
      filename += '.xlsx';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در دانلود فایل Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
      try {
        await usersService.delete(id);
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
    
    // Validate password for USER role
    if (newUser.role === 'USER') {
      if (!newUser.password.trim()) {
        setError('رمز عبور الزامی است');
        return;
      }
      
      if (newUser.password.length < 6) {
        setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
        return;
      }
      
      if (!newUser.confirmPassword.trim()) {
        setError('تأیید رمز عبور الزامی است');
        return;
      }
      
      if (newUser.password !== newUser.confirmPassword) {
        setError('رمز عبور و تأیید رمز عبور مطابقت ندارند');
        return;
      }
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
        role: newUser.role,
        isActive: newUser.isActive,
      };

      if (newUser.phone.trim()) userData.phone = newUser.phone.trim();
      if (newUser.email.trim()) userData.email = newUser.email.trim();
      if (newUser.firstName.trim()) userData.firstName = newUser.firstName.trim();
      if (newUser.lastName.trim()) userData.lastName = newUser.lastName.trim();
      if (newUser.education.trim()) userData.education = newUser.education.trim();
      if (newUser.university.trim()) userData.university = newUser.university.trim();
      if (newUser.job.trim()) userData.job = newUser.job.trim();
      if (newUser.state.trim()) userData.state = newUser.state.trim();
      if (newUser.gender.trim()) userData.gender = newUser.gender.trim();
      if (newUser.role === 'USER' && newUser.password.trim()) {
        userData.password = newUser.password;
        userData.confirmPassword = newUser.confirmPassword;
      }

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
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        education: '',
        university: '',
        job: '',
        state: '',
        gender: '',
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
        education: editingUser.education,
        university: editingUser.university,
        job: editingUser.job,
        state: editingUser.state,
        gender: editingUser.gender,
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

  // Search is now handled by the backend
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // در این نسخه فقط کاربران عادی نمایش داده می‌شوند، پس تغییر نقش از طریق UI غیرفعال است
  const handleRoleFilterChange = (_value: string) => {
    setRoleFilter('USER');
    setCurrentPage(1);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { text: 'مدیر', color: 'bg-red-100 text-red-800' },
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

  const profileFieldsConfig = [
    { key: 'education', label: 'تحصیلات' },
    { key: 'university', label: 'دانشگاه' },
    { key: 'job', label: 'شغل' },
    { key: 'state', label: 'استان' },
    { key: 'gender', label: 'جنسیت' },
  ] as const;

  const getMissingProfileFields = (user: User) =>
    profileFieldsConfig.filter((field) => {
      const value = user[field.key as keyof User];
      return !value;
    });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مدیریت کاربران</h1>
          <p className="text-gray-600 mt-1">لیست تمام کاربران سیستم</p>
        </div>
        <button 
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <AddIcon />
          <span className="mr-2">کاربر جدید</span>
        </button>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تحصیلات
              </label>
              <input
                type="text"
                value={newUser.education}
                onChange={(e) => setNewUser({...newUser, education: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثلاً: کارشناسی ارشد"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                دانشگاه
              </label>
              <input
                type="text"
                value={newUser.university}
                onChange={(e) => setNewUser({...newUser, university: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="نام دانشگاه"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شغل
              </label>
              <input
                type="text"
                value={newUser.job}
                onChange={(e) => setNewUser({...newUser, job: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="عنوان شغلی"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                استان
              </label>
              <input
                type="text"
                value={newUser.state}
                onChange={(e) => setNewUser({...newUser, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="محل سکونت"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              جنسیت
            </label>
            <select
              value={newUser.gender}
              onChange={(e) => setNewUser({...newUser, gender: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">انتخاب نشده</option>
              <option value="female">زن</option>
              <option value="male">مرد</option>
              <option value="other">سایر</option>
            </select>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="جستجو در کاربران..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {/* این دراپ‌داون فقط جهت نمایش است و روی نقش USER قفل شده */}
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
          disabled
        >
          <option value="USER">فقط کاربران عادی سایت</option>
        </select>
        {!loading && totalUsers > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
            <span className="text-sm text-gray-600">تعداد کل:</span>
            <span className="text-lg font-bold text-blue-600">{totalUsers.toLocaleString('fa-IR')}</span>
            <span className="text-sm text-gray-600">کاربر</span>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">خروجی Excel</h3>
          <button
            onClick={handleExportUsers}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>در حال تولید...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>دانلود Excel</span>
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* User Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نوع کاربر
            </label>
            <select
              value={exportFilters.userType}
              onChange={(e) => setExportFilters({...exportFilters, userType: e.target.value as 'all' | 'old' | 'new'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">همه</option>
              <option value="old">قدیمی</option>
              <option value="new">جدید</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              از تاریخ
            </label>
            <input
              type="date"
              value={exportFilters.startDate}
              onChange={(e) => setExportFilters({...exportFilters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تا تاریخ
            </label>
            <input
              type="date"
              value={exportFilters.endDate}
              onChange={(e) => setExportFilters({...exportFilters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نقش
            </label>
            <select
              value={exportFilters.role}
              onChange={(e) => setExportFilters({...exportFilters, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="USER">کاربر</option>
              <option value="ADMIN">مدیر</option>
              <option value="SALES_MANAGER">مدیر فروش</option>
              <option value="SALES_PERSON">فروشنده</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-1/5 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کاربر
                </th>
                <th className="w-1/12 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نقش
                </th>
                <th className="w-1/6 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  دوره‌های دسترسی
                </th>
                <th className="w-1/6 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  محصولات <span className="text-red-600 font-bold">قدیمی</span>
                </th>
                <th className="w-1/12 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="w-1/8 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاریخ عضویت
                </th>
                <th className="w-1/12 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {user.firstName?.[0] || user.phone?.[0] || 'U'}
                        </div>
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.phone || user.email}
                        </div>
                      {user.isOld && (
                        <div className="mt-1 text-xs">
                          {getMissingProfileFields(user).length === 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700">
                              پروفایل تکمیل شده
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                              نیاز به تکمیل: {getMissingProfileFields(user).map((field) => field.label).join('، ')}
                            </span>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {userCoursesCount[user.id] > 0 ? (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {userCoursesCount[user.id]} دوره
                          </span>
                          <button
                            onClick={() => handleViewProducts(user)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            مشاهده
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">هیچ دوره‌ای</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.isOld && userProductsCount[user.id] > 0 ? (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {userProductsCount[user.id]} محصول
                          </span>
                          <button
                            onClick={() => handleViewProducts(user)}
                            className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                          >
                            مشاهده
                          </button>
                        </>
                      ) : user.isOld ? (
                        <button
                          onClick={() => handleViewProducts(user)}
                          className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                        >
                          مشاهده
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
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
        
        {users.length === 0 && (
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
            title="کاربری یافت نشد"
            description={searchTerm || roleFilter ? 'هیچ کاربری با این مشخصات یافت نشد.' : 'هنوز کاربری ثبت نشده است.'}
            action={!searchTerm && !roleFilter ? (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <AddIcon />
                <span className="mr-2">کاربر جدید</span>
              </button>
            ) : undefined}
          />
        )}
      </div>

      {/* Pagination */}
      {users.length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              نمایش {((currentPage - 1) * itemsPerPage) + 1} تا {Math.min(currentPage * itemsPerPage, totalUsers)} از {totalUsers} کاربر
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-700">در هر صفحه</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              اولین
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              قبلی
            </button>
            
            <div className="flex items-center gap-1">
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
                    className={`px-3 py-1 border rounded text-sm ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              بعدی
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              آخرین
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="کاربر جدید"
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
          {newUser.role === 'USER' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رمز عبور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                  placeholder="حداقل ۶ کاراکتر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تأیید رمز عبور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                  placeholder="تأیید رمز عبور"
                />
              </div>
            </>
          )}
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
              <option value="ADMIN">مدیر</option>
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
              ایجاد کاربر
            </button>
          </div>
        </form>
      </Modal>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUserProductsData.purchasedCourses.map((enrollment: any) => (
                    <div key={enrollment.id || enrollment.course?.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      {enrollment.course && (
                        <>
                          <h4 className="font-medium text-gray-900">{enrollment.course.title}</h4>
                          {enrollment.course.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              {truncateWords(enrollment.course.description, 20)}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-3">
                            {enrollment.course.price && (
                              <span className="text-sm font-medium text-blue-600">
                                {enrollment.course.price.toLocaleString()} تومان
                              </span>
                            )}
                            {enrollment.enrolledAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(enrollment.enrolledAt).toLocaleDateString('fa-IR')}
                              </span>
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

      {}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش کاربر"
      >
        {editingUser && (
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام
              </label>
              <input
                type="text"
                value={editingUser.firstName || ''}
                onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
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
                onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
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
                onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
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
                value={editingUser.phone}
                onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
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
                value={editingUser.email}
                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تحصیلات
                </label>
                <input
                  type="text"
                  value={editingUser.education || ''}
                  onChange={(e) => setEditingUser({...editingUser, education: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثلاً: کارشناسی ارشد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  دانشگاه
                </label>
                <input
                  type="text"
                  value={editingUser.university || ''}
                  onChange={(e) => setEditingUser({...editingUser, university: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="نام دانشگاه"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  شغل
                </label>
                <input
                  type="text"
                  value={editingUser.job || ''}
                  onChange={(e) => setEditingUser({...editingUser, job: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="عنوان شغلی"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  استان
                </label>
                <input
                  type="text"
                  value={editingUser.state || ''}
                  onChange={(e) => setEditingUser({...editingUser, state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="محل سکونت"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                جنسیت
              </label>
              <select
                value={editingUser.gender || ''}
                onChange={(e) => setEditingUser({...editingUser, gender: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">انتخاب نشده</option>
                <option value="female">زن</option>
                <option value="male">مرد</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نقش
              </label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'ADMIN' | 'SALES_MANAGER' | 'SALES_PERSON' | 'USER'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USER">کاربر</option>
                <option value="SALES_PERSON">فروشنده</option>
                <option value="SALES_MANAGER">مدیر فروش</option>
                <option value="ADMIN">مدیر</option>
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
                onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
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
        )}
      </Modal>
    </div>
  );
};

export default Users;