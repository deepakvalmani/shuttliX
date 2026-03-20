import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle,
  ShieldCheck, GraduationCap, Truck, Building2, Mail,
  Globe, ChevronLeft,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/ThemeToggle';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: ShieldCheck, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)', desc: 'Set up and manage your organisation fleet', link: '/admin/signup', linkLabel: 'Go to Organisation Setup →' },
  { key: 'student', label: 'Student / Member', icon: GraduationCap, color: '#1A56DB', bg: 'rgba(26,86,219,0.12)', border: 'rgba(26,86,219,0.4)', desc: 'Join your organisation and track shuttles' },
  { key: 'driver', label: 'Driver', icon: Truck, color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', desc: 'Share your GPS location with passengers' },
  { key: 'public', label: 'Public User', icon: Globe, color: '#D97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.4)', desc: 'View public routes without tracking', link: '/public', linkLabel: 'Browse public routes →' },
];

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationId: searchParams.get('org') || '',
    organizationCode: searchParams.get('code') || '',
    studentId: '',
    licenseNumber: '',
  });
  const [orgInfo, setOrgInfo] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (searchParams.get('org') && searchParams.get('code')) lookupOrg(searchParams.get('org'));
  }, []);

  const lookupOrg = async (codeOrId) => {
    if (!codeOrId) return;
    setIsLookingUp(true);
    try {
      const res = await api.get(`/auth/org-lookup?code=${codeOrId}`);
      setOrgInfo(res.data.data);
      f('organizationId', res.data.data._id);
    } catch { setOrgInfo(null); }
    finally { setIsLookingUp(false); }
  };

  const handleSendOTP = async () => {
    if (!form.name.trim()) { setError('Full name required'); return; }
    if (!form.email.trim()) { setError('Email required'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!form.organizationId) { setError('Organisation required — scan admin QR or enter org code'); return; }
    setError(''); setIsLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email });
      setStep(3);
      toast.success('OTP sent to ' + form.email);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const verifyRes = await api.post('/auth/verify-otp', { email: form.email, otp });
      const tempToken = verifyRes.data.tempToken;
      const user = await register({ name: form.name, email: form.email, password: form.password, role: selectedRole, organizationId: form.organizationId, studentId: form.studentId || undefined, licenseNumber: form.licenseNumber || undefined, tempToken });
      toast.success('Welcome to ShutliX, ' + user.name.split(' ')[0] + '!');
      navigate(selectedRole === 'driver' ? '/driver' : '/student', { replace: true });
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setIsLoading(false); }
  };

  const activeRole = ROLES.find(r => r.key === selectedRole);
  const isQRPrefilled = !!(searchParams.get('org') && searchParams.get('code'));

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--navy)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[360px] flex-shrink-0 p-12 relative overflow-hidden" style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #3B7FFF 100%)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="3" fill="white"/><rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.7)"/><circle cx="7" cy="20" r="2" fill="#0D2137" stroke="white" strokeWidth="1"/><circle cx="17" cy="20" r="2" fill="#0D2137" stroke="white" strokeWidth="1"/></svg>
          </div>
          <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
        </div>
        <div className="space-y-5">
          <h2 className="font-display font-bold text-3xl leading-tight" style={{ color: 'var(--text-1)' }}>Join your fleet today.</h2>
          <p style={{ color: 'var(--text-3)' }}>Scan your admin's QR or enter the org code and you're in.</p>
          <div className="space-y-3">
            {['Choose your role', 'Fill in your details', 'Verify email with OTP', 'Start tracking instantly'].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--brand)', color: 'white' }}>{i + 1}</div>
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-4)' }}>© 2025 ShutliX</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #3B7FFF 100%)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="3" fill="white"/><rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.7)"/><circle cx="7" cy="20" r="2" fill="#1A56DB" stroke="white" strokeWidth="1"/><circle cx="17" cy="20" r="2" fill="#1A56DB" stroke="white" strokeWidth="1"/></svg>
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
          </div>

          {/* STEP 1 — Role */}
          {step === 1 && (
            <>
              <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-1)' }}>Create account</h1>
              <p className="mb-8" style={{ color: 'var(--text-3)' }}>Choose your role to get started</p>
              <div className="space-y-3">
                {ROLES.map(role => {
                  const Icon = role.icon;
                  return (
                    <button key={role.key} onClick={() => { if (role.link) { navigate(role.link); return; } setSelectedRole(role.key); setStep(2); }}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                      style={{ background: role.bg, border: `1px solid ${role.border}` }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${role.color}22`, border: `1px solid ${role.color}44` }}>
                        <Icon size={20} style={{ color: role.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{role.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{role.link ? role.linkLabel : role.desc}</p>
                      </div>
                      <ArrowRight size={16} style={{ color: role.color }} />
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-center mt-6" style={{ color: 'var(--text-3)' }}>Already have an account?{' '}<Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>Sign in</Link></p>
            </>
          )}

          {/* STEP 2 — Details */}
          {step === 2 && activeRole && (
            <>
              <button onClick={() => { setStep(1); setSelectedRole(null); setError(''); }} className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70" style={{ color: 'var(--text-3)' }}><ChevronLeft size={16}/> Back</button>
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ background: activeRole.bg, border: `1px solid ${activeRole.border}` }}>
                {(() => { const Icon = activeRole.icon; return <Icon size={18} style={{ color: activeRole.color }} />; })()}
                <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Registering as {activeRole.label}</span>
              </div>
              <h1 className="font-display font-bold text-2xl mb-5" style={{ color: 'var(--text-1)' }}>Your details</h1>
              {error && <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}><AlertCircle size={16}/> {error}</div>}
              <div className="space-y-4">
                <div><label className="label">Full name *</label><input className="input" placeholder="Your full name" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></div>
                <div><label className="label">Email address *</label><input className="input" type="email" placeholder="you@organisation.com" value={form.email} onChange={e => f('email', e.target.value)} /></div>
                {isQRPrefilled ? (
                  <div className="px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <CheckCircle size={16} style={{ color: '#10B981' }} />
                    <div><p className="text-sm font-medium" style={{ color: '#34D399' }}>Organisation pre-filled via QR</p><p className="text-xs" style={{ color: 'var(--text-3)' }}>{orgInfo?.name || 'Verified'}</p></div>
                  </div>
                ) : (
                  <div>
                    <label className="label">Organisation code *</label>
                    <div className="flex gap-2">
                      <input className="input flex-1 uppercase" placeholder="e.g. A3F9B2" maxLength={10} value={form.organizationCode} onChange={e => f('organizationCode', e.target.value.toUpperCase())} onBlur={() => form.organizationCode.length >= 4 && lookupOrg(form.organizationCode)} />
                      <button onClick={() => lookupOrg(form.organizationCode)} disabled={isLookingUp} className="btn-secondary btn-sm px-3">{isLookingUp ? '...' : 'Verify'}</button>
                    </div>
                    {orgInfo && <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: '#34D399' }}><CheckCircle size={12}/> {orgInfo.name}</div>}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Get this from your admin or scan their QR code</p>
                  </div>
                )}
                {selectedRole === 'student' && <div><label className="label">Student ID <span style={{ color: 'var(--text-4)' }}>(optional)</span></label><input className="input" placeholder="e.g. IBA-2023-045" value={form.studentId} onChange={e => f('studentId', e.target.value)} /></div>}
                {selectedRole === 'driver' && <div><label className="label">Driving licence *</label><input className="input" placeholder="e.g. KHI-2020-11234" value={form.licenseNumber} onChange={e => f('licenseNumber', e.target.value)} /></div>}
                <div><label className="label">Password *</label><div className="relative"><input className="input pr-11" type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars, uppercase + number" value={form.password} onChange={e => f('password', e.target.value)} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1" style={{ color: 'var(--text-3)' }}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div>
                <div><label className="label">Confirm password *</label><input className="input" type={showPassword ? 'text' : 'password'} placeholder="Repeat password" value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)} /></div>
                <button onClick={handleSendOTP} disabled={isLoading} className="btn-primary btn-lg w-full gap-2" style={{ background: activeRole.color }}>
                  {isLoading ? <span className="dot-loader"><span/><span/><span/></span> : <><Mail size={16}/> Send verification OTP</>}
                </button>
              </div>
            </>
          )}

          {/* STEP 3 — OTP */}
          {step === 3 && (
            <>
              <button onClick={() => { setStep(2); setOtp(''); setError(''); }} className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70" style={{ color: 'var(--text-3)' }}><ChevronLeft size={16}/> Back</button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(26,86,219,0.12)', border: '1px solid rgba(26,86,219,0.3)' }}><Mail size={28} style={{ color: 'var(--brand)' }}/></div>
                <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-1)' }}>Check your email</h1>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>We sent a 6-digit code to <strong style={{ color: 'var(--text-1)' }}>{form.email}</strong></p>
              </div>
              {error && <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}><AlertCircle size={16}/> {error}</div>}
              <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                <div><label className="label">6-digit OTP</label><input className="input text-center font-mono text-2xl tracking-widest" type="text" maxLength={6} placeholder="· · · · · ·" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /><p className="text-xs mt-1 text-center" style={{ color: 'var(--text-4)' }}>Expires in 5 minutes</p></div>
                <button type="submit" disabled={isLoading || otp.length < 6} className="btn-primary btn-lg w-full">{isLoading ? <span className="dot-loader"><span/><span/><span/></span> : <>Verify & Create Account <ArrowRight size={18}/></>}</button>
                <button type="button" onClick={handleSendOTP} className="text-sm w-full text-center hover:opacity-70" style={{ color: 'var(--text-3)' }}>Didn't receive it? Resend OTP</button>
              </form>
            </>
          )}

          {step < 3 && <p className="text-sm text-center mt-6" style={{ color: 'var(--text-3)' }}>Already have an account?{' '}<Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>Sign in</Link></p>}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
