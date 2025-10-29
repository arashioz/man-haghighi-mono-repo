import React, { useState, useEffect } from 'react';
import { usersService, coursesService } from '../services/api';
import { User, Course } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

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
  const [userCourses, setUserCourses] = useState<{[userId: string]: Course[]}>({});
  const [userProducts, setUserProducts] = useState<{[userId: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [roleFilter, setRoleFilter] = useState<string>('');
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
          role: roleFilter || undefined 
        });
        
        setUsers(usersResponse.data);
        setTotalPages(usersResponse.meta.totalPages);
        setTotalUsers(usersResponse.meta.total);
        
        // Fetch courses and products for each user
        const userCoursesData: {[userId: string]: Course[]} = {};
        const userProductsData: {[userId: string]: any[]} = {};
        
        for (const user of usersResponse.data) {
          try {
            // Fetch courses
            const userCoursesResponse = await usersService.getUserCourses(user.id);
            userCoursesData[user.id] = userCoursesResponse.map((enrollment: any) => enrollment.course);
            
            // Fetch products (only for old users)
            if (user.isOld) {
              try {
                const userProductsResponse = await usersService.getUserWithProducts(user.id);
                userProductsData[user.id] = userProductsResponse.oldProducts || [];
              } catch (err) {
                userProductsData[user.id] = [];
              }
            }
          } catch (err) {
            console.error(`Failed to fetch data for user ${user.id}:`, err);
            userCoursesData[user.id] = [];
            userProductsData[user.id] = [];
          }
        }
        
        setUserCourses(userCoursesData);
        setUserProducts(userProductsData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت داده‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, roleFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
      try {
        await usersService.delete(id);
        setUsers(users.filter(user => user.id !== id));
        // Remove user courses and products from state
        setUserCourses(prev => {
          const newUserCourses = { ...prev };
          delete newUserCourses[id];
          return newUserCourses;
        });
        setUserProducts(prev => {
          const newUserProducts = { ...prev };
          delete newUserProducts[id];
          return newUserProducts;
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
        // Update user courses in state
        const userCoursesResponse = await usersService.getUserCourses(createdUser.id);
        setUserCourses(prev => ({
          ...prev,
          [createdUser.id]: userCoursesResponse.map((enrollment: any) => enrollment.course)
        }));
      } else {
        setUserCourses(prev => ({
          ...prev,
          [createdUser.id]: []
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
      const courseIds = userCourses.map((enrollment: any) => enrollment.course.id);
      setEditingUserCourses(courseIds);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت دوره‌های کاربر');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updatedUser = await usersService.update(editingUser.id, editingUser);
      setUsers(users.map(user => user.id === editingUser.id ? updatedUser : user));
      
      await usersService.assignCourses(editingUser.id, editingUserCourses);
      
      // Update user courses in state
      const userCoursesResponse = await usersService.getUserCourses(editingUser.id);
      setUserCourses(prev => ({
        ...prev,
        [editingUser.id]: userCoursesResponse.map((enrollment: any) => enrollment.course)
      }));
      
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

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
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
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">همه نقش‌ها</option>
          <option value="USER">کاربر</option>
          <option value="SALES_PERSON">فروشنده</option>
          <option value="SALES_MANAGER">مدیر فروش</option>
          <option value="ADMIN">مدیر</option>
        </select>
        {!loading && totalUsers > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
            <span className="text-sm text-gray-600">تعداد کل:</span>
            <span className="text-lg font-bold text-blue-600">{totalUsers.toLocaleString('fa-IR')}</span>
            <span className="text-sm text-gray-600">کاربر</span>
          </div>
        )}
      </div>

      {}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کاربر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نقش
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  دوره‌های دسترسی
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  محصولات <span className="text-red-600 font-bold">قدیمی</span>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاریخ عضویت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {userCourses[user.id] && userCourses[user.id].length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userCourses[user.id].slice(0, 3).map((course) => (
                            <span
                              key={course.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {course.title}
                            </span>
                          ))}
                          {userCourses[user.id].length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              +{userCourses[user.id].length - 3} بیشتر
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">هیچ دوره‌ای</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {user.isOld && userProducts[user.id] && userProducts[user.id].length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1 flex-1">
                            {userProducts[user.id].slice(0, 2).map((product: any, idx: number) => (
                              <span
                                key={product.id || idx}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                              >
                                {product.productName || product.name || 'محصول'}
                              </span>
                            ))}
                            {userProducts[user.id].length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                +{userProducts[user.id].length - 2}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleViewProducts(user)}
                            className="text-orange-600 hover:text-orange-800 text-xs"
                            title="مشاهده همه محصولات"
                          >
                            مشاهده
                          </button>
                        </div>
                      ) : user.isOld ? (
                        <button
                          onClick={() => handleViewProducts(user)}
                          className="text-orange-600 hover:text-orange-800 text-xs"
                        >
                          مشاهده محصولات
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
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
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
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{enrollment.course.description}</p>
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