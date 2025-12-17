import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Articles from './pages/Articles';
import Podcasts from './pages/Podcasts';
import PodcastDetail from './pages/PodcastDetail';
import VideoPodcasts from './pages/VideoPodcasts';
import Courses from './pages/Courses';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import ArticleDetail from './pages/ArticleDetail';
import CourseDetail from './pages/CourseDetail';
import VideoPlayer from './pages/VideoPlayer';
import AudioPlayer from './pages/AudioPlayer';
import VideoPodcastDetail from './pages/VideoPodcastDetail';

function App() {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/podcasts" element={<Podcasts />} />
              <Route path="/podcasts/:id" element={<PodcastDetail />} />
              <Route path="/video-podcasts" element={<VideoPodcasts />} />
              <Route path="/video-podcasts/:id" element={<VideoPodcastDetail />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/courses/:courseId/videos/:videoId" element={<VideoPlayer />} />
              <Route path="/courses/:courseId/audios/:audioId" element={<AudioPlayer />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<UserDashboard />} />
            </Routes>
          </Layout>
        </Router>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}

export default App;