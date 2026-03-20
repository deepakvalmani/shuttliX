import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, AlertCircle,
  ShieldCheck, GraduationCap, Truck, Globe,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';

const ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.4)',
    desc: 'Manage your organisation',
  },
  {
    key: 'student',
    label: 'Student / Member',
    icon: GraduationCap,
    color: '#1A56DB',
    bg: 'rgba(26,86,219,0.12)',
    border: 'rgba(26,86,219,0.4)',
    desc: 'Track live shuttles',
  },
  {
    key: 'driver',
    label: 'Driver',
    icon: Truck,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.4)',
    desc: 'Share your location',
  },
  {
    key: 'public',
    label: 'Public User',
    icon: Globe,
    color: '#D97706',
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.4)',
    desc: 'View public routes',
  },
];

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', organizationCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const getRoleRedirect = (role) => {
    if (from) return from;
    if (role === 'driver') return '/driver';
    if (role === 'admin' || role === 'superadmin') return '/admin';
    return '/student';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setError('');
    setIsLoading(true);
    try {
      const user = await login(form.email, form.password, form.organizationCode);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(getRoleRedirect(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeRole = ROLES.find(r => r.key === selectedRole);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--navy)' }}>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full opacity-[0.07]"
            style={{ background: 'var(--brand)', filter: 'blur(70px)' }} />
          <div className="absolute bottom-1/4 -right-10 w-56 h-56 rounded-full opacity-[0.07]"
            style={{ background: '#8B5CF6', filter: 'blur(50px)' }} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #3B7FFF 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="18" height="12" rx="3" fill="white" />
              <rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.7)" />
              <rect x="4" y="10" width="4" height="3" rx="1" fill="rgba(26,86,219,0.5)" />
              <rect x="10" y="10" width="4" height="3" rx="1" fill="rgba(26,86,219,0.5)" />
              <rect x="16" y="10" width="3" height="3" rx="1" fill="rgba(26,86,219,0.5)" />
              <circle cx="7" cy="20" r="2" fill="#0D2137" stroke="white" strokeWidth="1" />
              <circle cx="17" cy="20" r="2" fill="#0D2137" stroke="white" strokeWidth="1" />
            </svg>
          </div>
          <div>
            <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
            <div className="text-xs" style={{ color: 'var(--brand)' }}>Transport Platform</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <div className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ background: 'rgba(26,86,219,0.15)', color: 'var(--brand)', border: '1px solid rgba(26,86,219,0.3)' }}>
              Real-time Tracking
            </div>
            <h2 className="font-display font-bold text-4xl leading-tight" style={{ color: 'var(--text-1)' }}>
              Know exactly where your shuttle is.{' '}
              <span style={{ color: 'var(--brand)' }}>Every second.</span>
            </h2>
          </div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Live GPS tracking, seat capacity, smart notifications — for universities, corporations, hospitals and more.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[['Real-time', 'GPS Updates'], ['Multi-org', 'Platform'], ['Any fleet', 'Worldwide']].map(([v, l]) => (
              <div key={v} className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <div className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{v}</div>
                <div className="text-xs" style={{ color: 'var(--text-4)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs relative" style={{ color: 'var(--text-4)' }}>© 2025 ShutliX · All rights reserved</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md animate-fade-in py-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #3B7FFF 100%)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="7" width="18" height="12" rx="3" fill="white" />
                <rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.7)" />
                <circle cx="7" cy="20" r="2" fill="#1A56DB" stroke="white" strokeWidth="1" />
                <circle cx="17" cy="20" r="2" fill="#1A56DB" stroke="white" strokeWidth="1" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
          </div>

          <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-1)' }}>Welcome back</h1>
          <p className="mb-8" style={{ color: 'var(--text-3)' }}>
            {selectedRole ? `Signing in as ${activeRole?.label}` : 'Choose your role to sign in'}
          </p>

          {/* STEP 1 — Role selector */}
          {!selectedRole ? (
            <div className="space-y-3">
              {ROLES.map(role => {
                const Icon = role.icon;
                return (
                  <button key={role.key} onClick={() => setSelectedRole(role.key)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all group"
                    style={{
                      background: role.bg,
                      border: `1px solid ${role.border}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${role.color}22`, border: `1px solid ${role.color}44` }}>
                      <Icon size={20} style={{ color: role.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{role.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{role.desc}</p>
                    </div>
                    <ArrowRight size={16} style={{ color: role.color }} />
                  </button>
                );
              })}

              <div className="pt-4 text-center space-y-2">
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Don't have an account?{' '}
                  <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                    Create account
                  </Link>
                </p>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Setting up a fleet?{' '}
                  <Link to="/admin/signup" className="font-medium hover:underline" style={{ color: '#8B5CF6' }}>
                    Create organisation →
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* STEP 2 — Login form for selected role */
            <div>
              {/* Role indicator + back */}
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
                style={{ background: activeRole.bg, border: `1px solid ${activeRole.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${activeRole.color}22` }}>
                  {(() => { const Icon = activeRole.icon; return <Icon size={16} style={{ color: activeRole.color }} />; })()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{activeRole.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{activeRole.desc}</p>
                </div>
                <button onClick={() => { setSelectedRole(null); setError(''); setForm({ email: '', password: '', organizationCode: '' }); }}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{ color: 'var(--text-3)', background: 'var(--surface-3)' }}>
                  Change
                </button>
              </div>

              {selectedRole === 'public' ? (
                /* Public user — redirect to public page */
                <div className="text-center space-y-4">
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    Public users can view routes and stops without an account.
                  </p>
                  <Link to="/public" className="btn-primary w-full flex items-center justify-center gap-2">
                    <Globe size={16} /> View Public Routes
                  </Link>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Want live tracking?{' '}
                    <Link to="/register" style={{ color: 'var(--brand)' }}>Create a free account</Link>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm animate-slide-down"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                      <AlertCircle size={16} className="flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="label">Email address</label>
                    <input type="email" className="input" placeholder="you@organisation.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      autoComplete="email" required autoFocus />
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} className="input pr-11"
                        placeholder="Enter your password"
                        value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        autoComplete="current-password" required />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1"
                        style={{ color: 'var(--text-3)' }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Org code — only for admin */}
                  {selectedRole === 'admin' && (
                    <div>
                      <label className="label">
                        Organisation code
                        <span className="ml-1 text-xs" style={{ color: activeRole.color }}>
                          * required for admin
                        </span>
                      </label>
                      <input type="text" className="input uppercase" placeholder="e.g. A3F9B2"
                        maxLength={10}
                        value={form.organizationCode}
                        onChange={e => setForm(f => ({ ...f, organizationCode: e.target.value.toUpperCase() }))}
                        required />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                        This was emailed to you when your organisation was created
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end mb-1">
                    <Link to="/forgot-password" className="text-xs hover:underline"
                      style={{ color: 'var(--brand)' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full"
                    style={{ background: activeRole.color }}>
                    {isLoading
                      ? <span className="dot-loader"><span /><span /><span /></span>
                      : <>Sign in as {activeRole.label} <ArrowRight size={18} /></>}
                  </button>
                </form>
              )}

              <div className="mt-6 pt-5 text-center space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  New to ShutliX?{' '}
                  <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
