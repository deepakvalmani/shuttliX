import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

const BusLogo = () => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1A56DB, #3B7FFF)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="12" rx="3" fill="white"/>
        <rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.7)"/>
        <circle cx="7" cy="20" r="2" fill="#1A56DB" stroke="white" strokeWidth="1"/>
        <circle cx="17" cy="20" r="2" fill="#1A56DB" stroke="white" strokeWidth="1"/>
      </svg>
    </div>
    <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
  </div>
);

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email · 2: otp · 3: new password · 4: done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email required'); return; }
    setError(''); setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
      toast.success('Reset code sent — check your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally { setIsLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setIsLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp, purpose: 'reset' });
      setTempToken(res.data.tempToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, tempToken, newPassword });
      setStep(4);
      toast.success('Password reset successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative"
      style={{ background: 'var(--surface-1)' }}>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8"><BusLogo /></div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: step > s ? '#10B981' : step === s ? 'var(--brand)' : 'var(--surface-3)',
                  color: step >= s ? 'white' : 'var(--text-4)',
                  border: `1px solid ${step > s ? '#10B981' : step === s ? 'var(--brand)' : 'var(--border)'}`,
                }}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className="flex-1 h-0.5 w-8" style={{ background: step > s ? '#10B981' : 'var(--border)' }}/>}
            </div>
          ))}
          <span className="text-xs ml-2" style={{ color: 'var(--text-4)' }}>
            {step === 1 ? 'Enter email' : step === 2 ? 'Verify code' : step === 3 ? 'New password' : 'Done'}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-5"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Step 1 — Email */}
        {step === 1 && (
          <>
            <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-1)' }}>Forgot password?</h1>
            <p className="mb-8" style={{ color: 'var(--text-3)' }}>Enter your email and we'll send you a reset code.</p>
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input type="email" className="input" placeholder="you@organisation.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full gap-2">
                {isLoading ? <span className="dot-loader"><span/><span/><span/></span>
                  : <><Mail size={16}/> Send reset code</>}
              </button>
            </form>
          </>
        )}

        {/* Step 2 — OTP */}
        {step === 2 && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(26,86,219,0.12)', border: '1px solid rgba(26,86,219,0.3)' }}>
              <Mail size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <h1 className="font-display font-bold text-2xl text-center mb-2" style={{ color: 'var(--text-1)' }}>Check your email</h1>
            <p className="text-sm text-center mb-8" style={{ color: 'var(--text-3)' }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
            </p>
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className="label">Reset code</label>
                <input className="input text-center text-2xl font-bold tracking-widest"
                  type="text" maxLength={6} placeholder="• • • • • •"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus style={{ letterSpacing: '0.3em' }} />
              </div>
              <button type="submit" disabled={isLoading || otp.length !== 6}
                className="btn-primary btn-lg w-full gap-2">
                {isLoading ? <span className="dot-loader"><span/><span/><span/></span>
                  : <><ArrowRight size={16}/> Verify code</>}
              </button>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }}
                className="text-sm w-full" style={{ color: 'var(--text-3)' }}>
                Didn't receive it? Go back
              </button>
            </form>
          </>
        )}

        {/* Step 3 — New password */}
        {step === 3 && (
          <>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-1)' }}>Set new password</h1>
            <p className="mb-8" style={{ color: 'var(--text-3)' }}>Choose a strong password for your account.</p>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input className="input pr-11" type={showPass ? 'text' : 'password'}
                    placeholder="Min. 8 chars, uppercase + number"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1"
                    style={{ color: 'var(--text-3)' }}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input className="input" type={showPass ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full gap-2">
                {isLoading ? <span className="dot-loader"><span/><span/><span/></span>
                  : <><Lock size={16}/> Reset password</>}
              </button>
            </form>
          </>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)' }}>
              <CheckCircle size={32} style={{ color: '#10B981' }} />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-1)' }}>Password reset!</h1>
            <p className="mb-8" style={{ color: 'var(--text-3)' }}>Your password has been updated. You can now sign in.</p>
            <button onClick={() => navigate('/login')} className="btn-primary btn-lg w-full gap-2">
              <ArrowRight size={16}/> Go to sign in
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-6 text-center">
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-3)' }}>
              <ArrowLeft size={14}/> Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
