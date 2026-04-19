/**
 * pages/LoginPage.jsx  v2.0
 * Changes:
 * – Uses ApiError.errors[] for field-level validation messages
 * – Field-level inline errors instead of a top error banner
 * – Accessible: aria-invalid, aria-describedby on inputs
 * – Prevents double-submit with ref guard
 * – Preserves "from" redirect after login
 */
import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, AlertCircle,
  ShieldCheck, GraduationCap, Truck, Globe,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BusLogo } from '../components/ui/index';
import ThemeToggle from '../components/ui/ThemeToggle';
import toast from 'react-hot-toast';

const ROLES = [
  { key: 'admin',   label: 'Admin',   icon: ShieldCheck,   color: '#7C3AED', desc: 'Manage fleet & organisation' },
  { key: 'student', label: 'Student', icon: GraduationCap, color: '#3B82F6', desc: 'Track live shuttles' },
  { key: 'driver',  label: 'Driver',  icon: Truck,         color: '#10B981', desc: 'Share your location' },
  { key: 'public',  label: 'Public',  icon: Globe,         color: '#F59E0B', desc: 'Browse public routes' },
];

const roleHome = r =>
  ({ driver: '/driver', admin: '/admin', superadmin: '/admin' }[r] ?? '/student');

export default function LoginPage() {
  const [role,     setRole]     = useState(null);
  const [form,     setForm]     = useState({ email: '', password: '', organizationCode: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});   // field-level errors
  const [topError, setTopError] = useState('');   // non-field errors

  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname;
  const submitting = useRef(false);

  const activeRole = ROLES.find(r => r.key === role);
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    // Clear error on change
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const redirect = r => navigate(from || roleHome(r), { replace: true });

  const submit = async e => {
    e.preventDefault();
    if (submitting.current) return;

    // Client-side validation
    const errs = {};
    if (!form.email)    errs.email    = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    if (role === 'admin' && !form.organizationCode)
      errs.organizationCode = 'Organisation code is required for admin login';

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setTopError('');
    setLoading(true);
    submitting.current = true;

    try {
      const user = await login(form.email, form.password, form.organizationCode);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
      redirect(user.role);
    } catch (err) {
      // Map field-level validation errors from server
      if (err.errors?.length) {
        const fieldErrs = {};
        err.errors.forEach(e => { fieldErrs[e.field] = e.message; });
        setErrors(fieldErrs);
      } else {
        setTopError(err.message || 'Login failed — please try again');
      }
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const resetRole = () => {
    setRole(null);
    setErrors({});
    setTopError('');
    setForm({ email: '', password: '', organizationCode: '' });
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-5 right-5 z-20"><ThemeToggle /></div>

      {/* ── Left branding panel ─────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 relative"
        style={{ background: 'var(--glass-1)', backdropFilter: 'blur(40px)', borderRight: '1px solid var(--border-1)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center glow-violet"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
          >
            <BusLogo size={26} />
          </div>
          <div>
            <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShuttliX</span>
            <p className="text-xs" style={{ color: 'var(--brand-light)' }}>Smart Shuttle Platform</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'var(--brand-subtle)', color: 'var(--brand-light)', border: '1px solid var(--border-brand)' }}
            >
              <span className="dot-green" /> Live Tracking
            </div>
            <h2 className="font-display font-bold text-4xl leading-tight" style={{ color: 'var(--text-1)' }}>
              Know where your shuttle is.{' '}
              <span className="text-gradient">Every second.</span>
            </h2>
          </div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Real-time GPS tracking, seat availability, smart alerts — for universities, campuses and corporate fleets.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[['Live GPS','Updates'],['Multi-org','Platform'],['Smart','Alerts']].map(([v,l]) => (
              <div key={v} className="glass rounded-2xl p-3 text-center">
                <div className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{v}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-5)' }}>© 2025 ShuttliX · All rights reserved</p>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
            >
              <BusLogo size={20} />
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShuttliX</span>
          </div>

          {/* ── Step 1: Role picker ───────────────────────── */}
          {!role ? (
            <>
              <h1 className="font-display font-bold text-3xl mb-1.5" style={{ color: 'var(--text-1)' }}>
                Welcome back
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-3)' }}>Choose your role to sign in</p>

              <div className="space-y-3">
                {ROLES.map(r => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.key}
                      onClick={() => r.key === 'public' ? navigate('/public') : setRole(r.key)}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-200"
                      style={{ background: 'var(--glass-2)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-1)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = `${r.color}50`;
                        e.currentTarget.style.background  = 'var(--glass-3)';
                        e.currentTarget.style.transform   = 'translateX(4px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-1)';
                        e.currentTarget.style.background  = 'var(--glass-2)';
                        e.currentTarget.style.transform   = 'translateX(0)';
                      }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${r.color}18`, border: `1px solid ${r.color}35` }}
                      >
                        <Icon size={20} style={{ color: r.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{r.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{r.desc}</p>
                      </div>
                      <ArrowRight size={16} style={{ color: r.color }} />
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 text-center space-y-2.5">
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  New to ShuttliX?{' '}
                  <Link to="/register" style={{ color: 'var(--brand-light)' }} className="font-medium hover:underline">
                    Create account
                  </Link>
                </p>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Setting up a fleet?{' '}
                  <Link to="/admin/signup" style={{ color: '#A78BFA' }} className="font-medium hover:underline">
                    Create organisation →
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* ── Step 2: Login form ─────────────────────── */
            <>
              {/* Active role badge */}
              <div
                className="flex items-center gap-3 mb-7 px-4 py-3 rounded-2xl"
                style={{ background: `${activeRole.color}10`, border: `1px solid ${activeRole.color}30` }}
              >
                {(() => { const Icon = activeRole.icon; return <Icon size={18} style={{ color: activeRole.color }} />; })()}
                <span className="font-semibold text-sm flex-1" style={{ color: 'var(--text-1)' }}>
                  {activeRole.label}
                </span>
                <button
                  onClick={resetRole}
                  className="text-xs px-3 py-1 rounded-lg transition-all"
                  style={{ background: 'var(--glass-2)', color: 'var(--text-3)', border: '1px solid var(--border-1)' }}
                >
                  Change
                </button>
              </div>

              <h1 className="font-display font-bold text-2xl mb-6" style={{ color: 'var(--text-1)' }}>
                Sign in
              </h1>

              {/* Top-level error (non-field) */}
              {topError && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 animate-slide-down"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
                  role="alert"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {topError}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4" noValidate>
                {/* Email */}
                <div>
                  <label className="label" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    className={`input ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="you@organisation.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    autoComplete="email"
                    autoFocus
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      className={`input pr-11 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Your password"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Org code (admin only) */}
                {role === 'admin' && (
                  <div>
                    <label className="label" htmlFor="orgCode">
                      Organisation Code <span style={{ color: 'var(--brand-light)' }}>*</span>
                    </label>
                    <input
                      id="orgCode"
                      type="text"
                      className={`input font-mono tracking-widest uppercase ${errors.organizationCode ? 'border-red-500' : ''}`}
                      placeholder="e.g. IBA001"
                      maxLength={10}
                      value={form.organizationCode}
                      onChange={e => set('organizationCode', e.target.value.toUpperCase())}
                      aria-invalid={!!errors.organizationCode}
                    />
                    {errors.organizationCode && (
                      <p className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
                        {errors.organizationCode}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: 'var(--brand-light)' }}>
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn-lg w-full"
                  style={{ background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}CC)` }}
                >
                  {loading
                    ? <span className="loader"><span /><span /><span /></span>
                    : <>Sign in <ArrowRight size={18} /></>
                  }
                </button>
              </form>

              <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border-1)' }}>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  New to ShuttliX?{' '}
                  <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand-light)' }}>
                    Create account
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
