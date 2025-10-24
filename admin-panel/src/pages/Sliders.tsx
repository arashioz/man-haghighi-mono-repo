import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { slidersService } from '../services/api';
import { Slider } from '../types';

const Sliders: React.FC = () => {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newSlider, setNewSlider] = useState({
    title: '',
    description: '',
    order: 0,
    isActive: true,
    image: null as File | null,
    video: null as File | null,
  });

  useEffect(() => {
    const fetchSliders = async () => {
      try {
        const data = await slidersService.getAll();
        setSliders(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت اسلایدرها');
      } finally {
        setLoading(false);
      }
    };

    fetchSliders();
  }, []);

  const handleAddSlider = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('title', newSlider.title);
      formData.append('description', newSlider.description);
      formData.append('order', newSlider.order.toString());
      formData.append('isActive', newSlider.isActive.toString());
      
      if (newSlider.image) {
        formData.append('image', newSlider.image);
      }
      
      if (newSlider.video) {
        formData.append('video', newSlider.video);
      }

      const createdSlider = await slidersService.createWithFiles(formData, (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        }
      });

      setSliders([...sliders, createdSlider]);
      setIsModalOpen(false);
      setNewSlider({
        title: '',
        description: '',
        order: 0,
        isActive: true,
        image: null,
        video: null,
      });
    } catch (err: any) {
      let errorMessage = 'خطا در ایجاد اسلایدر';
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      } else {
        errorMessage = err.message || 'خطا در ایجاد اسلایدر';
      }
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditSlider = (slider: Slider) => {
    setEditingSlider(slider);
    setIsEditModalOpen(true);
  };

  const handleUpdateSlider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlider) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    
    try {
      const updateData: any = {
        title: editingSlider.title,
        description: editingSlider.description,
        order: editingSlider.order,
        isActive: editingSlider.isActive,
      };

      const updatedSlider = await slidersService.update(editingSlider.id, updateData);
      
      setSliders(sliders.map(slider => 
        slider.id === editingSlider.id ? updatedSlider : slider
      ));
      
      setIsEditModalOpen(false);
      setEditingSlider(null);
    } catch (err: any) {
      let errorMessage = 'خطا در ویرایش اسلایدر';
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      } else {
        errorMessage = err.message || 'خطا در ویرایش اسلایدر';
      }
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSlider = async (sliderId: string) => {
    if (!window.confirm('آیا از حذف این اسلایدر اطمینان دارید؟')) {
      return;
    }

    try {
      await slidersService.delete(sliderId);
      setSliders(sliders.filter(slider => slider.id !== sliderId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف اسلایدر');
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
      <span className="mr-2">اسلایدر جدید</span>
    </button>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const SlideshowIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="اسلایدرها" 
        description="مدیریت اسلایدرهای صفحه اصلی"
        action={<AddButton />}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {sliders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسلایدر
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
                {sliders.map((slider) => (
                  <tr key={slider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center text-white font-medium">
                            {slider.title?.[0] || 'S'}
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {slider.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {slider.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        slider.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {slider.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(slider.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button 
                          onClick={() => handleEditSlider(slider)}
                          className="text-blue-600 hover:text-blue-900"
                          title="ویرایش"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteSlider(slider.id)}
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
              icon={<SlideshowIcon />}
              title="اسلایدری یافت نشد"
              description="هنوز اسلایدری ثبت نشده است."
              action={<AddButton />}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="اسلایدر جدید"
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
        
        <form onSubmit={handleAddSlider} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان اسلایدر
            </label>
            <input
              type="text"
              value={newSlider.title}
              onChange={(e) => setNewSlider({...newSlider, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={newSlider.description}
              onChange={(e) => setNewSlider({...newSlider, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ترتیب نمایش
            </label>
            <input
              type="number"
              value={newSlider.order}
              onChange={(e) => setNewSlider({...newSlider, order: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تصویر اسلایدر
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewSlider({...newSlider, image: e.target.files?.[0] || null})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ویدیو اسلایدر (اختیاری)
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setNewSlider({...newSlider, video: e.target.files?.[0] || null})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={newSlider.isActive}
              onChange={(e) => setNewSlider({...newSlider, isActive: e.target.checked})}
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
              {isUploading ? 'در حال آپلود...' : 'ایجاد اسلایدر'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSlider(null);
        }}
        title="ویرایش اسلایدر"
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
        
        <form onSubmit={handleUpdateSlider} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان اسلایدر
            </label>
            <input
              type="text"
              value={editingSlider?.title || ''}
              onChange={(e) => setEditingSlider(prev => prev ? {...prev, title: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              value={editingSlider?.description || ''}
              onChange={(e) => setEditingSlider(prev => prev ? {...prev, description: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ترتیب نمایش
            </label>
            <input
              type="number"
              value={editingSlider?.order || 0}
              onChange={(e) => setEditingSlider(prev => prev ? {...prev, order: Number(e.target.value)} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editingSlider?.isActive || false}
              onChange={(e) => setEditingSlider(prev => prev ? {...prev, isActive: e.target.checked} : null)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900">
              فعال
            </label>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingSlider(null);
              }}
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
              {isUploading ? 'در حال آپلود...' : 'ویرایش اسلایدر'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};  

export default Sliders;