import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/UsersManagement';
import SalesPersons from './pages/SalesPersons';
import SalesManagement from './pages/SalesManagement';
import Workshops from './pages/Workshops';
import MyWorkshops from './pages/MyWorkshops';
import MyCustomers from './pages/MyCustomers';
import Sliders from './pages/Sliders';
import Articles from './pages/Articles';
import Podcasts from './pages/Podcasts';
import Courses from './pages/Courses';
import Invoices from './pages/Invoices';
import VideoPodcasts from './pages/VideoPodcasts';
import Comments from './pages/Comments';
import Logs from './pages/Logs';
import UploadCenter from './pages/UploadCenter';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Messages from './pages/Messages';
import PaymentLinks from './pages/PaymentLinks';
import SalesDashboard from './pages/SalesDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sales-dashboard" element={<SalesDashboard />} />
                    <Route path="/users-management" element={<UsersManagement />} />
                    <Route path="/sales-persons" element={<SalesPersons />} />
                    <Route path="/sales-management" element={<SalesManagement />} />
                    <Route path="/workshops" element={<Workshops />} />
                    <Route path="/my-workshops" element={<MyWorkshops />} />
                    <Route path="/my-customers" element={<MyCustomers />} />
                    <Route path="/sales-report" element={<Dashboard />} />
                    <Route path="/my-sales-report" element={<Dashboard />} />
                    <Route path="/sliders" element={<Sliders />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/podcasts" element={<Podcasts />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/video-podcasts" element={<VideoPodcasts />} />
                    <Route path="/comments" element={<Comments />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/payment-links" element={<PaymentLinks />} />
                    <Route path="/upload-center" element={<UploadCenter />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;