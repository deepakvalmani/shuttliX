// frontend/src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Bell, MapPin, Lock, LogOut,
  Save, Eye, EyeOff, Star, CheckCircle, Trash2,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { requestNotificationPermission } from '../services/firebase';
import api from '../services/api';
import toast from 'react-hot-toast';

const SectionCard = ({ title, icon: Icon, iconColor = 'var(--brand)', children }) => (
  <div className="rounded-2xl overflow-hidden"
    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
    <div className="flex items-center gap-2.5 px-5 py-4"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <Icon size={17} style={{ color: iconColor }} />
      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const TogglePref = ({ label, description, value, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-3"
    style={{ borderBottom: '1px solid var(--border)' }}>
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
      {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className="flex-shrink-0 w-11 h-6 rounded-full relative transition-colors duration-200"
      style={{ background: value ? 'var(--brand)' : 'var(--surface-4)' }}>
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  </div>
);

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: user?.name || '' });
  const [prefs, setPrefs] = useState(user?.notificationPreferences || {
    shuttleArriving: true,
    shuttleFull: true,
    routeDelay: true,
    adminAnnouncements: true,
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [favoriteStops, setFavoriteStops] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    // Load stops and history
    Promise.all([
      api.get('/student/stops'),
      api.get('/student/history?limit=5'),
    ]).then(([stopsRes, histRes]) => {
      setAllStops(stopsRes.data.data || []);
      setRideHistory(histRes.data.data || []);
      // Mark favorites
      const favIds = user?.favoriteStops || [];
      setFavoriteStops(favIds);
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await api.patch('/auth/update-profile', {
        name: profile.name,
        notificationPreferences: prefs,
      });
      updateUser(res.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match'); return;
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setIsSavingPassword(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPasswords({ current: '', newPass: '', confirm: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setNotifPermission('granted');
      toast.success('Push notifications enabled!');
    } else {
      toast.error('Could not enable notifications. Check browser permissions.');
    }
  };

  const toggleFavoriteStop = async (stopId) => {
    const isCurrentlyFav = favoriteStops.includes(stopId);
    try {
      await api.patch('/student/favorite-stops', {
        stopId,
        action: isCurrentlyFav ? 'remove' : 'add',
      });
      setFavoriteStops(prev =>
        isCurrentlyFav ? prev.filter(id => id !== stopId) : [...prev, stopId]
      );
    } catch { toast.error('Failed to update favorites'); }
  };

  const SECTIONS = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'stops', label: 'Favorite Stops', icon: MapPin },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 flex items-center gap-4"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/student')} className="btn-ghost btn-icon">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
            Profile & Settings
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          className="btn-ghost btn-sm flex items-center gap-1.5" style={{ color: '#F87171' }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <div className="hidden sm:flex flex-col flex-shrink-0 py-4 gap-1"
          style={{ width: 200, background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className="flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: activeSection === key ? 'rgba(26,86,219,0.15)' : 'transparent',
                color: activeSection === key ? 'var(--brand)' : 'var(--text-3)',
                border: activeSection === key ? '1px solid rgba(26,86,219,0.3)' : '1px solid transparent',
              }}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-10 flex"
          style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs"
              style={{ color: activeSection === key ? 'var(--brand)' : 'var(--text-4)' }}>
              <Icon size={17} />{label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 sm:pb-5 space-y-5 max-w-2xl">

          {/* PROFILE */}
          {activeSection === 'profile' && (
            <>
              {/* Avatar */}
              <div className="flex items-center gap-4 p-5 rounded-2xl"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                  style={{ background: 'var(--brand)', color: '#fff' }}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
                    {user?.name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-blue text-xs capitalize">{user?.role}</span>
                    {user?.studentId && (
                      <span className="text-xs" style={{ color: 'var(--text-4)' }}>
                        ID: {user.studentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <SectionCard title="Personal Info" icon={User}>
                <div className="space-y-4">
                  <div>
                    <label className="label">Full name</label>
                    <input className="input" value={profile.name}
                      onChange={e => setProfile(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Email address</label>
                    <input className="input" value={user?.email} disabled
                      style={{ opacity: 0.6 }} />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                      Email cannot be changed
                    </p>
                  </div>
                  {user?.studentId && (
                    <div>
                      <label className="label">Student ID</label>
                      <input className="input" value={user.studentId} disabled style={{ opacity: 0.6 }} />
                    </div>
                  )}
                  <button onClick={handleSaveProfile} disabled={isSavingProfile}
                    className="btn-primary w-full gap-2">
                    {isSavingProfile
                      ? <span className="dot-loader"><span /><span /><span /></span>
                      : <><Save size={15} /> Save changes</>}
                  </button>
                </div>
              </SectionCard>

              {/* Ride stats */}
              <SectionCard title="Recent Rides" icon={Star} iconColor="#D97706">
                {rideHistory.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>
                    No ride history yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rideHistory.map(trip => (
                      <div key={trip._id} className="flex items-center gap-3 py-2"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--surface-3)' }}>
                          <Star size={14} style={{ color: '#D97706' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {trip.routeId?.name || 'Unknown Route'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {new Date(trip.startTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <SectionCard title="Push Notifications" icon={Bell}>
              {/* Permission status */}
              <div className="mb-5 p-4 rounded-xl"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      Browser notifications
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {notifPermission === 'granted' ? 'Enabled — you\'ll receive alerts'
                        : notifPermission === 'denied' ? 'Blocked — enable in browser settings'
                        : 'Not yet enabled'}
                    </p>
                  </div>
                  {notifPermission === 'granted' ? (
                    <CheckCircle size={20} style={{ color: '#10B981' }} />
                  ) : notifPermission !== 'denied' ? (
                    <button onClick={handleEnableNotifications} className="btn-primary btn-sm">
                      Enable
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: '#F87171' }}>Blocked</span>
                  )}
                </div>
              </div>

              {/* Preferences */}
              <div>
                {[
                  { key: 'shuttleArriving', label: 'Shuttle arriving soon', description: 'Alert when your shuttle is 5 minutes away' },
                  { key: 'shuttleFull', label: 'Shuttle is full', description: 'Alert when a shuttle reaches capacity' },
                  { key: 'routeDelay', label: 'Route delays', description: 'Notify when a driver reports a delay' },
                  { key: 'adminAnnouncements', label: 'Admin announcements', description: 'Campus-wide transport announcements' },
                ].map(({ key, label, description }) => (
                  <TogglePref key={key} label={label} description={description}
                    value={prefs[key] ?? true}
                    onChange={val => setPrefs(p => ({ ...p, [key]: val }))} />
                ))}
              </div>

              <button onClick={handleSaveProfile} disabled={isSavingProfile}
                className="btn-primary w-full mt-5 gap-2">
                {isSavingProfile
                  ? <span className="dot-loader"><span /><span /><span /></span>
                  : <><Save size={15} /> Save preferences</>}
              </button>
            </SectionCard>
          )}

          {/* FAVORITE STOPS */}
          {activeSection === 'stops' && (
            <SectionCard title="Favorite Stops" icon={MapPin} iconColor="#D97706">
              <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                Star the stops you use most — they'll appear first in the stops tab
              </p>
              {allStops.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-4)' }}>
                  No stops found
                </p>
              ) : (
                <div className="space-y-1.5">
                  {allStops.map(stop => {
                    const isFav = favoriteStops.includes(stop._id);
                    return (
                      <div key={stop._id}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl"
                        style={{ background: isFav ? 'rgba(217,119,6,0.08)' : 'var(--surface-3)', border: `1px solid ${isFav ? 'rgba(217,119,6,0.3)' : 'var(--border)'}` }}>
                        <MapPin size={15} style={{ color: isFav ? '#D97706' : 'var(--text-4)' }} className="flex-shrink-0" />
                        <span className="flex-1 text-sm" style={{ color: 'var(--text-1)' }}>{stop.name}</span>
                        <button onClick={() => toggleFavoriteStop(stop._id)}
                          className="btn-ghost btn-icon p-1.5">
                          <Star size={16}
                            style={{
                              fill: isFav ? '#D97706' : 'transparent',
                              color: isFav ? '#D97706' : 'var(--text-4)',
                            }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {/* SECURITY */}
          {activeSection === 'security' && (
            <SectionCard title="Change Password" icon={Lock}>
              <div className="space-y-4">
                {[
                  { key: 'current', label: 'Current password', placeholder: 'Enter current password' },
                  { key: 'newPass', label: 'New password', placeholder: 'Min. 8 characters' },
                  { key: 'confirm', label: 'Confirm new password', placeholder: 'Repeat new password' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder={placeholder}
                        value={passwords[key]}
                        onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                        autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                      />
                    </div>
                  </div>
                ))}

                <label className="flex items-center gap-2 cursor-pointer text-sm"
                  style={{ color: 'var(--text-3)' }}>
                  <input type="checkbox" checked={showPasswords}
                    onChange={e => setShowPasswords(e.target.checked)}
                    className="w-4 h-4 rounded" />
                  Show passwords
                </label>

                <button onClick={handleSavePassword} disabled={isSavingPassword}
                  className="btn-primary w-full gap-2">
                  {isSavingPassword
                    ? <span className="dot-loader"><span /><span /><span /></span>
                    : <><Lock size={15} /> Update password</>}
                </button>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;