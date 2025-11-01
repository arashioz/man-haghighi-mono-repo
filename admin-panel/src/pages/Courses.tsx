import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { coursesService, api, videosService } from '../services/api';
import { Course, Video } from '../types';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState<string>('');
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseVideos, setCourseVideos] = useState<Video[]>([]);
  const [newVideos, setNewVideos] = useState<Array<{id: string, file: File | null, title: string}>>([]);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: 0,
    published: false,
    thumbnail: null as File | null,
    video: null as File | null,
    attachments: [] as File[],
    courseVideos: [] as Array<{id: string, file: File | null, title: string}>,
    courseAudios: [] as Array<{id: string, file: File | null, title: string}>,
  });

  // Helper functions for dynamic video/audio management
  const addVideoField = () => {
    setNewCourse({
      ...newCourse,
      courseVideos: [...newCourse.courseVideos, {id: Date.now().toString(), file: null, title: ''}]
    });
  };

  const removeVideoField = (id: string) => {
    setNewCourse({
      ...newCourse,
      courseVideos: newCourse.courseVideos.filter(v => v.id !== id)
    });
  };

  const updateVideoField = (id: string, field: 'file' | 'title', value: File | null | string) => {
    setNewCourse({
      ...newCourse,
      courseVideos: newCourse.courseVideos.map(v => 
        v.id === id ? {...v, [field]: value} : v
      )
    });
  };

  const addAudioField = () => {
    setNewCourse({
      ...newCourse,
      courseAudios: [...newCourse.courseAudios, {id: Date.now().toString(), file: null, title: ''}]
    });
  };

  const removeAudioField = (id: string) => {
    setNewCourse({
      ...newCourse,
      courseAudios: newCourse.courseAudios.filter(a => a.id !== id)
    });
  };

  const updateAudioField = (id: string, field: 'file' | 'title', value: File | null | string) => {
    setNewCourse({
      ...newCourse,
      courseAudios: newCourse.courseAudios.map(a => 
        a.id === id ? {...a, [field]: value} : a
      )
    });
  };

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

  const truncateWords = (text:string, wordLimit = 30) => {
    const words = text.split(" ");
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  // Helper function to upload file with progress tracking
  const uploadFileWithProgress = async (
    url: string,
    formData: FormData,
    fileName: string,
    fileSize: number,
    previousBytes: number,
    totalSize: number,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      setCurrentUploadFile(fileName);
      setTotalBytes(totalSize);
      setUploadedBytes(previousBytes);

      api.patch(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const currentFilePercent = (progressEvent.loaded * 100) / progressEvent.total;
            const currentFileBytes = progressEvent.loaded;
            const totalUploadedBytes = previousBytes + currentFileBytes;
            
            setUploadedBytes(totalUploadedBytes);
            
            // Call progress callback if provided
            if (onProgress) {
              onProgress(currentFilePercent);
            }
          }
        },
      })
        .then(() => {
          resolve();
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  };
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
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://185.231.112.84:8080/api';
      
      const response = await fetch(`${API_BASE_URL}/courses`, {
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
      
      // Calculate total files and their sizes
      let totalFiles = 0;
      let totalSize = 0;
      const filesToUpload: Array<{type: string, file: File, url: string}> = [];
      
      if (newCourse.thumbnail) {
        totalFiles++;
        totalSize += newCourse.thumbnail.size;
        filesToUpload.push({
          type: 'thumbnail',
          file: newCourse.thumbnail,
          url: `/courses/${createdCourse.id}/thumbnail`
        });
      }

      if (newCourse.video) {
        totalFiles++;
        totalSize += newCourse.video.size;
        filesToUpload.push({
          type: 'video',
          file: newCourse.video,
          url: `/courses/${createdCourse.id}/video`
        });
      }

      for (const attachment of newCourse.attachments) {
        totalFiles++;
        totalSize += attachment.size;
        filesToUpload.push({
          type: 'attachment',
          file: attachment,
          url: `/courses/${createdCourse.id}/attachments`
        });
      }

      for (const video of newCourse.courseVideos) {
        if (video.file) {
          totalFiles++;
          totalSize += video.file.size;
          filesToUpload.push({
            type: 'courseVideo',
            file: video.file,
            url: `/courses/${createdCourse.id}/courseVideos`
          });
        }
      }

      for (const audio of newCourse.courseAudios) {
        if (audio.file) {
          totalFiles++;
          totalSize += audio.file.size;
          filesToUpload.push({
            type: 'courseAudio',
            file: audio.file,
            url: `/courses/${createdCourse.id}/courseAudios`
          });
        }
      }

      // Upload all files with progress tracking
      let uploadedBytesTotal = 0;
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileItem = filesToUpload[i];
        const formData = new FormData();
        formData.append(fileItem.type === 'courseVideo' ? 'courseVideos' : 
                       fileItem.type === 'courseAudio' ? 'courseAudios' :
                       fileItem.type === 'attachment' ? 'attachments' : fileItem.type, 
                       fileItem.file);
        
        await uploadFileWithProgress(
          fileItem.url,
          formData,
          fileItem.file.name,
          fileItem.file.size,
          uploadedBytesTotal,
          totalSize,
          (currentFileProgress: number) => {
            // Calculate overall progress: previous files + current file progress
            const overallProgress = ((uploadedBytesTotal + (fileItem.file.size * currentFileProgress / 100)) / totalSize) * 100;
            setUploadProgress(Math.min(100, overallProgress));
          }
        );
        
        uploadedBytesTotal += fileItem.file.size;
        setUploadProgress((uploadedBytesTotal / totalSize) * 100);
      }
      
      setUploadProgress(100);
      setCurrentUploadFile('');
 
      
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

  const handleEditCourse = async (course: Course) => {
    setEditingCourse(course);
    setIsEditModalOpen(true);
    setNewVideos([]);
    
    // Fetch existing videos for this course
    try {
      const videos = await videosService.getAll(course.id);
      setCourseVideos(videos.sort((a, b) => a.order - b.order));
    } catch (err: any) {
      console.error('Error fetching course videos:', err);
      setCourseVideos([]);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('آیا از حذف این ویدیو اطمینان دارید؟')) {
      return;
    }

    try {
      await videosService.delete(videoId);
      setCourseVideos(courseVideos.filter(v => v.id !== videoId));
      // Refresh courses list
      fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف ویدیو');
    }
  };

  const addNewVideoField = () => {
    setNewVideos([...newVideos, {id: Date.now().toString(), file: null, title: ''}]);
  };

  const removeNewVideoField = (id: string) => {
    setNewVideos(newVideos.filter(v => v.id !== id));
  };

  const updateNewVideoField = (id: string, field: 'file' | 'title', value: File | null | string) => {
    setNewVideos(newVideos.map(v => 
      v.id === id ? {...v, [field]: value} : v
    ));
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

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Update basic course info
      const updateData = {
        title: editingCourse.title,
        description: editingCourse.description,
        price: editingCourse.price,
        published: editingCourse.published,
      };

      const updatedCourse = await coursesService.update(editingCourse.id, updateData);
      
      // Upload new videos if any
      if (newVideos.length > 0) {
        const totalSize = newVideos.reduce((sum, v) => sum + (v.file?.size || 0), 0);
        let uploadedBytesTotal = 0;

        for (const videoItem of newVideos) {
          if (videoItem.file) {
            const formData = new FormData();
            formData.append('courseVideos', videoItem.file);
            
            await uploadFileWithProgress(
              `/courses/${editingCourse.id}/courseVideos`,
              formData,
              videoItem.file.name,
              videoItem.file.size,
              uploadedBytesTotal,
              totalSize,
              (currentFileProgress: number) => {
                const overallProgress = ((uploadedBytesTotal + (videoItem.file!.size * currentFileProgress / 100)) / totalSize) * 100;
                setUploadProgress(Math.min(100, overallProgress));
              }
            );
            
            uploadedBytesTotal += videoItem.file.size;
            setUploadProgress((uploadedBytesTotal / totalSize) * 100);
          }
        }
      }

      setUploadProgress(100);
      setCurrentUploadFile('');
      
      setCourses(courses.map(course => 
        course.id === editingCourse.id ? updatedCourse : course
      ));
      
      setIsEditModalOpen(false);
      setEditingCourse(null);
      setCourseVideos([]);
      setNewVideos([]);
      fetchCourses(); // Refresh courses list
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ویرایش دوره');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadFile('');
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
                        <div className="mr-4 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-2">
                            {course.description ? truncateWords(course.description, 30) : "..."}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900">
                            {course.videos?.length || 0} ویدیو
                          </span>
                          {course.videoFile && (
                            <span className="mr-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              معرفی
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-purple-700">
                            {course.audios?.length || 0} فایل صوتی
                          </span>
                        </div>
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
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">در حال آپلود فایل‌ها...</span>
              <span className="text-sm font-semibold text-blue-700">{Math.round(uploadProgress)}%</span>
            </div>
            {currentUploadFile && (
              <p className="text-xs text-blue-700 mb-2 truncate" title={currentUploadFile}>
                📁 {currentUploadFile}
              </p>
            )}
            <ProgressBar progress={uploadProgress} className="mb-2" />
            {uploadedBytes > 0 && totalBytes > 0 && (
              <div className="flex justify-between text-xs text-blue-600">
                <span>{(uploadedBytes / (1024 * 1024)).toFixed(2)} MB</span>
                <span>از {(totalBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}
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
          {/* Dynamic Video Upload */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                ویدیوهای دوره (اپیزودها)
              </label>
              <button
                type="button"
                onClick={addVideoField}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                افزودن ویدیو
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {newCourse.courseVideos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">هیچ ویدیویی اضافه نشده است</p>
                  <p className="text-xs text-gray-400 mt-1">روی دکمه "افزودن ویدیو" کلیک کنید</p>
                </div>
              ) : (
                newCourse.courseVideos.map((video, index) => (
                  <div key={video.id} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="عنوان ویدیو (مثلاً: اپیزود 1 - مقدمه)"
                        value={video.title}
                        onChange={(e) => updateVideoField(video.id, 'title', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => updateVideoField(video.id, 'file', e.target.files?.[0] || null)}
                        className="w-full text-sm"
                      />
                      {video.file && (
                        <p className="text-xs text-green-600">✓ {video.file.name}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideoField(video.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800 p-1"
                      title="حذف"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dynamic Audio Upload */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                فایل‌های صوتی دوره (اپیزودها)
              </label>
              <button
                type="button"
                onClick={addAudioField}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                افزودن صوتی
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {newCourse.courseAudios.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  </svg>
                  <p className="text-sm text-gray-500">هیچ فایل صوتی اضافه نشده است</p>
                  <p className="text-xs text-gray-400 mt-1">روی دکمه "افزودن صوتی" کلیک کنید</p>
                </div>
              ) : (
                newCourse.courseAudios.map((audio, index) => (
                  <div key={audio.id} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="عنوان فایل صوتی (مثلاً: جلسه 1 - مقدمه)"
                        value={audio.title}
                        onChange={(e) => updateAudioField(audio.id, 'title', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => updateAudioField(audio.id, 'file', e.target.files?.[0] || null)}
                        className="w-full text-sm"
                      />
                      {audio.file && (
                        <p className="text-xs text-green-600">✓ {audio.file.name}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAudioField(audio.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800 p-1"
                      title="حذف"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
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
          setCourseVideos([]);
          setNewVideos([]);
        }}
        title="ویرایش دوره"
      >
        {isUploading && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">در حال آپلود فایل‌ها...</span>
              <span className="text-sm font-semibold text-blue-700">{Math.round(uploadProgress)}%</span>
            </div>
            {currentUploadFile && (
              <p className="text-xs text-blue-700 mb-2 truncate" title={currentUploadFile}>
                📁 {currentUploadFile}
              </p>
            )}
            <ProgressBar progress={uploadProgress} className="mb-2" />
            {uploadedBytes > 0 && totalBytes > 0 && (
              <div className="flex justify-between text-xs text-blue-600">
                <span>{(uploadedBytes / (1024 * 1024)).toFixed(2)} MB</span>
                <span>از {(totalBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}
          </div>
        )}
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

          {/* Existing Videos Section */}
          {courseVideos.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  ویدیوهای موجود ({courseVideos.length})
                </label>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {courseVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {video.title}
                      </p>
                      {video.description && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {video.description}
                        </p>
                      )}
                      {video.duration && (
                        <p className="text-xs text-gray-400 mt-1">
                          مدت: {Math.floor(video.duration / 60)} دقیقه
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVideo(video.id)}
                      className="flex-shrink-0 mr-2 text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                      title="حذف ویدیو"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Videos Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                افزودن ویدیوهای جدید
              </label>
              <button
                type="button"
                onClick={addNewVideoField}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                افزودن ویدیو
              </button>
            </div>
            {newVideos.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {newVideos.map((video) => (
                  <div key={video.id} className="flex gap-2 items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="عنوان ویدیو"
                        value={video.title}
                        onChange={(e) => updateNewVideoField(video.id, 'title', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => updateNewVideoField(video.id, 'file', e.target.files?.[0] || null)}
                        className="w-full text-sm"
                      />
                      {video.file && (
                        <p className="text-xs text-green-600">✓ {video.file.name} ({(video.file.size / (1024 * 1024)).toFixed(2)} MB)</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewVideoField(video.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800 p-1"
                      title="حذف"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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