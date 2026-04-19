import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { LoadingScreen, PageLoader } from './components/ui/index';
import CookieBanner from './components/CookieBanner';
import useSocket from './hooks/useSocket';

import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import AdminRegisterPage  from './pages/AdminRegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NotFoundPage       from './pages/NotFoundPage';
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage';

const StudentPage     = lazy(() => import('./pages/StudentPage'));
const DriverPage      = lazy(() => import('./pages/DriverPage'));
const AdminPage       = lazy(() => import('./pages/AdminPage'));
const PublicPage      = lazy(() => import('./pages/PublicPage'));
const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
const ChatPage        = lazy(() => import('./pages/ChatPage'));
const QRScanPage      = lazy(() => import('./pages/QRScanPage'));
const RouteEditorPage = lazy(() => import('./pages/RouteEditorPage'));
const StopManagerPage = lazy(() => import('./pages/StopManagerPage'));

const roleHome = role =>
  ({ driver: '/driver', admin: '/admin', superadmin: '/admin' }[role] ?? '/student');

const Protected = ({ children, roles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to={roleHome(user?.role)} replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={roleHome(user?.role)} replace />;
  return children;
};

const SocketInit = () => { useSocket(); return null; };
const Page = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

export default function App() {
  const { init, isAuthenticated } = useAuthStore();
  useEffect(() => { init(); }, [init]);

  return (
    <>
      {isAuthenticated && <SocketInit />}
      <CookieBanner />
      <Routes>
        <Route path="/"        element={<Page><PublicPage /></Page>} />
        <Route path="/public"  element={<Page><PublicPage /></Page>} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/login"           element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register"        element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/admin/signup"    element={<PublicOnly><AdminRegisterPage /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
        <Route path="/student/*" element={<Protected roles={['student']}><Page><StudentPage /></Page></Protected>} />
        <Route path="/driver/*"  element={<Protected roles={['driver']}><Page><DriverPage /></Page></Protected>} />
        <Route path="/admin/*"   element={<Protected roles={['admin','superadmin']}><Page><AdminPage /></Page></Protected>} />
        <Route path="/profile"   element={<Protected roles={['student','driver','admin','superadmin']}><Page><ProfilePage /></Page></Protected>} />
        <Route path="/chat"      element={<Protected roles={['student','driver','admin','superadmin']}><Page><ChatPage /></Page></Protected>} />
        <Route path="/checkin/:token" element={<Protected roles={['student']}><Page><QRScanPage /></Page></Protected>} />
        <Route path="/admin/routes/new"           element={<Protected roles={['admin','superadmin']}><Page><RouteEditorPage /></Page></Protected>} />
        <Route path="/admin/routes/:routeId/edit" element={<Protected roles={['admin','superadmin']}><Page><RouteEditorPage /></Page></Protected>} />
        <Route path="/admin/stops"                element={<Protected roles={['admin','superadmin']}><Page><StopManagerPage /></Page></Protected>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
