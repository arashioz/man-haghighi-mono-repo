import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { coursesService, api, videosService, audiosService } from '../services/api';
import { Course, Video, Audio } from '../types';
import { truncateWords } from '../utils/text';

const MAX_EPISODES_PER_TYPE = 50;

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
  const [courseAudios, setCourseAudios] = useState<Audio[]>([]);
  const [newAudios, setNewAudios] = useState<Array<{id: string, file: File | null, title: string}>>([]);
  const [editAttachments, setEditAttachments] = useState<Array<{id: string, url: string, fileName: string}>>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [newIntroVideoFile, setNewIntroVideoFile] = useState<File | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: 0,
    published: false,
    showOnHomepage: true,
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

  const addNewAudioField = () => {
    if (courseAudios.length + newAudios.length >= MAX_EPISODES_PER_TYPE) {
      setError(`حداکثر ${MAX_EPISODES_PER_TYPE} فایل صوتی می‌توانید برای این دوره ثبت کنید`);
      return;
    }
    setError('');
    setNewAudios((prev) => [...prev, { id: Date.now().toString(), file: null, title: '' }]);
  };

  const removeNewAudioField = (id: string) => {
    setNewAudios((prev) => prev.filter((audio) => audio.id !== id));
  };

  const updateNewAudioField = (id: string, field: 'file' | 'title', value: File | null | string) => {
    setNewAudios((prev) =>
      prev.map((audio) => (audio.id === id ? { ...audio, [field]: value } : audio))
    );
  };

  const handleAttachmentSelection = (files: FileList | null) => {
    if (!files) return;
    setNewAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setEditAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  };

  const handleRemoveNewAttachment = (index: number) => {
    setNewAttachmentFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVideoFieldChange = (
    videoId: string,
    field: keyof Pick<Video, 'title' | 'description' | 'order' | 'published'>,
    value: string | number | boolean
  ) => {
    setCourseVideos((prev) =>
      prev.map((video) =>
        video.id === videoId ? { ...video, [field]: field === 'order' ? Number(value) : value } : video
      )
    );
  };

  const handleSaveVideoChanges = async (video: Video) => {
    try {
      await videosService.update(video.id, {
        title: video.title,
        description: video.description,
        order: video.order,
        published: video.published,
      });
      fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در به‌روزرسانی ویدیو');
    }
  };

  const handleAudioFieldChange = (
    audioId: string,
    field: keyof Pick<Audio, 'title' | 'description' | 'order' | 'published'>,
    value: string | number | boolean
  ) => {
    setCourseAudios((prev) =>
      prev.map((audio) =>
        audio.id === audioId ? { ...audio, [field]: field === 'order' ? Number(value) : value } : audio
      )
    );
  };

  const handleSaveAudioChanges = async (audio: Audio) => {
    try {
      await audiosService.update(audio.id, {
        title: audio.title,
        description: audio.description,
        order: audio.order,
        published: audio.published,
      });
      fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در به‌روزرسانی فایل صوتی');
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    if (!window.confirm('آیا از حذف این فایل صوتی اطمینان دارید؟')) {
      return;
    }

    try {
      await audiosService.delete(audioId);
      setCourseAudios((prev) => prev.filter((audio) => audio.id !== audioId));
      fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف فایل صوتی');
    }
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
        showOnHomepage: newCourse.showOnHomepage,
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
        showOnHomepage: true,
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
    setNewAudios([]);
    setNewAttachmentFiles([]);
    setNewThumbnailFile(null);
    setNewIntroVideoFile(null);

    const attachmentUrls = course.attachments || [];
    const attachmentFiles = (course as any).attachmentFiles || [];
    const combinedAttachments = attachmentUrls.map((url, index) => ({
      id: `${course.id}-attachment-${index}-${Date.now()}`,
      url,
      fileName: attachmentFiles[index] || url?.split('/').pop() || `attachment-${index + 1}`,
    }));
    setEditAttachments(combinedAttachments);
    
    // Fetch existing videos for this course
    try {
      const videos = await videosService.getAll(course.id);
      setCourseVideos(videos.sort((a, b) => a.order - b.order));
    } catch (err: any) {
      console.error('Error fetching course videos:', err);
      setCourseVideos([]);
    }

    try {
      const audios = await audiosService.getAll(course.id);
      const sortedAudios = Array.isArray(audios)
        ? audios.sort((a: Audio, b: Audio) => (a.order ?? 0) - (b.order ?? 0))
        : [];
      setCourseAudios(sortedAudios);
    } catch (err: any) {
      console.error('Error fetching course audios:', err);
      setCourseAudios([]);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('آیا از حذف این ویدیو اطمینان دارید؟')) {
      return;
    }

    try {
      await videosService.delete(videoId);
      setCourseVideos((prev) => prev.filter(v => v.id !== videoId));
      // Refresh courses list
      fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف ویدیو');
    }
  };

  const addNewVideoField = () => {
    if (courseVideos.length + newVideos.length >= MAX_EPISODES_PER_TYPE) {
      setError(`حداکثر ${MAX_EPISODES_PER_TYPE} ویدیو می‌توانید برای این دوره ثبت کنید`);
      return;
    }
    setError('');
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
    setUploadedBytes(0);
    setTotalBytes(0);
    setError('');

    const courseId = editingCourse.id;
    const videosToUpload = newVideos.filter((video) => video.file);
    const audiosToUpload = newAudios.filter((audio) => audio.file);

    if (courseVideos.length + videosToUpload.length > MAX_EPISODES_PER_TYPE) {
      setError(`تعداد ویدیوهای دوره نمی‌تواند بیشتر از ${MAX_EPISODES_PER_TYPE} عدد باشد`);
      setIsUploading(false);
      return;
    }

    if (courseAudios.length + audiosToUpload.length > MAX_EPISODES_PER_TYPE) {
      setError(`تعداد فایل‌های صوتی دوره نمی‌تواند بیشتر از ${MAX_EPISODES_PER_TYPE} عدد باشد`);
      setIsUploading(false);
      return;
    }

    // Validate audio files before upload
    const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/webm', 'audio/opus'];
    const allowedAudioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm', '.opus'];
    
    for (const audio of audiosToUpload) {
      if (!audio.file) continue;
      
      const fileExtension = audio.file.name.toLowerCase().substring(audio.file.name.lastIndexOf('.'));
      const isValidType = allowedAudioTypes.includes(audio.file.type);
      const isValidExtension = allowedAudioExtensions.some(ext => audio.file!.name.toLowerCase().endsWith(ext));
      
      if (!isValidType && !isValidExtension) {
        setError(`فایل صوتی "${audio.file.name}" فرمت نامعتبر دارد. فرمت‌های مجاز: mp3, wav, ogg, m4a, aac, flac, webm, opus`);
        setIsUploading(false);
        return;
      }
    }

    type PendingUpload = {
      url: string;
      fieldName: string;
      file: File;
      meta?: { title?: string };
    };

    const uploads: PendingUpload[] = [];

    if (newThumbnailFile) {
      uploads.push({
        url: `/courses/${courseId}/thumbnail`,
        fieldName: 'thumbnail',
        file: newThumbnailFile,
      });
    }

    if (newIntroVideoFile) {
      uploads.push({
        url: `/courses/${courseId}/video`,
        fieldName: 'video',
        file: newIntroVideoFile,
      });
    }

    newAttachmentFiles.forEach((file) => {
      uploads.push({
        url: `/courses/${courseId}/attachments`,
        fieldName: 'attachments',
        file,
      });
    });

    videosToUpload.forEach((video) => {
      if (!video.file) return;
      uploads.push({
        url: `/courses/${courseId}/courseVideos`,
        fieldName: 'courseVideos',
        file: video.file,
        meta: { title: video.title },
      });
    });

    audiosToUpload.forEach((audio) => {
      if (!audio.file) return;
      uploads.push({
        url: `/courses/${courseId}/courseAudios`,
        fieldName: 'courseAudios',
        file: audio.file,
        meta: { title: audio.title },
      });
    });

    const totalSize = uploads.reduce((sum, upload) => sum + (upload.file?.size || 0), 0);
    if (totalSize > 0) {
      setTotalBytes(totalSize);
    }

    try {
      const attachmentsToKeep = editAttachments
        .map((attachment) => attachment.fileName)
        .filter((name): name is string => Boolean(name));

      const updatePayload = {
        title: editingCourse.title,
        description: editingCourse.description,
        price: editingCourse.price,
        published: editingCourse.published,
        showOnHomepage: editingCourse.showOnHomepage ?? true,
        attachments: attachmentsToKeep,
      };

      const updatedCourse = await coursesService.update(courseId, updatePayload);
      setCourses((prev) =>
        prev.map((course) => (course.id === courseId ? updatedCourse : course))
      );

      let uploadedBytesTotal = 0;

      for (const upload of uploads) {
        const fileSize = upload.file.size || 0;
        const formData = new FormData();
        formData.append(upload.fieldName, upload.file);

        try {
          await uploadFileWithProgress(
            upload.url,
            formData,
            upload.file.name,
            fileSize,
            uploadedBytesTotal,
            totalSize || fileSize,
            (currentFileProgress: number) => {
              if (!totalSize) {
                setUploadProgress(currentFileProgress);
                return;
              }
              const overallProgress =
                ((uploadedBytesTotal + (fileSize * currentFileProgress) / 100) / totalSize) * 100;
              setUploadProgress(Math.min(100, overallProgress));
            }
          );

          uploadedBytesTotal += fileSize;
          setUploadedBytes(uploadedBytesTotal);
          if (totalSize) {
            setUploadProgress((uploadedBytesTotal / totalSize) * 100);
          } else {
            setUploadProgress(100);
          }
        } catch (uploadError: any) {
          // Extract error message from upload error
          const errorMessage = uploadError?.response?.data?.message || 
                              uploadError?.message || 
                              `خطا در اپلود فایل "${upload.file.name}"`;
          throw new Error(errorMessage);
        }
      }

      if (videosToUpload.length > 0) {
        const refreshedVideos = await videosService.getAll(courseId);
        const sortedVideos = refreshedVideos.sort((a, b) => a.order - b.order);
        const newlyCreatedVideos = sortedVideos.slice(-videosToUpload.length);
        await Promise.all(
          newlyCreatedVideos.map((video, index) => {
            const desiredTitle = videosToUpload[index]?.title?.trim();
            if (desiredTitle && desiredTitle !== video.title) {
              return videosService.update(video.id, { title: desiredTitle });
            }
            return Promise.resolve();
          })
        );
      }

      if (audiosToUpload.length > 0) {
        const refreshedAudios = await audiosService.getAll(courseId);
        const sortedAudios = Array.isArray(refreshedAudios)
          ? refreshedAudios.sort((a: Audio, b: Audio) => (a.order ?? 0) - (b.order ?? 0))
          : [];
        const newlyCreatedAudios = sortedAudios.slice(-audiosToUpload.length);
        await Promise.all(
          newlyCreatedAudios.map((audio, index) => {
            const desiredTitle = audiosToUpload[index]?.title?.trim();
            if (desiredTitle && desiredTitle !== audio.title) {
              return audiosService.update(audio.id, { title: desiredTitle });
            }
            return Promise.resolve();
          })
        );
      }

      await fetchCourses();

      setIsEditModalOpen(false);
      setEditingCourse(null);
      setCourseVideos([]);
      setCourseAudios([]);
      setNewVideos([]);
      setNewAudios([]);
      setEditAttachments([]);
      setNewAttachmentFiles([]);
      setNewThumbnailFile(null);
      setNewIntroVideoFile(null);
      setCurrentUploadFile('');
      setUploadProgress(0);
    } catch (err: any) {
      const message =
        err.response?.data?.message ??
        err.message ??
        'خطا در ویرایش دوره';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsUploading(false);
      setUploadedBytes(0);
      setTotalBytes(0);
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
                    صفحه اصلی
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
                            {course.description ? truncateWords(course.description, 20) : "..."}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.showOnHomepage !== false
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.showOnHomepage !== false ? '✓ نمایش' : '✗ مخفی'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {newCourse.description.length}/500 کاراکتر
            </p>
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
          <div className="flex items-center space-x-4 space-x-reverse">
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
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={newCourse.showOnHomepage}
                onChange={(e) => setNewCourse({...newCourse, showOnHomepage: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="mr-2 block text-sm text-gray-900">
                نمایش در صفحه اصلی
              </label>
            </div>
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
          setCourseAudios([]);
          setNewVideos([]);
          setNewAudios([]);
          setEditAttachments([]);
          setNewAttachmentFiles([]);
          setNewThumbnailFile(null);
          setNewIntroVideoFile(null);
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
        <form onSubmit={handleUpdateCourse} className="space-y-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {editingCourse?.description?.length || 0}/500 کاراکتر
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان)
            </label>
            <input
              type="number"
              value={editingCourse?.price ?? 0}
              onChange={(e) => setEditingCourse(prev => prev ? {...prev, price: Number(e.target.value)} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center space-x-4 space-x-reverse mb-4">
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingCourse?.showOnHomepage ?? true}
                  onChange={(e) => setEditingCourse(prev => prev ? {...prev, showOnHomepage: e.target.checked} : null)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="mr-2 block text-sm text-gray-900">
                  نمایش در صفحه اصلی
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تصویر شاخص
            </label>
            {editingCourse?.thumbnail ? (
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={editingCourse.thumbnail}
                  alt={editingCourse.title || 'Course thumbnail'}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                />
                <a
                  href={editingCourse.thumbnail}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  مشاهده تصویر
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-3">هیچ تصویری برای این دوره ثبت نشده است.</p>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewThumbnailFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {newThumbnailFile && (
                <div className="mt-2 flex items-center justify-between px-3 py-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="truncate">{newThumbnailFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setNewThumbnailFile(null)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ویدیو معرفی دوره
            </label>
            {editingCourse?.videoFile ? (
              <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
                <span className="truncate mr-3">{editingCourse.videoFile}</span>
                <a
                  href={editingCourse.videoFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  مشاهده
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-3">
                هیچ ویدیویی برای این دوره ثبت نشده است.
              </p>
            )}
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setNewIntroVideoFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {newIntroVideoFile && (
              <div className="mt-2 flex items-center justify-between px-3 py-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="truncate">{newIntroVideoFile.name}</span>
                <button
                  type="button"
                  onClick={() => setNewIntroVideoFile(null)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  حذف
                </button>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                فایل‌های ضمیمه
              </label>
              <span className="text-xs text-gray-400">
                {editAttachments.length} فایل ثبت‌شده
              </span>
            </div>
            {editAttachments.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {editAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 truncate mr-3"
                    >
                      {attachment.fileName}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">هیچ فایل ضمیمه‌ای برای این دوره ثبت نشده است.</p>
            )}
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-2">
                افزودن فایل‌های جدید
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                onChange={(e) => {
                  handleAttachmentSelection(e.target.files);
                  if (e.target) {
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {newAttachmentFiles.length > 0 && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {newAttachmentFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between px-3 py-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewAttachment(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {courseVideos.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  ویدیوهای موجود ({courseVideos.length})
                </label>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {courseVideos.map((video) => (
                  <div
                    key={video.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">عنوان</label>
                        <input
                          type="text"
                          value={video.title || ''}
                          onChange={(e) => handleVideoFieldChange(video.id, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">ترتیب</label>
                          <input
                            type="number"
                            value={video.order ?? 0}
                            onChange={(e) => handleVideoFieldChange(video.id, 'order', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent text-sm"
                            min={0}
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={video.published}
                            onChange={(e) => handleVideoFieldChange(video.id, 'published', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="mr-2 text-sm text-gray-700">منتشر شده</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">توضیحات</label>
                      <textarea
                        value={video.description || ''}
                        onChange={(e) => handleVideoFieldChange(video.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      {video.videoFile ? (
                        <a
                          href={video.videoFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          مشاهده ویدیو
                        </a>
                      ) : (
                        <span>فایل ویدیو بارگذاری نشده است.</span>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveVideoChanges(video)}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          ذخیره تغییرات
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
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
            {newVideos.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500">هیچ ویدیوی جدیدی اضافه نشده است</p>
                <p className="text-xs text-gray-400 mt-1">برای افزودن اپیزود جدید روی «افزودن ویدیو» کلیک کنید</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {newVideos.map((video, index) => (
                  <div key={video.id} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="عنوان ویدیو (مثلاً: اپیزود 1 - مقدمه)"
                        value={video.title}
                        onChange={(e) => updateNewVideoField(video.id, 'title', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => updateNewVideoField(video.id, 'file', e.target.files?.[0] || null)}
                        className="w-full text-sm"
                      />
                      {video.file && (
                        <p className="text-xs text-green-600">
                          ✓ {video.file.name} ({(video.file.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
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

          {courseAudios.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  فایل‌های صوتی موجود ({courseAudios.length})
                </label>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {courseAudios.map((audio) => (
                  <div
                    key={audio.id}
                    className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">عنوان</label>
                        <input
                          type="text"
                          value={audio.title || ''}
                          onChange={(e) => handleAudioFieldChange(audio.id, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus-border-transparent text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">ترتیب</label>
                          <input
                            type="number"
                            value={audio.order ?? 0}
                            onChange={(e) => handleAudioFieldChange(audio.id, 'order', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus-border-transparent text-sm"
                            min={0}
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={audio.published}
                            onChange={(e) => handleAudioFieldChange(audio.id, 'published', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="mr-2 text-sm text-gray-700">منتشر شده</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">توضیحات</label>
                      <textarea
                        value={audio.description || ''}
                        onChange={(e) => handleAudioFieldChange(audio.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus-border-transparent text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      {audio.audioFile ? (
                        <a
                          href={audio.audioFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800"
                        >
                          پخش فایل صوتی
                        </a>
                      ) : (
                        <span>فایل صوتی بارگذاری نشده است.</span>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveAudioChanges(audio)}
                          className="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          ذخیره تغییرات
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAudio(audio.id)}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                افزودن فایل‌های صوتی جدید
              </label>
              <button
                type="button"
                onClick={addNewAudioField}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                افزودن صوتی
              </button>
            </div>
            {newAudios.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                </svg>
                <p className="text-sm text-gray-500">هیچ فایل صوتی جدیدی اضافه نشده است</p>
                <p className="text-xs text-gray-400 mt-1">برای افزودن جلسه جدید روی «افزودن صوتی» کلیک کنید</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {newAudios.map((audio, index) => (
                  <div key={audio.id} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="عنوان فایل صوتی (مثلاً: جلسه 1 - مقدمه)"
                        value={audio.title}
                        onChange={(e) => updateNewAudioField(audio.id, 'title', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus-border-transparent"
                      />
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => updateNewAudioField(audio.id, 'file', e.target.files?.[0] || null)}
                        className="w-full text-sm"
                      />
                      {audio.file && (
                        <p className="text-xs text-green-600">
                          ✓ {audio.file.name} ({(audio.file.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewAudioField(audio.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800 p-1"
                      title="حذف"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6م1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                isUploading
                  ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
              disabled={isUploading}
            >
              انصراف
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors ${
                isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isUploading}
            >
              {isUploading ? 'در حال ویرایش...' : 'ویرایش دوره'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Courses;