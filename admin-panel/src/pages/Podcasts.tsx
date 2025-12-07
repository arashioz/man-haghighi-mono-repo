import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { podcastsService } from '../services/api';
import { Podcast } from '../types';
import { truncateWords } from '../utils/text';

const Podcasts: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState<string>('');
  const [newPodcast, setNewPodcast] = useState({
    title: '',
    description: '',
    audioLink: '',
    duration: '',
    published: false,
  });
  const [newPodcastFile, setNewPodcastFile] = useState<File | null>(null);
  const [newPodcastThumbnail, setNewPodcastThumbnail] = useState<File | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [editPodcast, setEditPodcast] = useState({
    title: '',
    description: '',
    audioLink: '',
    duration: '',
    published: false,
  });
  const [editPodcastFile, setEditPodcastFile] = useState<File | null>(null);
  const [editPodcastThumbnail, setEditPodcastThumbnail] = useState<File | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [editCurrentFile, setEditCurrentFile] = useState('');
  const [editError, setEditError] = useState('');

  const fetchPodcasts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await podcastsService.getAll();
      setPodcasts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت پادکست‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  const resetModalState = () => {
    setIsModalOpen(false);
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentUploadFile('');
    setNewPodcast({
      title: '',
      description: '',
      audioLink: '',
      duration: '',
      published: false,
    });
    setNewPodcastFile(null);
    setNewPodcastThumbnail(null);
  };

  const openEditModal = (podcast: Podcast) => {
    setEditingPodcast(podcast);
    setEditPodcast({
      title: podcast.title || '',
      description: podcast.description || '',
      audioLink: podcast.audioFile && podcast.audioFile.startsWith('http') ? podcast.audioFile : '',
      duration: podcast.duration ? String(podcast.duration) : '',
      published: podcast.published,
    });
    setEditPodcastFile(null);
    setEditPodcastThumbnail(null);
    setEditUploadProgress(0);
    setEditCurrentFile('');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPodcast(null);
    setEditPodcast({
      title: '',
      description: '',
      audioLink: '',
      duration: '',
      published: false,
    });
    setEditPodcastFile(null);
    setEditPodcastThumbnail(null);
    setIsEditSaving(false);
    setEditUploadProgress(0);
    setEditCurrentFile('');
    setEditError('');
  };

  const handleAddPodcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPodcastFile && !newPodcast.audioLink.trim()) {
      setError('لطفاً یک فایل صوتی آپلود یا لینک صوتی معتبر وارد کنید');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', newPodcast.title);
      formData.append('published', String(newPodcast.published));

      if (newPodcast.description) {
        formData.append('description', newPodcast.description);
      }

      if (newPodcast.duration) {
        formData.append('duration', newPodcast.duration);
      }

      if (newPodcast.audioLink) {
        formData.append('audioFile', newPodcast.audioLink);
      }

      if (newPodcastFile) {
        formData.append('audio', newPodcastFile);
        setCurrentUploadFile(newPodcastFile.name);
      }

      if (newPodcastThumbnail) {
        formData.append('thumbnail', newPodcastThumbnail);
      }

      const createdPodcast = await podcastsService.createWithFile(formData, (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setPodcasts((prev) => [createdPodcast, ...prev]);
      resetModalState();
    } catch (err: any) {
      let errorMessage = 'خطا در ایجاد پادکست';

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

  const handleDeletePodcast = async (podcastId: string, title?: string) => {
    if (!window.confirm(`آیا از حذف پادکست ${title ? `«${title}»` : ''} اطمینان دارید؟`)) {
      return;
    }

    try {
      await podcastsService.delete(podcastId);
      setPodcasts((prev) => prev.filter((podcast) => podcast.id !== podcastId));
    } catch (err: any) {
      let errorMessage = 'خطا در حذف پادکست';

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

  const handleUpdatePodcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPodcast) {
      return;
    }

    if (!editPodcastFile && !editPodcast.audioLink.trim() && !editingPodcast.audioFile) {
      setEditError('برای پادکست باید فایل صوتی یا لینک معتبر داشته باشید.');
      return;
    }

    setIsEditSaving(true);
    setEditUploadProgress(0);
    setEditError('');

    try {
      const formData = new FormData();
      formData.append('title', editPodcast.title);
      formData.append('published', String(editPodcast.published));

      if (typeof editPodcast.description === 'string') {
        formData.append('description', editPodcast.description);
      }

      if (editPodcast.duration) {
        formData.append('duration', editPodcast.duration);
      }

      if (editPodcast.audioLink.trim()) {
        formData.append('audioFile', editPodcast.audioLink.trim());
      }

      if (editPodcastFile) {
        formData.append('audio', editPodcastFile);
        setEditCurrentFile(editPodcastFile.name);
      } else {
        setEditCurrentFile('');
      }

      if (editPodcastThumbnail) {
        formData.append('thumbnail', editPodcastThumbnail);
      }

      const updatedPodcast = await podcastsService.updateWithFile(
        editingPodcast.id,
        formData,
        (progressEvent: any) => {
          if (progressEvent?.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setEditUploadProgress(percentCompleted);
          }
        },
      );

      setPodcasts((prev) =>
        prev.map((podcast) => (podcast.id === updatedPodcast.id ? updatedPodcast : podcast)),
      );
      closeEditModal();
    } catch (err: any) {
      let errorMessage = 'خطا در ویرایش پادکست';

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
      <span className="mr-2">پادکست جدید</span>
    </button>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const PodcastsIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="پادکست‌ها" 
        description="مدیریت پادکست‌های آموزشی"
        action={<AddButton />}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {podcasts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    پادکست
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
                {podcasts.map((podcast) => (
                  <tr key={podcast.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center text-white font-medium">
                            {podcast.title?.[0] || 'P'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-gray-900">
                            {podcast.title}
                          </div>
                          {podcast.description && (
                            <div className="text-sm text-gray-500">
                              {truncateWords(podcast.description, 20)}
                            </div>
                          )}
                          <audio controls className="w-full">
                            <source src={podcast.streamUrl || podcast.audioFile || undefined} />
                            مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                          </audio>
                          {(podcast.streamUrl || podcast.audioFile) && (
                            <div className="text-xs text-blue-600">
                              <a
                                href={podcast.streamUrl || podcast.audioFile || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                مشاهده لینک پخش
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        podcast.published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {podcast.published ? 'منتشر شده' : 'پیش‌نویس'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(podcast.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          type="button"
                          onClick={() => openEditModal(podcast)}
                          className="text-blue-600 hover:text-blue-900"
                          title="ویرایش"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePodcast(podcast.id, podcast.title)}
                          className="text-red-600 hover:text-red-900"
                          title="حذف"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              icon={<PodcastsIcon />}
              title="پادکستی یافت نشد"
              description="هنوز پادکستی ثبت نشده است."
              action={<AddButton />}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={resetModalState}
        title="پادکست جدید"
      >
        {isUploading && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">در حال آپلود فایل صوتی...</span>
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
        <form onSubmit={handleAddPodcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان پادکست
            </label>
            <input
              type="text"
              value={newPodcast.title}
              onChange={(e) => setNewPodcast({ ...newPodcast, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={newPodcast.description}
              onChange={(e) => setNewPodcast({ ...newPodcast, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فایل صوتی
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewPodcastFile(file);
                setCurrentUploadFile(file?.name || '');
              }}
              className="w-full text-sm"
            />
            {newPodcastFile && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {newPodcastFile.name} ({(newPodcastFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              یا لینک فایل صوتی (اختیاری)
            </label>
            <input
              type="url"
              value={newPodcast.audioLink}
              onChange={(e) => setNewPodcast({ ...newPodcast, audioLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/audio.mp3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تصویر کاور پادکست (اختیاری)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewPodcastThumbnail(file);
              }}
              className="w-full text-sm"
            />
            {newPodcastThumbnail && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(newPodcastThumbnail)}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                <p className="mt-1 text-xs text-green-600">
                  ✓ {newPodcastThumbnail.name} ({(newPodcastThumbnail.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مدت زمان (ثانیه) - اختیاری
            </label>
            <input
              type="number"
              min="0"
              value={newPodcast.duration}
              onChange={(e) => setNewPodcast({ ...newPodcast, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثلاً 1800"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={newPodcast.published}
              onChange={(e) => setNewPodcast({ ...newPodcast, published: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              منتشر شده
            </label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={resetModalState}
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
                isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUploading ? 'در حال آپلود...' : 'ایجاد پادکست'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="ویرایش پادکست"
      >
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

        <form onSubmit={handleUpdatePodcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان پادکست
            </label>
            <input
              type="text"
              value={editPodcast.title}
              onChange={(e) => setEditPodcast({ ...editPodcast, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={editPodcast.description}
              onChange={(e) => setEditPodcast({ ...editPodcast, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فایل صوتی
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEditPodcastFile(file);
                setEditCurrentFile(file?.name || '');
              }}
              className="w-full text-sm"
              disabled={isEditSaving}
            />
            {editPodcastFile && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {editPodcastFile.name} ({(editPodcastFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            {!editPodcastFile && editingPodcast?.audioFile && (
              <p className="mt-1 text-xs text-blue-600 truncate">
                فایل فعلی: {' '}
                <a
                  href={editingPodcast.streamUrl || editingPodcast.audioFile || undefined}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              لینک فایل صوتی (اختیاری)
            </label>
            <input
              type="url"
              value={editPodcast.audioLink}
              onChange={(e) => setEditPodcast({ ...editPodcast, audioLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/audio.mp3"
              disabled={isEditSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تصویر کاور پادکست (اختیاری)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEditPodcastThumbnail(file);
              }}
              className="w-full text-sm"
              disabled={isEditSaving}
            />
            {editPodcastThumbnail && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(editPodcastThumbnail)}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                <p className="mt-1 text-xs text-green-600">
                  ✓ {editPodcastThumbnail.name} ({(editPodcastThumbnail.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
            {!editPodcastThumbnail && editingPodcast?.thumbnail && (
              <div className="mt-2">
                <img
                  src={editingPodcast.thumbnail}
                  alt="Current thumbnail"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                <p className="mt-1 text-xs text-blue-600">
                  تصویر فعلی
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مدت زمان (ثانیه)
            </label>
            <input
              type="number"
              min="0"
              value={editPodcast.duration}
              onChange={(e) => setEditPodcast({ ...editPodcast, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثلاً 1800"
              disabled={isEditSaving}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editPodcast.published}
              onChange={(e) => setEditPodcast({ ...editPodcast, published: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isEditSaving}
            />
            <label className="mr-2 block text-sm text-gray-900">
              منتشر شده
            </label>
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

export default Podcasts;