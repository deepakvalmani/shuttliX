import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, ArrowRight, AlertCircle, CheckCircle, Bus } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const AdminRegisterPage = () => {
  const [form, setForm] = useState({
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationShortName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    timezone: 'Asia/Karachi',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/admin-register', {
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        organizationName: form.organizationName,
        organizationShortName: form.organizationShortName.toUpperCase(),
        contactEmail: form.contactEmail || form.email,
        contactPhone: form.contactPhone,
        address: form.address,
        timezone: form.timezone,
      });
      // Auto-login
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setSuccess({
        orgName: form.organizationName,
        adminName: form.adminName,
        email: form.email,
      });
      toast.success('Organisation created! Check your email for the org code.');
      setTimeout(() => navigate('/admin', { replace: true }), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--navy)' }}>
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)' }}>
            <CheckCircle size={40} style={{ color: '#10B981' }} />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#10B981' }}>
            Organisation created!
          </h1>
          <p className="mb-2" style={{ color: 'var(--text-2)' }}>
            Welcome to ShutliX, {success.adminName}
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
            Your organisation code has been sent to <strong>{success.email}</strong>.
            Share it with your drivers and members so they can join.
          </p>
          <div className="dot-loader justify-center mb-4"><span /><span /><span /></div>
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--navy)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12"
        style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Bus size={22} color="white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--brand)' }}>
            For organisations
          </div>
          <h2 className="font-display font-bold text-3xl leading-tight mb-6" style={{ color: 'var(--text-1)' }}>
            Set up your fleet in{' '}
            <span style={{ color: 'var(--brand)' }}>minutes.</span>
          </h2>
          <div className="space-y-4">
            {[
              { icon: '🏢', title: 'Any organisation', desc: 'Universities, corporations, hospitals, schools — any fleet' },
              { icon: '📱', title: 'QR onboarding', desc: 'Share a QR code — members join in seconds' },
              { icon: '🌍', title: 'Anywhere on Earth', desc: 'Create routes and stops at any location worldwide' },
              { icon: '🔒', title: 'Fully isolated', desc: 'Your data is completely separate from other organisations' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-4)' }}>© 2025 ShutliX</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-lg py-8 animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
              <Bus size={18} color="white" />
            </div>
            <span className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>ShutliX</span>
          </div>

          <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-1)' }}>
            Create your organisation
          </h1>
          <p className="mb-8" style={{ color: 'var(--text-3)' }}>
            Set up ShutliX for your fleet. Free to start.
          </p>

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-5 animate-slide-down"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organisation details */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-4)' }}>
                <Building2 size={12} className="inline mr-1" />
                Organisation details
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Organisation name *</label>
                  <input className="input" placeholder="e.g. IBA Karachi, Acme Corp, City Hospital"
                    value={form.organizationName} onChange={e => f('organizationName', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Short name *</label>
                    <input className="input uppercase" placeholder="e.g. IBA, ACME"
                      maxLength={10} value={form.organizationShortName}
                      onChange={e => f('organizationShortName', e.target.value.toUpperCase())} required />
                  </div>
                  <div>
                    <label className="label">Timezone</label>
                    <select className="input" value={form.timezone} onChange={e => f('timezone', e.target.value)}>
                      <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Dhaka">Asia/Dhaka (BST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" placeholder="Organisation address"
                    value={form.address} onChange={e => f('address', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact email</label>
                    <input className="input" type="email" placeholder="contact@org.com"
                      value={form.contactEmail} onChange={e => f('contactEmail', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Contact phone</label>
                    <input className="input" type="tel" placeholder="+92 300 0000000"
                      value={form.contactPhone} onChange={e => f('contactPhone', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Admin account */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-4)' }}>
                Your admin account
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Your full name *</label>
                  <input className="input" placeholder="Transport Manager / Admin name"
                    value={form.adminName} onChange={e => f('adminName', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Your email *</label>
                  <input className="input" type="email" placeholder="admin@organisation.com"
                    value={form.email} onChange={e => f('email', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input className="input pr-11" type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars, uppercase + number"
                      value={form.password} onChange={e => f('password', e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1"
                      style={{ color: 'var(--text-3)' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm password *</label>
                  <input className="input" type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)} required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full">
              {isLoading
                ? <span className="dot-loader"><span /><span /><span /></span>
                : <>Create organisation <ArrowRight size={18} /></>}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
              By creating an account you agree to our terms. Your org code will be emailed to you.
            </p>
          </form>

          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                Sign in
              </Link>
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
              Joining an existing organisation?{' '}
              <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                Register as member
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegisterPage;
