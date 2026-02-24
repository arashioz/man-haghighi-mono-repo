import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { videoPodcastsService } from '../services/api';
import { VideoPodcast } from '../types';
import { truncateWords } from '../utils/text';

const formatDuration = (duration?: number | string | null) => {
  if (!duration && duration !== 0) {
    return null;
  }

  const totalSeconds = typeof duration === 'string' ? parseInt(duration, 10) : duration;
  if (!totalSeconds || isNaN(totalSeconds)) {
    return null;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ساعت ${remainingMinutes > 0 ? `${remainingMinutes} دقیقه` : ''}`.trim();
  }

  return `${minutes} دقیقه${seconds > 0 ? ` و ${seconds} ثانیه` : ''}`;
};

const toDatetimeLocalValue = (iso?: string | null) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return '';
  }
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffset);
  return localDate.toISOString().slice(0, 16);
};

const toIsoStringIfValid = (value: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
};

const VideoPodcasts: React.FC = () => {
  const [videoPodcasts, setVideoPodcasts] = useState<VideoPodcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState<string>('');
  const [newVideoPodcast, setNewVideoPodcast] = useState({
    title: '',
    description: '',
    videoLink: '',
    thumbnail: '',
    duration: '',
    published: false,
    publishedAt: '',
  });
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVideoPodcast, setEditingVideoPodcast] = useState<VideoPodcast | null>(null);
  const [editVideoPodcast, setEditVideoPodcast] = useState({
    title: '',
    description: '',
    videoLink: '',
    thumbnail: '',
    duration: '',
    published: false,
    publishedAt: '',
  });
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [editCurrentFile, setEditCurrentFile] = useState('');
  const [editError, setEditError] = useState('');

  const fetchVideoPodcasts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await videoPodcastsService.getAll();
      setVideoPodcasts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت ویدیو پادکست‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideoPodcasts();
  }, [fetchVideoPodcasts]);

  const resetModalState = () => {
    setIsModalOpen(false);
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentUploadFile('');
    setNewVideoPodcast({
      title: '',
      description: '',
      videoLink: '',
      thumbnail: '',
      duration: '',
      published: false,
      publishedAt: '',
    });
    setNewVideoFile(null);
    setNewThumbnailFile(null);
  };

  const openEditModal = (videoPodcast: VideoPodcast) => {
    setEditingVideoPodcast(videoPodcast);
    setEditVideoPodcast({
      title: videoPodcast.title || '',
      description: videoPodcast.description || '',
      videoLink:
        videoPodcast.videoFile && videoPodcast.videoFile.startsWith('http')
          ? videoPodcast.videoFile
          : '',
      thumbnail: videoPodcast.thumbnail || '',
      duration: videoPodcast.duration ? String(videoPodcast.duration) : '',
      published: videoPodcast.published,
      publishedAt: toDatetimeLocalValue(videoPodcast.publishedAt),
    });
    setEditVideoFile(null);
    setEditThumbnailFile(null);
    setEditUploadProgress(0);
    setEditCurrentFile('');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingVideoPodcast(null);
    setEditVideoPodcast({
      title: '',
      description: '',
      videoLink: '',
      thumbnail: '',
      duration: '',
      published: false,
      publishedAt: '',
    });
    setEditVideoFile(null);
    setEditThumbnailFile(null);
    setIsEditSaving(false);
    setEditUploadProgress(0);
    setEditCurrentFile('');
    setEditError('');
  };

  const handleAddVideoPodcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVideoFile && !newVideoPodcast.videoLink.trim()) {
      setError('لطفاً یک فایل ویدیو آپلود یا لینک ویدیو معتبر وارد کنید');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', newVideoPodcast.title);
      formData.append('published', String(newVideoPodcast.published));

      if (newVideoPodcast.description) {
        formData.append('description', newVideoPodcast.description);
      }

      if (newThumbnailFile) {
        formData.append('thumbnail', newThumbnailFile);
      }

      if (newVideoPodcast.duration) {
        formData.append('duration', newVideoPodcast.duration);
      }

      const publishedAtIso = toIsoStringIfValid(newVideoPodcast.publishedAt);
      if (publishedAtIso) {
        formData.append('publishedAt', publishedAtIso);
      }

      if (newVideoPodcast.videoLink) {
        formData.append('videoFile', newVideoPodcast.videoLink);
      }

      if (newVideoFile) {
        formData.append('video', newVideoFile);
        setCurrentUploadFile(newVideoFile.name);
      }

      const createdVideoPodcast = await videoPodcastsService.createWithFile(formData, (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setVideoPodcasts((prev) => [createdVideoPodcast, ...prev]);
      resetModalState();
    } catch (err: any) {
      let errorMessage = 'خطا در ایجاد ویدیو پادکست';

      if (err?.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsUploading(false);
    }
  };

  const handleDeleteVideoPodcast = async (videoPodcastId: string, title?: string) => {
    if (!window.confirm(`آیا از حذف ویدیو پادکست ${title ? `«${title}»` : ''} اطمینان دارید؟`)) {
      return;
    }

    try {
      await videoPodcastsService.delete(videoPodcastId);
      setVideoPodcasts((prev) => prev.filter((videoPodcast) => videoPodcast.id !== videoPodcastId));
    } catch (err: any) {
      let errorMessage = 'خطا در حذف ویدیو پادکست';

      if (err?.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    }
  };

  const handleUpdateVideoPodcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoPodcast) {
      return;
    }

    if (!editVideoFile && !editVideoPodcast.videoLink.trim() && !editingVideoPodcast.videoFile) {
      setEditError('برای ویدیو پادکست باید فایل ویدیو یا لینک معتبر داشته باشید.');
      return;
    }

    setIsEditSaving(true);
    setEditUploadProgress(0);
    setEditError('');

    try {
      const formData = new FormData();

      formData.append('published', String(editVideoPodcast.published));

      if (editVideoPodcast.title) {
        formData.append('title', editVideoPodcast.title);
      }

      if (typeof editVideoPodcast.description === 'string') {
        formData.append('description', editVideoPodcast.description);
      }

      if (editThumbnailFile) {
        formData.append('thumbnail', editThumbnailFile);
      }

      if (editVideoPodcast.duration) {
        formData.append('duration', editVideoPodcast.duration);
      }

      const publishedAtIso = toIsoStringIfValid(editVideoPodcast.publishedAt);
      if (publishedAtIso) {
        formData.append('publishedAt', publishedAtIso);
      }

      if (editVideoPodcast.videoLink.trim()) {
        formData.append('videoFile', editVideoPodcast.videoLink.trim());
      }

      if (editVideoFile) {
        formData.append('video', editVideoFile);
        setEditCurrentFile(editVideoFile.name);
      } else {
        setEditCurrentFile('');
      }

      const updatedVideoPodcast = await videoPodcastsService.updateWithFile(
        editingVideoPodcast.id,
        formData,
        (progressEvent: any) => {
          if (progressEvent?.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setEditUploadProgress(percentCompleted);
          }
        },
      );

      setVideoPodcasts((prev) =>
        prev.map((videoPodcast) => (videoPodcast.id === updatedVideoPodcast.id ? updatedVideoPodcast : videoPodcast)),
      );
      closeEditModal();
    } catch (err: any) {
      let errorMessage = 'خطا در ویرایش ویدیو پادکست';

      if (err?.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setEditError(errorMessage);
    } finally {
      setIsEditSaving(false);
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
      <span className="mr-2">ویدیو پادکست جدید</span>
    </button>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const VideoIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div>
      <PageHeader title="ویدیو پادکست‌ها" description="مدیریت ویدیو پادکست‌های آموزشی" action={<AddButton />} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {videoPodcasts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ویدیو پادکست
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مدت زمان
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
                {videoPodcasts.map((videoPodcast) => (
                  <tr key={videoPodcast.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-24 w-40 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                          {videoPodcast.thumbnail ? (
                            <img
                              src={videoPodcast.thumbnail}
                              alt={videoPodcast.title}
                              className="h-full w-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-indigo-500 text-white font-semibold text-lg">
                              {videoPodcast.title?.[0] || 'V'}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-gray-900">{videoPodcast.title}</div>
                          {videoPodcast.description && (
                            <div className="text-sm text-gray-500">
                              {truncateWords(videoPodcast.description, 20)}
                            </div>
                          )}
                          {(videoPodcast.streamUrl || videoPodcast.videoFile) && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                              <video
                                controls
                                className="w-64 rounded-md"
                                poster={videoPodcast.thumbnail || undefined}
                              >
                                <source
                                  src={videoPodcast.streamUrl || videoPodcast.videoFile || undefined}
                                  type="video/mp4"
                                />
                                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                              </video>
                              <div className="text-xs text-blue-600 mt-2">
                                <a
                                  href={videoPodcast.streamUrl || videoPodcast.videoFile || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  مشاهده لینک پخش
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          videoPodcast.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {videoPodcast.published ? 'منتشر شده' : 'پیش‌نویس'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(videoPodcast.duration) || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(videoPodcast.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          type="button"
                          onClick={() => openEditModal(videoPodcast)}
                          className="text-blue-600 hover:text-blue-900"
                          title="ویرایش"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideoPodcast(videoPodcast.id, videoPodcast.title)}
                          className="text-red-600 hover:text-red-900"
                          title="حذف"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
              icon={<VideoIcon />}
              title="ویدیو پادکستی یافت نشد"
              description="هنوز ویدیو پادکستی ثبت نشده است."
              action={<AddButton />}
            />
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetModalState} title="ویدیو پادکست جدید">
        {isUploading && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">در حال آپلود فایل ویدیو...</span>
              <span className="text-sm font-semibold text-blue-700">{uploadProgress}%</span>
            </div>
            {currentUploadFile && (
              <p className="text-xs text-blue-700 mb-2 truncate" title={currentUploadFile}>
                📁 {currentUploadFile}
              </p>
            )}
            <ProgressBar progress={uploadProgress} />
          </div>
        )}
        <form onSubmit={handleAddVideoPodcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان ویدیو پادکست</label>
            <input
              type="text"
              value={newVideoPodcast.title}
              onChange={(e) => setNewVideoPodcast({ ...newVideoPodcast, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
            <textarea
              value={newVideoPodcast.description}
              onChange={(e) => setNewVideoPodcast({ ...newVideoPodcast, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تصویر بندانگشتی</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewThumbnailFile(file);
              }}
              className="w-full text-sm"
            />
            {newThumbnailFile && (
              <p className="mt-1 text-xs text-green-600">
                فایل انتخاب شده: {newThumbnailFile.name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">فایل ویدیو</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewVideoFile(file);
                setCurrentUploadFile(file?.name || '');
              }}
              className="w-full text-sm"
            />
            {newVideoFile && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {newVideoFile.name} ({(newVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">یا لینک ویدیو (اختیاری)</label>
            <input
              type="url"
              value={newVideoPodcast.videoLink}
              onChange={(e) => setNewVideoPodcast({ ...newVideoPodcast, videoLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/video.mp4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مدت زمان (ثانیه) - اختیاری</label>
            <input
              type="number"
              min="0"
              value={newVideoPodcast.duration}
              onChange={(e) => setNewVideoPodcast({ ...newVideoPodcast, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثلاً 1800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ انتشار (ISO) - اختیاری</label>
            <input
              type="datetime-local"
              value={newVideoPodcast.publishedAt}
              onChange={(e) => setNewVideoPodcast({ ...newVideoPodcast, publishedAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={newVideoPodcast.published}
              onChange={(e) => setNewVideoPodcast({ ...newVideoPodcast, published: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">منتشر شده</label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={resetModalState}
              disabled={isUploading}
              className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                isUploading ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' : 'text-gray-700 bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors ${
                isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUploading ? 'در حال آپلود...' : 'ایجاد ویدیو پادکست'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="ویرایش ویدیو پادکست">
        {isEditSaving && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">در حال ذخیره تغییرات...</span>
              <span className="text-sm font-semibold text-blue-700">
                {editUploadProgress > 0 ? `${editUploadProgress}%` : ''}
              </span>
            </div>
            {editCurrentFile && (
              <p className="text-xs text-blue-700 mb-2 truncate" title={editCurrentFile}>
                📁 {editCurrentFile}
              </p>
            )}
            {editUploadProgress > 0 && <ProgressBar progress={editUploadProgress} />}
          </div>
        )}

        {editError && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {editError}
          </div>
        )}

        <form onSubmit={handleUpdateVideoPodcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان ویدیو پادکست</label>
            <input
              type="text"
              value={editVideoPodcast.title}
              onChange={(e) => setEditVideoPodcast({ ...editVideoPodcast, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
            <textarea
              value={editVideoPodcast.description}
              onChange={(e) => setEditVideoPodcast({ ...editVideoPodcast, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تصویر بندانگشتی</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEditThumbnailFile(file);
              }}
              className="w-full text-sm"
              disabled={isEditSaving}
            />
            {editThumbnailFile && (
              <p className="mt-1 text-xs text-green-600">
                فایل انتخاب شده: {editThumbnailFile.name}
              </p>
            )}
            {editingVideoPodcast?.thumbnail && !editThumbnailFile && (
              <p className="mt-1 text-xs text-gray-500">
                تصویر فعلی: {editingVideoPodcast.thumbnail}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">فایل ویدیو</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEditVideoFile(file);
                setEditCurrentFile(file?.name || '');
              }}
              className="w-full text-sm"
              disabled={isEditSaving}
            />
            {editVideoFile && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {editVideoFile.name} ({(editVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            {!editVideoFile && editingVideoPodcast?.videoFile && (
              <p className="mt-1 text-xs text-blue-600 truncate">
                فایل فعلی:{' '}
                <a
                  href={editingVideoPodcast.streamUrl || editingVideoPodcast.videoFile || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  مشاهده/دانلود
                </a>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">لینک ویدیو (اختیاری)</label>
            <input
              type="url"
              value={editVideoPodcast.videoLink}
              onChange={(e) => setEditVideoPodcast({ ...editVideoPodcast, videoLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/video.mp4"
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مدت زمان (ثانیه)</label>
            <input
              type="number"
              min="0"
              value={editVideoPodcast.duration}
              onChange={(e) => setEditVideoPodcast({ ...editVideoPodcast, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثلاً 1800"
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ انتشار (ISO)</label>
            <input
              type="datetime-local"
              value={editVideoPodcast.publishedAt}
              onChange={(e) => setEditVideoPodcast({ ...editVideoPodcast, publishedAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEditSaving}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editVideoPodcast.published}
              onChange={(e) => setEditVideoPodcast({ ...editVideoPodcast, published: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isEditSaving}
            />
            <label className="mr-2 block text-sm text-gray-900">منتشر شده</label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={isEditSaving}
              className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                isEditSaving
                  ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isEditSaving}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors ${
                isEditSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isEditSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VideoPodcasts;

