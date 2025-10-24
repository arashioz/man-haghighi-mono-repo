import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/UsersManagement';
import SalesPersons from './pages/SalesPersons';
import SalesManagement from './pages/SalesManagement';
import MyTeam from './pages/MyTeam';
import Workshops from './pages/Workshops';
import MyWorkshops from './pages/MyWorkshops';
import MyCustomers from './pages/MyCustomers';
import Sliders from './pages/Sliders';
import Articles from './pages/Articles';
import Podcasts from './pages/Podcasts';
import Courses from './pages/Courses';
import Videos from './pages/Videos';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

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
                    <Route path="/users-management" element={<UsersManagement />} />
                    <Route path="/sales-persons" element={<SalesPersons />} />
                    <Route path="/sales-management" element={<SalesManagement />} />
                    <Route path="/my-team" element={<MyTeam />} />
                    <Route path="/workshops" element={<Workshops />} />
                    <Route path="/my-workshops" element={<MyWorkshops />} />
                    <Route path="/my-customers" element={<MyCustomers />} />
                    <Route path="/sales-report" element={<Dashboard />} />
                    <Route path="/my-sales-report" element={<Dashboard />} />
                    <Route path="/sliders" element={<Sliders />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/podcasts" element={<Podcasts />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/videos" element={<Videos />} />
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