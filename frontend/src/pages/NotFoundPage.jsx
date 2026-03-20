import { Link } from 'react-router-dom';
import { Bus, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6"
    style={{ background: 'var(--navy)' }}>
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
      <Bus size={32} style={{ color: 'var(--brand)' }} />
    </div>
    <div className="text-center">
      <h1 className="font-display font-bold text-6xl mb-2" style={{ color: 'var(--brand)' }}>404</h1>
      <p className="text-lg mb-1" style={{ color: 'var(--text-1)' }}>Page not found</p>
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
        The shuttle you're looking for has gone off route.
      </p>
    </div>
    <Link to="/login" className="btn-primary flex items-center gap-2">
      <ArrowLeft size={16} /> Back to login
    </Link>
  </div>
);

export default NotFoundPage;