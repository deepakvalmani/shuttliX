import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, Lock, CheckCircle, AlertCircle, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { BusLogo } from '../components/ui/index';
import ThemeToggle from '../components/ui/ThemeToggle';
import api from '../services/api';
import toast from 'react-hot-toast';

const STEPS = ['Email', 'OTP', 'New Password', 'Done'];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [tempToken, setTmpToken] = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const sendOTP = async e => {
    e.preventDefault();
    if (!email.trim()) { setError('Email required'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
      toast.success('Reset code sent!');
    } catch (err) { setError(err.response?.data?.message || 'Failed to send code'); }
    finally { setLoading(false); }
  };

  const verifyOTP = async e => {
    e.preventDefault();
    if (otp.length < 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp, purpose: 'reset' });
      setTmpToken(data.tempToken);
      setStep(3);
    } catch (err) { setError(err.response?.data?.message || 'Invalid or expired code'); }
    finally { setLoading(false); }
  };

  const resetPassword = async e => {
    e.preventDefault();
    if (newPwd !== confirm) { setError('Passwords do not match'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPwd)) {
      setError('Password must be 8+ chars with uppercase, lowercase and a number'); return;
    }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, tempToken, newPassword: newPwd });
      setStep(4);
    } catch (err) { setError(err.response?.data?.message || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-5 right-5"><ThemeToggle /></div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
            <BusLogo size={18} />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all"
                style={{
                  background: i + 1 < step ? 'var(--success)' : i + 1 === step ? 'var(--brand)' : 'var(--glass-2)',
                  color: i + 1 <= step ? 'white' : 'var(--text-4)',
                }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 w-8 rounded-full transition-all"
                  style={{ background: i + 1 < step ? 'var(--success)' : 'var(--border-1)' }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 animate-slide-down"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
            <AlertCircle size={15} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Step 1 — Email */}
        {step === 1 && (
          <>
            <h1 className="font-display font-bold text-2xl mb-1.5" style={{ color: 'var(--text-1)' }}>Forgot password?</h1>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-3)' }}>Enter your email and we'll send a reset code.</p>
            <form onSubmit={sendOTP} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@organisation.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
                {loading ? <span className="loader"><span/><span/><span/></span> : <><Mail size={16}/> Send reset code</>}
              </button>
            </form>
            <div className="mt-5 text-center">
              <Link to="/login" className="text-sm hover:underline flex items-center justify-center gap-1.5"
                style={{ color: 'var(--text-3)' }}>
                <ArrowLeft size={14}/> Back to login
              </Link>
            </div>
          </>
        )}

        {/* Step 2 — OTP */}
        {step === 2 && (
          <>
            <button onClick={() => { setStep(1); setOtp(''); setError(''); }}
              className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70" style={{ color: 'var(--text-3)' }}>
              <ChevronLeft size={16}/> Back
            </button>
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
                <Mail size={26} style={{ color: 'var(--brand-light)' }} />
              </div>
              <h1 className="font-display font-bold text-2xl mb-1.5" style={{ color: 'var(--text-1)' }}>Enter reset code</h1>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Sent to <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
              </p>
            </div>
            <form onSubmit={verifyOTP} className="space-y-4">
              <div>
                <label className="label">6-digit code</label>
                <input className="input text-center font-mono text-3xl tracking-[0.5em]"
                  type="text" maxLength={6} placeholder="······"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} autoFocus />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary btn-lg w-full">
                {loading ? <span className="loader"><span/><span/><span/></span> : 'Verify code'}
              </button>
              <button type="button" onClick={sendOTP} className="w-full text-sm text-center hover:opacity-70"
                style={{ color: 'var(--text-3)' }}>
                Resend code
              </button>
            </form>
          </>
        )}

        {/* Step 3 — New password */}
        {step === 3 && (
          <>
            <h1 className="font-display font-bold text-2xl mb-1.5" style={{ color: 'var(--text-1)' }}>New password</h1>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-3)' }}>Choose a strong password.</p>
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input className="input pr-11" type={showPwd ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase + number"
                    value={newPwd} onChange={e => setNewPwd(e.target.value)} autoFocus />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1">
                    {showPwd ? <Eye size={16}/> : <EyeOff size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input className="input" type={showPwd ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary btn-lg w-full gap-2">
                {loading ? <span className="loader"><span/><span/><span/></span> : <><Lock size={16}/> Set new password</>}
              </button>
            </form>
          </>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}>
              <CheckCircle size={32} style={{ color: '#10B981' }} />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-1)' }}>Password reset!</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
              Your password has been updated successfully.
            </p>
            <button onClick={() => navigate('/login')} className="btn-primary btn-lg w-full gap-2">
              <ArrowRight size={18}/> Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
