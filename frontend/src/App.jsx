import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useSocket from './hooks/useSocket';
import { LoadingScreen } from './components/ui/index';

import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import StudentPage       from './pages/StudentPage';
import DriverPage        from './pages/DriverPage';
import AdminPage         from './pages/AdminPage';
import PublicPage        from './pages/PublicPage';
import ProfilePage       from './pages/ProfilePage';
import ChatPage          from './pages/ChatPage';
import QRScanPage        from './pages/QRScanPage';
import RouteEditorPage   from './pages/RouteEditorPage';
import StopManagerPage   from './pages/StopManagerPage';
import NotFoundPage      from './pages/NotFoundPage';

const roleHome = role => ({ driver: '/driver', admin: '/admin', superadmin: '/admin' }[role] || '/student');

const Protected = ({ children, roles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to={roleHome(user?.role)} replace />;
  return children;
};

const Public = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={roleHome(user?.role)} replace />;
  return children;
};

const SocketInit = () => { useSocket(); return null; };

export default function App() {
  const { init, isAuthenticated } = useAuthStore();
  useEffect(() => { init(); }, []);

  return (
    <>
      {isAuthenticated && <SocketInit />}
      <Routes>
        {/* Public pages */}
        <Route path="/"           element={<PublicPage />} />
        <Route path="/public"     element={<PublicPage />} />
        <Route path="/login"      element={<Public><LoginPage /></Public>} />
        <Route path="/register"   element={<Public><RegisterPage /></Public>} />
        <Route path="/admin/signup" element={<Public><AdminRegisterPage /></Public>} />
        <Route path="/forgot-password" element={<Public><ForgotPasswordPage /></Public>} />

        {/* Role-protected */}
        <Route path="/student/*"  element={<Protected roles={['student']}><StudentPage /></Protected>} />
        <Route path="/driver/*"   element={<Protected roles={['driver']}><DriverPage /></Protected>} />
        <Route path="/admin/*"    element={<Protected roles={['admin','superadmin']}><AdminPage /></Protected>} />

        {/* Shared authenticated */}
        <Route path="/profile"    element={<Protected roles={['student','driver','admin','superadmin']}><ProfilePage /></Protected>} />
        <Route path="/chat"       element={<Protected roles={['student','driver','admin','superadmin']}><ChatPage /></Protected>} />
        <Route path="/checkin/:token" element={<Protected roles={['student']}><QRScanPage /></Protected>} />

        {/* Admin tools */}
        <Route path="/admin/routes/new"          element={<Protected roles={['admin','superadmin']}><RouteEditorPage /></Protected>} />
        <Route path="/admin/routes/:routeId/edit" element={<Protected roles={['admin','superadmin']}><RouteEditorPage /></Protected>} />
        <Route path="/admin/stops"               element={<Protected roles={['admin','superadmin']}><StopManagerPage /></Protected>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
