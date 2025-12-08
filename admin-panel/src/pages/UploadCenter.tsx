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

  const handleDelete = async (filename: string) => {
    if (!window.confirm('آیا از حذف این فایل اطمینان دارید؟')) {
      return;
    }

    try {
      await uploadCenterService.deleteFile(filename);
      setFiles(files.filter(f => f.filename !== filename));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف فایل');
    }
  };

  const handleAssignClick = (file: UploadedFileInfo) => {
    if (file.type !== 'video' && file.type !== 'audio') {
      setError('فقط فایل‌های ویدیو و صوتی را می‌توان به دوره اختصاص داد');
      return;
    }
    setSelectedFile(file);
    setAssignForm({
      courseId: '',
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

    try {
      setAssigning(true);
      setError('');
      await uploadCenterService.assignFileToCourse(
        selectedFile.filename,
        assignForm.courseId,
        assignForm.title,
        assignForm.description
      );
      setIsAssignModalOpen(false);
      setSelectedFile(null);
      await fetchFiles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در اختصاص فایل به دوره');
    } finally {
      setAssigning(false);
    }
  };

  const getFilteredFiles = () => {
    if (activeTab === 'videos') {
      return files.filter(f => f.type === 'video');
    }
    if (activeTab === 'audios') {
      return files.filter(f => f.type === 'audio');
    }
    return files;
  };

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
      {filteredFiles.length > 0 ? (
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
                      <div className="flex items-center gap-2">
                        {(file.type === 'video' || file.type === 'audio') && !file.assignedToCourse && (
                          <button
                            onClick={() => handleAssignClick(file)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            اختصاص به دوره
                          </button>
                        )}
                        {!file.assignedToCourse && (
                          <button
                            onClick={() => handleDelete(file.filename)}
                            className="text-red-600 hover:text-red-900"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
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
          title={`اختصاص ${selectedFile.type === 'video' ? 'ویدیو' : 'فایل صوتی'} به دوره`}
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

