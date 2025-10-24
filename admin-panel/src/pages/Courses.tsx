import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { coursesService } from '../services/api';
import { Course } from '../types';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: 0,
    published: false,
    thumbnail: null as File | null,
    video: null as File | null,
    attachments: [] as File[],
    courseVideos: [] as File[],
    courseAudios: [] as File[],
  });

  const fetchCourses = async () => {
    try {
      const data = await coursesService.getAll();
      console.log('Courses data:', data);
      const transformedData = data.map(course => ({
        ...course,
        price: parseFloat(course.price as any)
      }));
      setCourses(transformedData);
    } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت دوره‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    
    try {
      const courseData = {
        title: newCourse.title,
        description: newCourse.description,
        price: newCourse.price,
        published: newCourse.published,
      };

      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3000/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        throw new Error('خطا در ایجاد دوره');
      }

      const createdCourse = await response.json();
      
      let totalFiles = 0;
      let uploadedFiles = 0;
      
      if (newCourse.thumbnail) totalFiles++;
      if (newCourse.video) totalFiles++;
      totalFiles += newCourse.attachments.length;
      totalFiles += newCourse.courseVideos.length;
      totalFiles += newCourse.courseAudios.length;

      if (newCourse.thumbnail) {
        const formData = new FormData();
        formData.append('thumbnail', newCourse.thumbnail);
        
        await fetch(`http://localhost:3000/courses/${createdCourse.id}/thumbnail`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      if (newCourse.video) {
        const formData = new FormData();
        formData.append('video', newCourse.video);
        
        await fetch(`http://localhost:3000/courses/${createdCourse.id}/video`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      for (const attachment of newCourse.attachments) {
        const formData = new FormData();
        formData.append('attachments', attachment);
        
        await fetch(`http://localhost:3000/courses/${createdCourse.id}/attachments`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      for (const video of newCourse.courseVideos) {
        const formData = new FormData();
        formData.append('courseVideos', video);
        
        await fetch(`http://localhost:3000/courses/${createdCourse.id}/courseVideos`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      for (const audio of newCourse.courseAudios) {
        const formData = new FormData();
        formData.append('courseAudios', audio);
        
        await fetch(`http://localhost:3000/courses/${createdCourse.id}/courseAudios`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }
      
      setNewCourse({
        title: '',
        description: '',
        price: 0,
        published: false,
        thumbnail: null,
        video: null,
        attachments: [],
        courseVideos: [],
        courseAudios: [],
      });
      
      setIsModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      let errorMessage = 'خطا در ایجاد دوره';
      try {
        const errorData = JSON.parse(err.message);
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        errorMessage = err.message || 'خطا در ایجاد دوره';
      }
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsEditModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('آیا از حذف این دوره اطمینان دارید؟')) {
      return;
    }

    try {
      await coursesService.delete(courseId);
      setCourses(courses.filter(course => course.id !== courseId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف دوره');
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    try {
      const updateData = {
        title: editingCourse.title,
        description: editingCourse.description,
        price: editingCourse.price,
        published: editingCourse.published,
      };

      const updatedCourse = await coursesService.update(editingCourse.id, updateData);
      
      setCourses(courses.map(course => 
        course.id === editingCourse.id ? updatedCourse : course
      ));
      
      setIsEditModalOpen(false);
      setEditingCourse(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ویرایش دوره');
    }
  };

  const AddButton = () => (
    <button 
      onClick={() => setIsModalOpen(true)}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span className="mr-2">دوره جدید</span>
    </button>
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
        title="دوره‌ها" 
        description="مدیریت دوره‌های آموزشی"
        action={<AddButton />}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    دوره
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ویدیوها
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ ایجاد
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-medium">                            
                              {course.title?.[0] || 'C'}
                            </div>
                          )}
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {course.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {course.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">
                          {course.courseVideos?.length || 0} ویدیو
                        </span>
                        {course.videoFile && (
                          <span className="mr-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            معرفی
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.published ? 'منتشر شده' : 'پیش‌نویس'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button 
                          onClick={() => handleEditCourse(course)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="ویرایش"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="حذف"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
              title="دوره‌ای یافت نشد"
              description="هنوز دوره‌ای ثبت نشده است."
              action={<AddButton />}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="دوره جدید"
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
        
        <form onSubmit={handleAddCourse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان دوره
            </label>
            <input
              type="text"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان)
            </label>
            <input
            type="number"
              value={newCourse.price}
              onChange={(e) => setNewCourse({...newCourse, price: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تصویر شاخص
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewCourse({...newCourse, thumbnail: e.target.files?.[0] || null})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ویدیو معرفی دوره
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setNewCourse({...newCourse, video: e.target.files?.[0] || null})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فایل‌های ضمیمه
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setNewCourse({...newCourse, attachments: Array.from(e.target.files || [])})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ویدیوهای دوره
            </label>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={(e) => setNewCourse({...newCourse, courseVideos: Array.from(e.target.files || [])})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فایل‌های صوتی دوره
            </label>
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={(e) => setNewCourse({...newCourse, courseAudios: Array.from(e.target.files || [])})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={newCourse.published}
              onChange={(e) => setNewCourse({...newCourse, published: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              منتشر شده
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
              {isUploading ? 'در حال آپلود...' : 'ایجاد دوره'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCourse(null);
        }}
        title="ویرایش دوره"
      >
        <form onSubmit={handleUpdateCourse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان دوره
            </label>
            <input
              type="text"
              value={editingCourse?.title || ''}
              onChange={(e) => setEditingCourse(prev => prev ? {...prev, title: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={editingCourse?.description || ''}
              onChange={(e) => setEditingCourse(prev => prev ? {...prev, description: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان)
            </label>
            <input
              type="number"
              value={editingCourse?.price || 0}
              onChange={(e) => setEditingCourse(prev => prev ? {...prev, price: Number(e.target.value)} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editingCourse?.published || false}
              onChange={(e) => setEditingCourse(prev => prev ? {...prev, published: e.target.checked} : null)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              منتشر شده
            </label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCourse(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
            >
              ویرایش دوره
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Courses;