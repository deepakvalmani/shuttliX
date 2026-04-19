import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { LoadingScreen } from './components/ui/index';
import CookieBanner from './components/CookieBanner';
import useSocket from './hooks/useSocket';

import LoginPage          from './pages/LoginPage';
import NotFoundPage       from './pages/NotFoundPage';
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage';
import ChatPage           from './pages/ChatPage';

const SocketInit = () => { useSocket(); return null; };

export default function App() {
  const { init, isAuthenticated } = useAuthStore();
  useEffect(() => { init(); }, [init]);

  return (
    <>
      {isAuthenticated && <SocketInit />}
      <CookieBanner />
      <Routes>
        <Route path="/"        element={<Navigate to="/login" replace />} />
        <Route path="/public"  element={<Navigate to="/login" replace />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/chat"    element={<ChatPage />} />
        <Route path="*"        element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
