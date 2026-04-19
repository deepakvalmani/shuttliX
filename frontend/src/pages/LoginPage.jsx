import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, GraduationCap, Truck, Globe } from 'lucide-react';
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

export default function LoginPage() {
  const [role, setRole]           = useState(null);
  const [form, setForm]           = useState({ email: '', password: '', organizationCode: '' });
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname;

  const activeRole = ROLES.find(r => r.key === role);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const redirect = r => {
    if (from) return navigate(from, { replace: true });
    navigate({ driver: '/driver', admin: '/admin', superadmin: '/admin' }[r] || '/student', { replace: true });
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password, form.organizationCode);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
      redirect(user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 relative"
        style={{ background: 'var(--glass-1)', backdropFilter: 'blur(40px)', borderRight: '1px solid var(--border-1)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center glow-violet"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
            <BusLogo size={26} />
          </div>
          <div>
            <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
            <p className="text-xs" style={{ color: 'var(--brand-light)' }}>Smart Shuttle Platform</p>
          </div>
        </div>

        {/* Hero */}
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'var(--brand-subtle)', color: 'var(--brand-light)', border: '1px solid var(--border-brand)' }}>
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

        <p className="text-xs" style={{ color: 'var(--text-5)' }}>© 2025 ShutliX · All rights reserved</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
              <BusLogo size={20} />
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
          </div>

          {!role ? (
            <>
              <h1 className="font-display font-bold text-3xl mb-1.5" style={{ color: 'var(--text-1)' }}>Welcome back</h1>
              <p className="mb-8" style={{ color: 'var(--text-3)' }}>Choose your role to sign in</p>

              <div className="space-y-3">
                {ROLES.map(r => {
                  const Icon = r.icon;
                  return (
                    <button key={r.key}
                      onClick={() => r.key === 'public' ? navigate('/public') : setRole(r.key)}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-200"
                      style={{ background: 'var(--glass-2)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-1)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = `${r.color}50`;
                        e.currentTarget.style.background = 'var(--glass-3)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-1)';
                        e.currentTarget.style.background = 'var(--glass-2)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${r.color}18`, border: `1px solid ${r.color}35` }}>
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
                  New to ShutliX?{' '}
                  <Link to="/register" style={{ color: 'var(--brand-light)' }} className="font-medium hover:underline">Create account</Link>
                </p>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Setting up a fleet?{' '}
                  <Link to="/admin/signup" style={{ color: '#A78BFA' }} className="font-medium hover:underline">Create organisation →</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Role badge */}
              <div className="flex items-center gap-3 mb-7 px-4 py-3 rounded-2xl"
                style={{ background: `${activeRole.color}10`, border: `1px solid ${activeRole.color}30` }}>
                {(() => { const Icon = activeRole.icon; return <Icon size={18} style={{ color: activeRole.color }} />; })()}
                <span className="font-semibold text-sm flex-1" style={{ color: 'var(--text-1)' }}>{activeRole.label}</span>
                <button onClick={() => { setRole(null); setError(''); setForm({ email:'',password:'',organizationCode:'' }); }}
                  className="text-xs px-3 py-1 rounded-lg transition-all"
                  style={{ background: 'var(--glass-2)', color: 'var(--text-3)', border: '1px solid var(--border-1)' }}>
                  Change
                </button>
              </div>

              <h1 className="font-display font-bold text-2xl mb-6" style={{ color: 'var(--text-1)' }}>Sign in</h1>

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 animate-slide-down"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                  <AlertCircle size={16} className="flex-shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@organisation.com"
                    value={form.email} onChange={e => set('email', e.target.value)}
                    autoComplete="email" autoFocus required />
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} className="input pr-11"
                      placeholder="Your password"
                      value={form.password} onChange={e => set('password', e.target.value)}
                      autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {role === 'admin' && (
                  <div>
                    <label className="label">Organisation Code <span style={{ color: 'var(--brand-light)' }}>*</span></label>
                    <input type="text" className="input font-mono tracking-widest uppercase"
                      placeholder="e.g. IBA001" maxLength={10}
                      value={form.organizationCode}
                      onChange={e => set('organizationCode', e.target.value.toUpperCase())}
                      required />
                  </div>
                )}

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: 'var(--brand-light)' }}>
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full"
                  style={{ background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}CC)` }}>
                  {loading
                    ? <span className="loader"><span /><span /><span /></span>
                    : <>Sign in <ArrowRight size={18} /></>}
                </button>
              </form>

              <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border-1)' }}>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  New to ShutliX?{' '}
                  <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand-light)' }}>Create account</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
