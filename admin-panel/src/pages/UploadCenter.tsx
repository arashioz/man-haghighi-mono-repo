import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { uploadCenterService, coursesService } from '../services/api';
import { UploadedFileInfo, Course } from '../types';

const UploadCenter: React.FC = () => {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'audios'>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFileInfo | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignForm, setAssignForm] = useState({
    courseId: '',
    title: '',
    description: '',
  });
  const [assigning, setAssigning] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchFiles();
    fetchCourses();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await uploadCenterService.getAllFiles();
      setFiles(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت فایل‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await coursesService.getAll();
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleDelete = async (filename: string, force: boolean = false) => {
    const message = force 
      ? 'آیا از حذف این فایل اطمینان دارید؟ این فایل از دیتابیس و دیسک حذف خواهد شد.'
      : 'آیا از حذف این فایل اطمینان دارید؟';
    
    if (!window.confirm(message)) {
      return;
    }

    try {
      await uploadCenterService.deleteFile(filename, force);
      setFiles(files.filter(f => f.filename !== filename));
      setError('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'خطا در حذف فایل';
      if (errorMessage.includes('assigned') || errorMessage.includes('in use')) {
        if (window.confirm('این فایل به یک دوره اختصاص داده شده است. آیا می‌خواهید آن را به صورت اجباری حذف کنید؟')) {
          await handleDelete(filename, true);
        }
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleAssignClick = (file: UploadedFileInfo) => {
    if (file.type !== 'video' && file.type !== 'audio') {
      setError('فقط فایل‌های ویدیو و صوتی را می‌توان به دوره اختصاص داد');
      return;
    }
    setSelectedFile(file);
    setAssignForm({
      courseId: file.assignedToCourse?.courseId || '',
      title: file.filename.replace(/\.[^/.]+$/, ''),
      description: '',
    });
    setIsAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedFile || !assignForm.courseId) {
      setError('لطفاً دوره را انتخاب کنید');
      return;
    }

    const isReassign = selectedFile.assignedToCourse && 
      selectedFile.assignedToCourse.courseId !== assignForm.courseId;

    if (isReassign && !window.confirm('این فایل قبلاً به دوره دیگری اختصاص داده شده است. آیا می‌خواهید اختصاص آن را تغییر دهید؟')) {
      return;
    }

    try {
      setAssigning(true);
      setError('');
      await uploadCenterService.assignFileToCourse(
        selectedFile.filename,
        assignForm.courseId,
        assignForm.title,
        assignForm.description,
        isReassign
      );
      setIsAssignModalOpen(false);
      setSelectedFile(null);
      await fetchFiles();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'خطا در اختصاص فایل به دوره';
      if (errorMessage.includes('already assigned')) {
        if (window.confirm('این فایل قبلاً اختصاص داده شده است. آیا می‌خواهید اختصاص آن را تغییر دهید؟')) {
          await uploadCenterService.assignFileToCourse(
            selectedFile.filename,
            assignForm.courseId,
            assignForm.title,
            assignForm.description,
            true
          );
          setIsAssignModalOpen(false);
          setSelectedFile(null);
          await fetchFiles();
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setAssigning(false);
    }
  };

  const getFilteredFiles = () => {
    let filtered = files;
    if (activeTab === 'videos') {
      filtered = files.filter(f => f.type === 'video');
    } else if (activeTab === 'audios') {
      filtered = files.filter(f => f.type === 'audio');
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    let filtered = files;
    if (activeTab === 'videos') {
      filtered = files.filter(f => f.type === 'video');
    } else if (activeTab === 'audios') {
      filtered = files.filter(f => f.type === 'audio');
    }
    return Math.ceil(filtered.length / itemsPerPage);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        );
      case 'audio':
        return (
          <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredFiles = getFilteredFiles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="مرکز آپلود"
        description="مدیریت فایل‌های آپلود شده"
      />

      {error && (
        <div className="ios-card p-4 bg-red-50 border border-red-200">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="ios-card p-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 space-x-reverse" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              همه فایل‌ها ({files.length})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'videos'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ویدیوها ({files.filter(f => f.type === 'video').length})
            </button>
            <button
              onClick={() => setActiveTab('audios')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'audios'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              فایل‌های صوتی ({files.filter(f => f.type === 'audio').length})
            </button>
          </nav>
        </div>
      </div>

      {/* Files List */}
      {getFilteredFiles().length > 0 ? (
        <div className="ios-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    فایل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اندازه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ آپلود
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
                {filteredFiles.map((file) => (
                  <tr key={file.filename} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={file.filename}>
                            {file.filename}
                          </div>
                          <div className="text-sm text-gray-500">
                            {file.mimetype}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        file.type === 'video' ? 'bg-red-100 text-red-800' :
                        file.type === 'audio' ? 'bg-purple-100 text-purple-800' :
                        file.type === 'image' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {file.type === 'video' ? 'ویدیو' :
                         file.type === 'audio' ? 'صوتی' :
                         file.type === 'image' ? 'تصویر' :
                         'سایر'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.sizeFormatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {file.assignedToCourse ? (
                        <div className="text-sm">
                          <div className="text-green-600 font-medium">
                            اختصاص داده شده
                          </div>
                          <div className="text-gray-500 text-xs">
                            {file.assignedToCourse.courseTitle}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">بدون اختصاص</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(file.type === 'video' || file.type === 'audio') && (
                          <button
                            onClick={() => handleAssignClick(file)}
                            className={`${file.assignedToCourse ? 'text-orange-600 hover:text-orange-900' : 'text-blue-600 hover:text-blue-900'}`}
                            title={file.assignedToCourse ? 'تغییر اختصاص' : 'اختصاص به دوره'}
                          >
                            {file.assignedToCourse ? 'تغییر اختصاص' : 'اختصاص به دوره'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file.filename, false)}
                          className="text-red-600 hover:text-red-900"
                          title={file.assignedToCourse ? 'حذف اجباری (از دیتابیس و دیسک)' : 'حذف'}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {getTotalPages() > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                نمایش {((currentPage - 1) * itemsPerPage) + 1} تا {Math.min(currentPage * itemsPerPage, activeTab === 'videos' ? files.filter(f => f.type === 'video').length : activeTab === 'audios' ? files.filter(f => f.type === 'audio').length : files.length)} از {activeTab === 'videos' ? files.filter(f => f.type === 'video').length : activeTab === 'audios' ? files.filter(f => f.type === 'audio').length : files.length} فایل
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  قبلی
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded-lg text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                  disabled={currentPage === getTotalPages()}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
          }
          title="فایلی یافت نشد"
          description="هیچ فایلی در این دسته‌بندی وجود ندارد"
        />
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && selectedFile && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedFile(null);
            setAssignForm({ courseId: '', title: '', description: '' });
          }}
          title={selectedFile.assignedToCourse 
            ? `تغییر اختصاص ${selectedFile.type === 'video' ? 'ویدیو' : 'فایل صوتی'}`
            : `اختصاص ${selectedFile.type === 'video' ? 'ویدیو' : 'فایل صوتی'} به دوره`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                دوره
              </label>
              <select
                value={assignForm.courseId}
                onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">انتخاب دوره</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                عنوان
              </label>
              <input
                type="text"
                value={assignForm.title}
                onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="عنوان ویدیو یا فایل صوتی"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                توضیحات (اختیاری)
              </label>
              <textarea
                value={assignForm.description}
                onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="توضیحات..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedFile(null);
                  setAssignForm({ courseId: '', title: '', description: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={assigning}
              >
                انصراف
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !assignForm.courseId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'در حال اختصاص...' : 'اختصاص'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UploadCenter;

