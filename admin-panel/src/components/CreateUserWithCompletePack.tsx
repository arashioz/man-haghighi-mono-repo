import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  thumbnail?: string;
  price: number;
  published: boolean;
}

const CreateUserWithCompletePack: React.FC = () => {
  const navigate = useNavigate();
  
  // User form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    isActive: true,
  });
  
  // Courses state
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isCompletePack, setIsCompletePack] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setFetchingCourses(true);
      const response = await fetch('/api/courses?published=true', {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      const data = await response.json();
      setAllCourses(data.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setFetchingCourses(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Handle "Complete Pack" checkbox
  const handleCompletePackChange = (checked: boolean) => {
    setIsCompletePack(checked);
    if (checked) {
      // Select ALL published courses
      const allCourseIds = allCourses
        .filter(c => c.published)
        .map(c => c.id);
      setSelectedCourses(allCourseIds);
    } else {
      // Deselect all
      setSelectedCourses([]);
    }
  };

  // Handle individual course selection
  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => {
      const newSelection = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
      
      // Update complete pack checkbox based on selection
      const publishedCourses = allCourses.filter(c => c.published);
      setIsCompletePack(newSelection.length === publishedCourses.length && publishedCourses.length > 0);
      
      return newSelection;
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.firstName || !formData.lastName) {
      setError('نام و نام خانوادگی الزامی است');
      return false;
    }
    
    if (!formData.phone && !formData.email) {
      setError('شماره موبایل یا ایمیل الزامی است');
      return false;
    }
    
    if (formData.password && formData.password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیست');
      return false;
    }
    
    return true;
  };

  // Create user and assign courses
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Step 1: Create the user
      const createUserResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          email: formData.email || null,
          username: formData.username || undefined,
          password: formData.password || undefined,
          role: formData.role,
          isActive: formData.isActive,
        })
      });
      
      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.message || 'خطا در ایجاد کاربر');
      }
      
      const newUser = await createUserResponse.json();
      
      // Step 2: Assign courses if any selected
      let assignedCourses = 0;
      if (selectedCourses.length > 0) {
        if (isCompletePack) {
          // Use the complete pack API
          const assignResponse = await fetch(`/api/admin/users/${newUser.id}/assign-all-courses`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (assignResponse.ok) {
            const result = await assignResponse.json();
            assignedCourses = result.assigned;
          }
        } else {
          // Assign individual courses
          const assignResponse = await fetch(`/api/users/${newUser.id}/courses`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseIds: selectedCourses })
          });
          
          if (assignResponse.ok) {
            assignedCourses = selectedCourses.length;
          }
        }
      }
      
      setSuccess(`کاربر ${formData.firstName} ${formData.lastName} با موفقیت ایجاد شد! ${assignedCourses > 0 ? `(${assignedCourses} دوره اختصاص داده شد)` : ''}`);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد کاربر');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingCourses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ایجاد کاربر جدید</h1>
        <button
          onClick={() => navigate('/admin/users')}
          className="text-gray-600 hover:text-gray-800"
        >
          ← بازگشت به لیست
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - User Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="ml-2">👤</span>
              اطلاعات کاربر
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نام *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نام خانوادگی *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شماره موبایل
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="مثال: 09123456789"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ایمیل
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="example@email.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام کاربری (اختیاری)
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رمز عبور
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تکرار رمز عبور
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نقش
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="USER">کاربر عادی</option>
                <option value="SALES_PERSON">فروشنده</option>
                <option value="SALES_MANAGER">مدیر فروش</option>
              </select>
            </div>

            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label className="mr-2 text-sm font-medium text-gray-700">
                کاربر فعال باشد
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Courses Selection */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="ml-2">📚</span>
              اختصاص دوره‌ها
            </h2>
            
            {/* Complete Pack Checkbox */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg mb-4 border border-purple-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompletePack}
                  onChange={(e) => handleCompletePackChange(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="mr-3 text-lg font-semibold text-purple-900">
                  📦 پک کامل
                </span>
              </label>
              <p className="text-sm text-purple-700 mr-8 mt-1">
                با تیک زدن این گزینه، تمام {allCourses.filter(c => c.published).length} دوره منتشر شده به کاربر اختصاص داده می‌شود
              </p>
            </div>

            {/* Selected Count */}
            <div className="mb-4 text-sm text-gray-600">
              {selectedCourses.length} دوره انتخاب شده
            </div>

            {/* Course List */}
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {allCourses.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  هیچ دوره‌ای یافت نشد
                </div>
              ) : (
                allCourses.map(course => (
                  <div
                    key={course.id}
                    className={`p-3 border-b flex items-center cursor-pointer hover:bg-gray-50 ${
                      selectedCourses.includes(course.id) ? 'bg-purple-50' : ''
                    } ${!course.published ? 'opacity-50' : ''}`}
                    onClick={() => course.published && handleCourseToggle(course.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(course.id)}
                      onChange={() => {}}
                      disabled={!course.published}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 ml-3"
                    />
                    
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-10 h-10 rounded object-cover ml-3"
                      />
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{course.title}</h3>
                      <p className="text-xs text-gray-500">
                        {course.price.toLocaleString()} تومان
                      </p>
                    </div>
                    
                    {!course.published && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        پیش‌نویس
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Submit Button - Full Width */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center font-semibold"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                در حال ایجاد کاربر...
              </>
            ) : (
              <>
                <span className="ml-2">✓</span>
                ایجاد کاربر {selectedCourses.length > 0 && `(${selectedCourses.length} دوره)`}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserWithCompletePack;
