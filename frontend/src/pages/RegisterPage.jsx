import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle, Mail, ChevronLeft,
  ShieldCheck, GraduationCap, Truck } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BusLogo } from '../components/ui/index';
import ThemeToggle from '../components/ui/ThemeToggle';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLES = [
  { key: 'student', label: 'Student / Member', icon: GraduationCap, color: '#3B82F6', desc: 'Join your org and track shuttles' },
  { key: 'driver',  label: 'Driver',           icon: Truck,         color: '#10B981', desc: 'Share GPS with passengers' },
];

export default function RegisterPage() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { register } = useAuthStore();

  const [step, setStep]         = useState(1); // 1=role, 2=details, 3=otp
  const [role, setRole]         = useState(null);
  const [form, setForm]         = useState({
    name: '', email: '', password: '', confirmPassword: '',
    organizationId: params.get('org') || '',
    organizationCode: params.get('code') || '',
    studentId: '', licenseNumber: '',
  });
  const [orgInfo, setOrgInfo]   = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [showPass, setShowPass]  = useState(false);
  const [otp, setOtp]           = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const activeRole = ROLES.find(r => r.key === role);

  useEffect(() => {
    if (params.get('org')) lookupOrg(params.get('org'));
  }, []);

  const lookupOrg = async code => {
    if (!code) return;
    setLookingUp(true);
    try {
      const { data } = await api.get(`/auth/org-lookup?code=${code}`);
      setOrgInfo(data.data);
      f('organizationId', data.data._id);
    } catch { setOrgInfo(null); }
    finally { setLookingUp(false); }
  };

  const sendOTP = async () => {
    if (!form.name.trim())  { setError('Full name required'); return; }
    if (!form.email.trim()) { setError('Email required'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('Password must be 8+ chars with uppercase, lowercase and a number'); return;
    }
    if (!form.organizationId) { setError('Organisation required — enter the org code'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email, purpose: 'register' });
      setStep(3);
      toast.success(`OTP sent to ${form.email}`);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const verifyAndRegister = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // 1. Verify OTP → get tempToken
      const { data: vd } = await api.post('/auth/verify-otp', {
        email: form.email, otp, purpose: 'register',
      });
      // 2. Register
      const user = await register({
        name: form.name, email: form.email, password: form.password,
        role, organizationId: form.organizationId,
        tempToken: vd.tempToken,
        studentId:     role === 'student' ? form.studentId     : undefined,
        licenseNumber: role === 'driver'  ? form.licenseNumber : undefined,
      });
      toast.success(`Welcome, ${user.name.split(' ')[0]}! 🎉`);
      navigate(role === 'driver' ? '/driver' : '/student', { replace: true });
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[360px] flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: 'var(--glass-1)', backdropFilter: 'blur(40px)', borderRight: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
            <BusLogo size={20} />
          </div>
          <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
        </div>
        <div className="space-y-5">
          <h2 className="font-display font-bold text-3xl leading-tight" style={{ color: 'var(--text-1)' }}>
            Join your fleet <span className="text-gradient">today.</span>
          </h2>
          <p style={{ color: 'var(--text-3)' }}>Enter your org code and get started in under 2 minutes.</p>
          <div className="space-y-3">
            {['Choose your role','Fill in your details','Verify email with OTP','Start tracking'].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                  style={{ background: 'var(--brand)' }}>{i + 1}</div>
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-5)' }}>© 2025 ShutliX</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
                <BusLogo size={18} />
              </div>
              <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
            </div>
            <div className="ml-auto"><ThemeToggle /></div>
          </div>

          {/* STEP 1 — Role */}
          {step === 1 && (
            <>
              <h1 className="font-display font-bold text-3xl mb-1.5" style={{ color: 'var(--text-1)' }}>Create account</h1>
              <p className="mb-8" style={{ color: 'var(--text-3)' }}>Choose your role to get started</p>
              <div className="space-y-3">
                {ROLES.map(r => {
                  const Icon = r.icon;
                  return (
                    <button key={r.key} onClick={() => { setRole(r.key); setStep(2); }}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                      style={{ background: `${r.color}0F`, border: `1px solid ${r.color}35` }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${r.color}20`, border: `1px solid ${r.color}44` }}>
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
                <div className="mt-2 px-5 py-4 rounded-2xl text-sm cursor-pointer transition-all"
                  style={{ background: 'var(--glass-1)', border: '1px solid var(--border-1)', color: 'var(--text-3)' }}
                  onClick={() => navigate('/admin/signup')}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                      <ShieldCheck size={20} style={{ color: 'var(--brand-light)' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Admin</p>
                      <p className="text-xs" style={{ color: '#A78BFA' }}>Create a new organisation →</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-center mt-6" style={{ color: 'var(--text-3)' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand-light)' }}>Sign in</Link>
              </p>
            </>
          )}

          {/* STEP 2 — Details */}
          {step === 2 && activeRole && (
            <>
              <button onClick={() => { setStep(1); setRole(null); setError(''); }}
                className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-3)' }}>
                <ChevronLeft size={16} /> Back
              </button>

              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
                style={{ background: `${activeRole.color}10`, border: `1px solid ${activeRole.color}30` }}>
                {(() => { const Icon = activeRole.icon; return <Icon size={18} style={{ color: activeRole.color }} />; })()}
                <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                  Registering as {activeRole.label}
                </span>
              </div>

              <h1 className="font-display font-bold text-2xl mb-5" style={{ color: 'var(--text-1)' }}>Your details</h1>

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 animate-slide-down"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                  <AlertCircle size={15} className="flex-shrink-0" /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="label">Full name *</label>
                  <input className="input" placeholder="Your full name" value={form.name}
                    onChange={e => f('name', e.target.value)} autoFocus />
                </div>

                <div>
                  <label className="label">Email address *</label>
                  <input className="input" type="email" placeholder="you@organisation.com" value={form.email}
                    onChange={e => f('email', e.target.value)} />
                </div>

                {/* Org code */}
                {orgInfo ? (
                  <div className="px-4 py-3 rounded-xl flex items-center gap-3"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <CheckCircle size={16} style={{ color: '#10B981' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#34D399' }}>Organisation verified</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{orgInfo.name}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="label">Organisation Code *</label>
                    <div className="flex gap-2">
                      <input className="input flex-1 font-mono tracking-widest uppercase" placeholder="e.g. IBA001"
                        maxLength={10} value={form.organizationCode}
                        onChange={e => f('organizationCode', e.target.value.toUpperCase())}
                        onBlur={() => form.organizationCode.length >= 4 && lookupOrg(form.organizationCode)} />
                      <button onClick={() => lookupOrg(form.organizationCode)}
                        disabled={lookingUp} className="btn-glass btn-sm px-3">
                        {lookingUp ? '...' : 'Verify'}
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Get this from your admin</p>
                  </div>
                )}

                {role === 'student' && (
                  <div>
                    <label className="label">Student ID <span style={{ color: 'var(--text-4)' }}>(optional)</span></label>
                    <input className="input" placeholder="e.g. IBA-2023-045" value={form.studentId}
                      onChange={e => f('studentId', e.target.value)} />
                  </div>
                )}

                {role === 'driver' && (
                  <div>
                    <label className="label">Driving Licence *</label>
                    <input className="input" placeholder="e.g. KHI-2020-11234" value={form.licenseNumber}
                      onChange={e => f('licenseNumber', e.target.value)} />
                  </div>
                )}

                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input className="input pr-11" type={showPass ? 'text' : 'password'}
                      placeholder="Min 8 chars, uppercase + number" value={form.password}
                      onChange={e => f('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirm password *</label>
                  <input className="input" type={showPass ? 'text' : 'password'}
                    placeholder="Repeat password" value={form.confirmPassword}
                    onChange={e => f('confirmPassword', e.target.value)} />
                </div>

                <button onClick={sendOTP} disabled={loading} className="btn-primary btn-lg w-full gap-2"
                  style={{ background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}CC)` }}>
                  {loading
                    ? <span className="loader"><span /><span /><span /></span>
                    : <><Mail size={16} /> Send verification OTP</>}
                </button>
              </div>
            </>
          )}

          {/* STEP 3 — OTP */}
          {step === 3 && (
            <>
              <button onClick={() => { setStep(2); setOtp(''); setError(''); }}
                className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70"
                style={{ color: 'var(--text-3)' }}>
                <ChevronLeft size={16} /> Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
                  <Mail size={28} style={{ color: 'var(--brand-light)' }} />
                </div>
                <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-1)' }}>Check your email</h1>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  We sent a 6-digit code to{' '}
                  <strong style={{ color: 'var(--text-1)' }}>{form.email}</strong>
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <form onSubmit={verifyAndRegister} className="space-y-5">
                <div>
                  <label className="label">6-digit OTP</label>
                  <input className="input text-center font-mono text-3xl tracking-[0.5em]"
                    type="text" maxLength={6} placeholder="······"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus />
                  <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-4)' }}>
                    Expires in 5 minutes
                  </p>
                </div>

                <button type="submit" disabled={loading || otp.length < 6} className="btn-primary btn-lg w-full">
                  {loading
                    ? <span className="loader"><span /><span /><span /></span>
                    : <>Verify & Create Account <ArrowRight size={18} /></>}
                </button>

                <button type="button" onClick={sendOTP}
                  className="w-full text-sm text-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-3)' }}>
                  Didn't receive it? Resend OTP
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
