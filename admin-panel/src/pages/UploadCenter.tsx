import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { uploadCenterService, coursesService } from '../services/api';
import { UploadedFileInfo, Course } from '../types';
import { API_ORIGIN } from '../services/api';

const UploadCenter: React.FC = () => {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'audios' | 'images'>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFileInfo | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFileInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignForm, setAssignForm] = useState({
    courseId: '',
    title: '',
    description: '',
  });
  const [assigning, setAssigning] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

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

  const filteredFiles = useMemo(() => {
    let filtered = files;
    
    // Type filter
    if (activeTab === 'videos') {
      filtered = filtered.filter(f => f.type === 'video');
    } else if (activeTab === 'audios') {
      filtered = filtered.filter(f => f.type === 'audio');
    } else if (activeTab === 'images') {
      filtered = filtered.filter(f => f.type === 'image');
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => f.filename.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [files, activeTab, searchQuery]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFiles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const getFileUrl = (filename: string) => {
    return `${API_ORIGIN}/uploads/${filename}`;
  };

  const handlePreview = (file: UploadedFileInfo) => {
    setPreviewFile(file);
    setIsPreviewModalOpen(true);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        );
      case 'audio':
        return (
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
      case 'image':
        return (
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
          </div>
        );
    }
  };

  if (loading && files.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مرکز آپلود"
        description="مدیریت و مشاهده فایل‌های آپلود شده"
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Controls: Tabs & Search */}
      <div className="ios-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            همه ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'videos'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ویدیوها ({files.filter(f => f.type === 'video').length})
          </button>
          <button
            onClick={() => setActiveTab('audios')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'audios'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            صوتی ({files.filter(f => f.type === 'audio').length})
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'images'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            تصاویر ({files.filter(f => f.type === 'image').length})
          </button>
        </div>

        <div className="relative flex-1 md:max-w-xs">
          <input
            type="text"
            placeholder="جستجوی فایل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <svg className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Files Grid */}
      {paginatedFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedFiles.map((file) => (
            <div key={file.filename} className="ios-card overflow-hidden group hover:shadow-lg transition-all duration-300">
              {/* Card Header (Icon/Thumbnail) */}
              <div className="aspect-video bg-gray-50 flex items-center justify-center relative border-b border-gray-100">
                {file.type === 'image' ? (
                  <img
                    src={getFileUrl(file.filename)}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getFileIcon(file.type)
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-2 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform shadow-lg"
                    title="مشاهده"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(file.filename, false)}
                    className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform shadow-lg"
                    title="حذف"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate flex-1" title={file.filename}>
                    {file.filename}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                    file.type === 'video' ? 'bg-red-50 text-red-600' :
                    file.type === 'audio' ? 'bg-purple-50 text-purple-600' :
                    file.type === 'image' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {file.type === 'video' ? 'ویدیو' :
                     file.type === 'audio' ? 'صوتی' :
                     file.type === 'image' ? 'تصویر' : 'فایل'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(file.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {file.sizeFormatted}
                  </span>
                </div>

                {/* Assignment Info */}
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                  {file.assignedToCourse ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-green-600 font-bold mb-0.5">اختصاص داده شده:</p>
                      <p className="text-[11px] text-gray-700 truncate font-medium">
                        {file.assignedToCourse.courseTitle}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">بدون اختصاص به دوره</span>
                  )}
                  
                  {(file.type === 'video' || file.type === 'audio') && (
                    <button
                      onClick={() => handleAssignClick(file)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        file.assignedToCourse 
                          ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {file.assignedToCourse ? 'تغییر' : 'اختصاص'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          title="فایلی یافت نشد"
          description="هیچ فایلی با این مشخصات وجود ندارد"
        />
      )}

      {/* Pagination & Stats */}
      {filteredFiles.length > 0 && (
        <div className="ios-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
             تعداد کل: <span className="font-bold text-gray-900">{filteredFiles.length}</span> فایل
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">تعداد در صفحه:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-lg text-xs p-1 outline-none"
              >
                <option value={12}>۱۲</option>
                <option value={24}>۲۴</option>
                <option value={48}>۴۸</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-1 mx-2">
                  <span className="text-xs font-medium text-gray-700">صفحه</span>
                  <span className="text-xs font-bold text-blue-600">{currentPage}</span>
                  <span className="text-xs font-medium text-gray-700">از</span>
                  <span className="text-xs font-bold text-gray-700">{totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && previewFile && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewFile(null);
          }}
          title={`پیش‌نمایش: ${previewFile.filename}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              {previewFile.type === 'video' && (
                <video
                  src={getFileUrl(previewFile.filename)}
                  controls
                  className="w-full h-full"
                  autoPlay
                />
              )}
              {previewFile.type === 'audio' && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 gap-6 p-12">
                  <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-12 h-12 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <audio
                    src={getFileUrl(previewFile.filename)}
                    controls
                    className="w-full max-w-md"
                    autoPlay
                  />
                </div>
              )}
              {previewFile.type === 'image' && (
                <img
                  src={getFileUrl(previewFile.filename)}
                  alt={previewFile.filename}
                  className="max-w-full max-h-full object-contain"
                />
              )}
              {previewFile.type !== 'video' && previewFile.type !== 'audio' && previewFile.type !== 'image' && (
                <div className="text-white text-center p-8">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>پیش‌نمایش برای این نوع فایل در دسترس نیست.</p>
                  <a
                    href={getFileUrl(previewFile.filename)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-6 py-2 bg-white text-black rounded-lg font-bold"
                  >
                    دانلود فایل
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-900">{previewFile.filename}</p>
                <p className="text-xs text-gray-500">{previewFile.mimetype} • {previewFile.sizeFormatted}</p>
              </div>
              <a
                href={getFileUrl(previewFile.filename)}
                download={previewFile.filename}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                دانلود
              </a>
            </div>
          </div>
        </Modal>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                عنوان در دوره
              </label>
              <input
                type="text"
                value={assignForm.title}
                onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="مثلاً: جلسه اول - مقدمه"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                توضیحات (اختیاری)
              </label>
              <textarea
                value={assignForm.description}
                onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                rows={3}
                placeholder="توضیحات کوتاهی در مورد این فایل در دوره..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedFile(null);
                  setAssignForm({ courseId: '', title: '', description: '' });
                }}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={assigning}
              >
                انصراف
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !assignForm.courseId}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
              >
                {assigning ? 'در حال انجام...' : 'تایید و اختصاص'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UploadCenter;


