/**
 * pages/NotFoundPage.jsx  v2.0
 * – Role-aware redirect: sends user to their correct home page
 * – Animated
 */
import { Link } from 'react-router-dom';
import { Bus, ArrowLeft, Home } from 'lucide-react';
import useAuthStore from '../store/authStore';

const roleHome = role =>
  ({ driver: '/driver', admin: '/admin', superadmin: '/admin' }[role] ?? '/student');

export default function NotFoundPage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center animate-scale-in"
        style={{
          background: 'var(--brand-subtle)',
          border:     '1px solid var(--border-brand)',
          boxShadow:  'var(--shadow-brand)',
        }}
      >
        <Bus size={36} style={{ color: 'var(--brand-light)' }} />
      </div>

      {/* Copy */}
      <div className="text-center animate-fade-in">
        <h1
          className="font-display font-bold text-7xl mb-3"
          style={{ color: 'var(--brand)', opacity: 0.9 }}
        >
          404
        </h1>
        <p className="text-xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
          Page not found
        </p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          The shuttle you're looking for has gone off route.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex gap-3 animate-slide-up">
        <button onClick={() => window.history.back()} className="btn-secondary gap-2">
          <ArrowLeft size={15} />
          Go back
        </button>

        <Link
          to={isAuthenticated ? roleHome(user?.role) : '/login'}
          className="btn-primary gap-2"
        >
          <Home size={15} />
          {isAuthenticated ? 'Dashboard' : 'Login'}
        </Link>
      </div>
    </div>
  );
}
