import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, Building2, CheckCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BusLogo } from '../components/ui/index';
import ThemeToggle from '../components/ui/ThemeToggle';
import toast from 'react-hot-toast';

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [form, setForm] = useState({
    adminName: '', email: '', password: '', confirmPassword: '',
    organizationName: '', organizationShortName: '',
    contactPhone: '', address: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('Password must be 8+ chars with uppercase, lowercase and a number'); return;
    }
    setError(''); setLoading(true);
    try {
      const { default: api } = await import('../services/api');
      const { data } = await api.post('/auth/admin-register', {
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        organizationName: form.organizationName,
        organizationShortName: form.organizationShortName || form.organizationName.slice(0,10),
        contactPhone: form.contactPhone,
        address: form.address,
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const { default: useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().updateUser(data.user);
      toast.success(`Organisation created! Check your email for the org code 🎉`);
      navigate('/admin', { replace: true });
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const fields = [
    { k: 'adminName',            label: 'Your full name *',          ph: 'e.g. John Ahmed',        type: 'text' },
    { k: 'email',                label: 'Email address *',           ph: 'admin@organisation.com', type: 'email' },
    { k: 'organizationName',     label: 'Organisation name *',       ph: 'e.g. University of Karachi', type: 'text' },
    { k: 'organizationShortName',label: 'Short name (abbreviation)', ph: 'e.g. UoK', type: 'text' },
    { k: 'contactPhone',         label: 'Contact phone',             ph: '+92 300 0000000', type: 'tel' },
    { k: 'address',              label: 'Address',                   ph: 'University Road, Karachi', type: 'text' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left */}
      <div className="hidden lg:flex flex-col justify-between w-[380px] flex-shrink-0 p-12"
        style={{ background: 'var(--glass-1)', backdropFilter: 'blur(40px)', borderRight: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
            <BusLogo size={20}/>
          </div>
          <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
        </div>
        <div className="space-y-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
            <Building2 size={28} style={{ color: 'var(--brand-light)' }}/>
          </div>
          <h2 className="font-display font-bold text-3xl leading-tight" style={{ color: 'var(--text-1)' }}>
            Set up your <span className="text-gradient">organisation</span>
          </h2>
          <p style={{ color: 'var(--text-3)' }}>
            Create your ShutliX admin account and organisation in one step. You'll get a unique code to share with drivers and students.
          </p>
          <div className="space-y-2">
            {['Create org + admin in 1 step','Get unique org code instantly','Share code with your team','Start tracking immediately'].map(s => (
              <div key={s} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                <CheckCircle size={14} style={{ color: 'var(--brand-light)' }}/> {s}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-5)' }}>© 2025 ShutliX</p>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
                <BusLogo size={18}/>
              </div>
              <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
            </div>
            <div className="ml-auto"><ThemeToggle/></div>
          </div>

          <h1 className="font-display font-bold text-2xl mb-1.5" style={{ color: 'var(--text-1)' }}>Create organisation</h1>
          <p className="mb-7 text-sm" style={{ color: 'var(--text-3)' }}>Set up your fleet management account</p>

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              <AlertCircle size={15}/> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {fields.map(({ k, label, ph, type }) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={ph}
                  value={form[k]} onChange={e => f(k, e.target.value)}
                  required={label.includes('*')} />
              </div>
            ))}

            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input className="input pr-11" type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 chars, uppercase + number"
                  value={form.password} onChange={e => f('password', e.target.value)} required/>
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1">
                  {showPass ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm password *</label>
              <input className="input" type={showPass ? 'text' : 'password'}
                placeholder="Repeat password"
                value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)} required/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
              {loading
                ? <span className="loader"><span/><span/><span/></span>
                : <>Create Organisation <ArrowRight size={18}/></>}
            </button>
          </form>

          <div className="mt-6 pt-5 text-center space-y-2" style={{ borderTop: '1px solid var(--border-1)' }}>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand-light)' }}>Sign in</Link>
            </p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Student or driver?{' '}
              <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand-light)' }}>Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
