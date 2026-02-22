 import React, { useState, useEffect } from 'react';
import { slidersService, coursesService, articlesService, podcastsService, videoPodcastsService, workshopsService } from '../services/api';
import { Slider, Course, Article, Podcast, VideoPodcast, Workshop } from '../types';
import HomeV2 from '../components/home/HomeV2';
import { normalizePhoneNumber } from '../utils/phoneUtils';

const Home: React.FC = () => {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [videoPodcasts, setVideoPodcasts] = useState<VideoPodcast[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preRegisterModal, setPreRegisterModal] = useState<{isOpen: boolean, workshop: Workshop | null}>({isOpen: false, workshop: null});
  const [preRegisterData, setPreRegisterData] = useState({customerName: '', customerPhone: ''});
  const [preRegisterLoading, setPreRegisterLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
      const [slidersData, coursesData, articlesResponse, podcastsData, videoPodcastsData, workshopsData] = await Promise.all([
        slidersService.getActive(),
        coursesService.getForHomepage(),
        articlesService.getPublished({ limit: 3, page: 1 }),
        podcastsService.getPublished(),
        videoPodcastsService.getPublished(),
        workshopsService.getActive(),
      ]);

      setSliders(Array.isArray(slidersData) ? slidersData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setArticles(Array.isArray(articlesResponse?.data) ? articlesResponse.data : []);
      setPodcasts(Array.isArray(podcastsData) ? podcastsData : []);
      setVideoPodcasts(Array.isArray(videoPodcastsData) ? videoPodcastsData : []);
      setWorkshops(Array.isArray(workshopsData) ? workshopsData : []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegisterModal.workshop) return;

    setPreRegisterLoading(true);
    try {
      // Normalize phone number before sending
      const normalizedPhone = normalizePhoneNumber(preRegisterData.customerPhone);
      await workshopsService.preRegister(preRegisterModal.workshop.id, {
        customerName: preRegisterData.customerName,
        customerPhone: normalizedPhone,
      });
      
      alert('پیش‌ثبت‌نام با موفقیت انجام شد!');
      setPreRegisterModal({ isOpen: false, workshop: null });
      setPreRegisterData({ customerName: '', customerPhone: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در ثبت پیش‌ثبت‌نام');
    } finally {
      setPreRegisterLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-violet-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded max-w-md">
          {error}
        </div>
      </div>
    );
  }

  // Always use HomeV2 as the main homepage
  return (
    <>
      <HomeV2
        sliders={sliders}
        courses={courses}
        articles={articles || []}  // Ensure articles is always an array
        podcasts={podcasts}
        videoPodcasts={videoPodcasts}
        workshops={workshops}
        onBackToClassic={() => {}}
        onOpenPreRegister={(workshop) => {
          if (workshop) {
            setPreRegisterModal({ isOpen: true, workshop });
          }
        }}
      />
      
      {/* Pre-register Modal */}
      {preRegisterModal.isOpen && preRegisterModal.workshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">پیش‌ثبت‌نام در کارگاه</h3>
            <p className="text-gray-600 mb-6">{preRegisterModal.workshop.title}</p>
            <form onSubmit={handlePreRegister}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    value={preRegisterData.customerName}
                    onChange={(e) => setPreRegisterData({...preRegisterData, customerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره تماس</label>
                  <input
                    type="tel"
                    value={preRegisterData.customerPhone}
                    onChange={(e) => setPreRegisterData({...preRegisterData, customerPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPreRegisterModal({isOpen: false, workshop: null})}
                  disabled={preRegisterLoading}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={preRegisterLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50"
                >
                  {preRegisterLoading ? 'در حال ثبت...' : 'پیش‌ثبت‌نام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
