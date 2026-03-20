import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus, Users, Map, BarChart2, LogOut, Plus, Edit2, Layers,
  Navigation, TrendingUp, AlertTriangle, Radio, RefreshCw,
  MapPin, X, Send, Activity, Wrench, Route, CheckCircle,
  XCircle, QrCode, Building2, Copy, Eye, EyeOff,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useSocket from '../hooks/useSocket';
import ThemeToggle from '../components/ThemeToggle';
import useLeafletMap from '../hooks/useLeafletMap';
import CapacityBadge from '../components/ui/CapacityBadge';
import ShuttleFormModal from '../components/ShuttleFormModal';
import MaintenanceModal from '../components/MaintenanceModal';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── HELPERS ─────────────────────────────────────────────
const StatTile = ({ icon: Icon, label, value, sub, color = 'var(--brand)' }) => (
  <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
      style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div className="font-display font-bold text-3xl mb-0.5" style={{ color: 'var(--text-1)' }}>{value ?? '—'}</div>
    <div className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</div>
    {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{sub}</div>}
  </div>
);

const BarChart = ({ data, color = '#1A56DB' }) => {
  if (!data?.length) return <div className="flex items-center justify-center h-28 text-sm" style={{ color: 'var(--text-4)' }}>No data yet</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div className="w-full rounded-t-sm" style={{ height: `${(d.count/max*100).toFixed(0)}%`, background: color, opacity: 0.85, minHeight: 4 }} />
          <span style={{ color: 'var(--text-4)', fontSize: 9 }}>{d.date?.slice(5) || d.name?.slice(0,5)}</span>
        </div>
      ))}
    </div>
  );
};

const BroadcastModal = ({ onSend, onClose }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>Broadcast Message</h3>
        <div className="flex gap-2 mb-4">
          {[['info','Info','#60A5FA'],['warning','Warning','#FBBF24'],['danger','Alert','#F87171'],['success','Good news','#34D399']].map(([v,l,c]) => (
            <button key={v} onClick={() => setType(v)} className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: type===v?`${c}22`:'var(--surface-3)', border: `1px solid ${type===v?c:'var(--border)'}`, color: type===v?c:'var(--text-3)' }}>{l}</button>
          ))}
        </div>
        <textarea className="input resize-none mb-5" rows={3} placeholder="Write your announcement..." value={message} onChange={e => setMessage(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => message.trim() && onSend(message, type)} disabled={!message.trim()} className="btn-primary flex-1 gap-2"><Send size={15} /> Broadcast</button>
        </div>
      </div>
    </div>
  );
};

// ─── DRIVER ASSIGNMENT MODAL ─────────────────────────────
const AssignModal = ({ driver, routes, shuttles, onSave, onClose }) => {
  const [routeId, setRouteId] = useState(driver.assignedRouteId?._id || driver.assignedRouteId || '');
  const [shuttleId, setShuttleId] = useState(driver.assignedShuttleId?._id || driver.assignedShuttleId || '');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/drivers/${driver.id}/assign`, { routeId: routeId||null, shuttleId: shuttleId||null });
      toast.success('Driver assigned');
      onSave();
      onClose();
    } catch { toast.error('Assignment failed'); setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>Assign Driver</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--brand)', color: 'white' }}>
            {driver.name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{driver.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{driver.email}</p>
          </div>
        </div>
        <div className="space-y-4 mb-5">
          <div>
            <label className="label">Assign to Route</label>
            <select className="input" value={routeId} onChange={e => setRouteId(e.target.value)}>
              <option value="">No route assigned</option>
              {routes.map(r => <option key={r._id} value={r._id}>{r.name} ({r.shortCode})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assign Shuttle</label>
            <select className="input" value={shuttleId} onChange={e => setShuttleId(e.target.value)}>
              <option value="">No shuttle assigned</option>
              {shuttles.filter(s => s.status !== 'retired').map(s => (
                <option key={s._id} value={s._id}>{s.name} · {s.plateNumber}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <span className="dot-loader"><span/><span/><span/></span> : 'Save Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ORG QR PANEL ────────────────────────────────────────
const OrgPanel = ({ org, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code?size=200x200&data=${encodeURIComponent(org.qrUrl || '')}&color=F9FAFB&bgcolor=132C47&margin=2`;
  const copyCode = () => {
    navigator.clipboard.writeText(org.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,86,219,0.15)', border: '1px solid rgba(26,86,219,0.3)' }}>
            <Building2 size={20} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>{org.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{org.shortName} · {org.plan?.toUpperCase()} plan</p>
          </div>
        </div>
        {org.address && <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>📍 {org.address}</p>}
        {org.contactEmail && <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>✉️ {org.contactEmail}</p>}
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-4)' }}>
          Organisation Code & QR
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
          Share this code or QR with your drivers and members so they can join your organisation when registering.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)' }}>
            <span className="font-mono font-bold text-2xl tracking-widest" style={{ color: 'var(--brand)' }}>
              {org.code}
            </span>
            <button onClick={copyCode} className="btn-ghost btn-icon" title="Copy code">
              {copied ? <CheckCircle size={16} style={{ color: '#10B981' }} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        {org.qrUrl && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl p-3" style={{ background: '#132C47', border: '1px solid var(--border-md)' }}>
              <img src={qrUrl} alt="Org QR Code" width={160} height={160} style={{ display: 'block', borderRadius: 8 }} />
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
              Students scan this QR → org pre-filled on registration
            </p>
            <button onClick={onRegenerate} className="btn-secondary btn-sm w-full">
              🔄 Regenerate Code & QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN ADMIN PAGE ─────────────────────────────────────
// ShutliX Admin Dashboard
const AdminPage = () => {
  const { user, logout } = useAuthStore();
  const { liveShuttles, routes, stops, fetchRoutes, fetchStops, getLiveShuttlesArray } = useShuttleStore();
  const { emitAdminBroadcast, joinOrganization } = useSocket();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [shuttleList, setShuttleList] = useState([]);
  const [org, setOrg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [shuttleModal, setShuttleModal] = useState(null);
  const [maintenanceModal, setMaintenanceModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  const { panToLocation, fitAllShuttles } = useLeafletMap({
    mapRef: activeTab === 'map' ? mapRef : { current: null },
    center: { lat: 24.9056, lng: 67.0822 },
    zoom: 14,
    liveShuttles: activeTab === 'map' ? liveShuttles : {},
    stops: activeTab === 'map' ? stops : [],
    routes: activeTab === 'map' ? routes : [],
    onShuttleClick: () => {},
    onStopClick: () => {},
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashRes, driversRes, analyticsRes, shuttlesRes, orgRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/drivers'),
        api.get('/admin/analytics?days=7'),
        api.get('/admin/shuttles'),
        api.get('/admin/organisation'),
      ]);
      setDashboard(dashRes.data.data);
      setDrivers(driversRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
      setShuttleList(shuttlesRes.data.data || []);
      setOrg(orgRes.data.data);
      setLastRefresh(new Date());
    } catch { toast.error('Failed to load dashboard'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    fetchRoutes();
    fetchStops();
    load();
    // Join org socket room so live map receives real-time shuttle updates
    joinOrganization();
  }, []);

  const handleBroadcast = async (message, type) => {
    try {
      await api.post('/admin/broadcast', { message, type });
      emitAdminBroadcast(user.organizationId, message, type);
      setShowBroadcast(false);
      toast.success('Broadcast sent');
    } catch { toast.error('Broadcast failed'); }
  };

  const handleRegenOrgCode = async () => {
    if (!confirm('Regenerate org code? The old code will stop working immediately.')) return;
    try {
      await api.post('/auth/regenerate-org-code');
      load();
      toast.success('New code generated — check your email');
    } catch { toast.error('Failed'); }
  };

  const handleShuttleSaved = (saved) => {
    setShuttleList(prev => {
      const exists = prev.find(s => s._id === saved._id);
      return exists ? prev.map(s => s._id === saved._id ? saved : s) : [...prev, saved];
    });
    setShuttleModal(null);
  };

  const liveArr = getLiveShuttlesArray();

  const TABS = [
    { key: 'overview', icon: Activity, label: 'Overview' },
    { key: 'fleet', icon: Bus, label: 'Fleet' },
    { key: 'routes', icon: Route, label: 'Routes' },
    { key: 'stops', icon: MapPin, label: 'Stops' },
    { key: 'drivers', icon: Users, label: 'Drivers' },
    { key: 'analytics', icon: BarChart2, label: 'Analytics' },
    { key: 'map', icon: Map, label: 'Live Map' },
    { key: 'org', icon: Building2, label: 'Organisation' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Layers size={18} color="white" />
          </div>
          <div>
            <p className="font-display font-bold text-base leading-none" style={{ color: 'var(--text-1)' }}>
              {org?.shortName || 'ShutliX'} Dashboard
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && <span className="text-xs hidden sm:block" style={{ color: 'var(--text-4)' }}>{lastRefresh.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
          <button onClick={load} className="btn-ghost btn-icon"><RefreshCw size={15} /></button>
          <button onClick={() => setShowBroadcast(true)} className="btn-secondary text-sm flex items-center gap-2 py-2 px-3">
            <Radio size={14} /> Broadcast
          </button>
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost btn-icon"><LogOut size={15} /></button>
        </div>
      </div>

      {liveArr.length > 0 && (
        <div className="flex-shrink-0 px-6 py-2 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(26,86,219,0.08)', borderBottom: '1px solid rgba(26,86,219,0.2)' }}>
          <span className="status-dot-green" />
          <span style={{ color: 'var(--brand)' }}><strong>{liveArr.length}</strong> live right now</span>
          <button onClick={() => { setActiveTab('map'); setTimeout(fitAllShuttles, 200); }}
            className="ml-auto text-xs btn-ghost py-1 px-2">View on map →</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col flex-shrink-0 py-4" style={{ width: 200, background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex items-center gap-3 mx-3 mb-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab===key?'rgba(26,86,219,0.15)':'transparent',
                color: activeTab===key?'var(--brand)':'var(--text-3)',
                border: activeTab===key?'1px solid rgba(26,86,219,0.3)':'1px solid transparent',
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex overflow-x-auto"
          style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-shrink-0 flex flex-col items-center gap-0.5 py-2.5 px-3 text-xs"
              style={{ color: activeTab===key?'var(--brand)':'var(--text-4)' }}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0" style={{ height: activeTab === 'stops' ? '100%' : 'auto' }}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {isLoading ? <div className="flex justify-center py-12"><div className="dot-loader"><span/><span/><span/></div></div> : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={Bus} label="Live Vehicles" value={liveArr.length} color="#1A56DB" sub="Right now" />
                    <StatTile icon={Users} label="Members" value={dashboard?.totalStudents} color="#10B981" sub="Registered" />
                    <StatTile icon={Activity} label="Trips Today" value={dashboard?.tripsToday} color="#D97706" />
                    <StatTile icon={Route} label="Active Routes" value={dashboard?.totalRoutes ?? routes.length} color="#8B5CF6" />
                  </div>
                  {liveArr.length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-base mb-3" style={{ color: 'var(--text-1)' }}>Live Fleet</h3>
                      <div className="space-y-2">
                        {liveArr.map(s => {
                          const route = routes.find(r => r._id === s.routeId);
                          return (
                            <div key={s.shuttleId} className="flex items-center gap-3 py-3 px-4 rounded-xl"
                              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: `${route?.color||'#1A56DB'}18` }}>
                                <span className="text-xs font-bold" style={{ color: route?.color||'var(--brand)' }}>
                                  {route?.shortCode||'?'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{route?.name||'Unknown route'}</p>
                                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.passengerCount||0} pax · {s.speed?Math.round(s.speed)+' km/h':'Stopped'}</p>
                              </div>
                              <div className="w-28"><CapacityBadge current={s.passengerCount||0} total={s.capacity||30} size="sm" /></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {analytics && (
                    <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-2)' }}>Ridership (7 days)</h3>
                      <BarChart data={analytics.ridership} color="#1A56DB" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* FLEET */}
          {activeTab === 'fleet' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>Fleet</h2>
                <button onClick={() => setShuttleModal('new')} className="btn-primary btn-sm gap-1.5"><Plus size={14} /> Add Vehicle</button>
              </div>
              {shuttleList.map(shuttle => {
                const live = liveShuttles[shuttle._id];
                return (
                  <div key={shuttle._id} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: live?'rgba(16,185,129,0.12)':'var(--surface-3)', border: `1px solid ${live?'rgba(16,185,129,0.3)':'var(--border)'}` }}>
                          {shuttle.shortCode ? (
                            <span className="text-sm font-bold" style={{ color: live?'#10B981':'var(--text-4)' }}>{shuttle.shortCode}</span>
                          ) : (
                            <Bus size={18} style={{ color: live?'#10B981':'var(--text-4)' }} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{shuttle.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{shuttle.plateNumber} · Cap: {shuttle.capacity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {live?<span className="badge-green text-xs">Live</span>:
                          shuttle.status==='maintenance'?<span className="badge-yellow text-xs">Maint.</span>:
                          shuttle.status==='retired'?<span className="badge-red text-xs">Retired</span>:
                          <span className="badge-gray text-xs">Idle</span>}
                        <button onClick={() => setShuttleModal(shuttle)} className="btn-ghost btn-icon"><Edit2 size={14} /></button>
                        <button onClick={() => setMaintenanceModal(shuttle)} className="btn-ghost btn-icon"><Wrench size={14} style={{ color:'#D97706' }} /></button>
                      </div>
                    </div>
                    {live && <CapacityBadge current={live.passengerCount||0} total={shuttle.capacity} size="sm" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ROUTES */}
          {activeTab === 'routes' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>Routes</h2>
                <button onClick={() => navigate('/admin/routes/new')} className="btn-primary btn-sm gap-1.5"><Plus size={14} /> New Route</button>
              </div>
              {routes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Route size={32} style={{ color: 'var(--text-4)' }} />
                  <p style={{ color: 'var(--text-3)' }}>No routes yet. Create your first route.</p>
                  <button onClick={() => navigate('/admin/routes/new')} className="btn-primary">Create Route</button>
                </div>
              ) : routes.map(route => (
                <div key={route._id} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-10 rounded-full" style={{ background: route.color||'var(--brand)' }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{route.name}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: `${route.color||'#1A56DB'}22`, color: route.color||'var(--brand)' }}>
                            {route.shortCode}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{route.stops?.length||0} stops</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={route.isActive?'badge-green text-xs':'badge-gray text-xs'}>
                        {route.isActive?'Active':'Inactive'}
                      </span>
                      <button onClick={() => navigate(`/admin/routes/${route._id}/edit`)} className="btn-ghost btn-icon"><Edit2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STOPS — navigates to dedicated stop manager page */}
          {activeTab === 'stops' && (
            <div className="p-6 flex flex-col items-center justify-center gap-5 py-20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.3)' }}>
                <MapPin size={32} style={{ color: '#D97706' }} />
              </div>
              <div className="text-center">
                <h3 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-1)' }}>
                  Stop Manager
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Search any location on Earth, then click the map to place bus stops.
                  Stops can be placed at any location worldwide.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm" style={{ color: 'var(--text-3)' }}>
                <div className="flex items-center gap-2"><span>🔍</span> Search any place on Earth</div>
                <div className="flex items-center gap-2"><span>📍</span> Click map to place stops</div>
                <div className="flex items-center gap-2"><span>✏️</span> Click markers to edit</div>
                <div className="flex items-center gap-2"><span>🗑️</span> Delete stops anytime</div>
              </div>
              <button onClick={() => navigate('/admin/stops')} className="btn-primary btn-lg gap-2">
                <MapPin size={18} /> Open Stop Manager
              </button>
              <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                {stops.length} stops currently configured
              </p>
            </div>
          )}

          {/* DRIVERS */}
          {activeTab === 'drivers' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>Drivers</h2>
                <span className="text-sm" style={{ color: 'var(--text-3)' }}>{drivers.filter(d=>d.isOnDuty).length} on duty</span>
              </div>
              {drivers.map(driver => (
                <div key={driver.id} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: 'var(--surface-4)', color: 'var(--brand)' }}>
                      {driver.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{driver.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{driver.email}</p>
                      {(driver.assignedRouteId || driver.assignedShuttleId) && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--brand)' }}>
                          {driver.assignedRouteId?.name && `Route: ${driver.assignedRouteId.name}`}
                          {driver.assignedShuttleId?.name && ` · ${driver.assignedShuttleId.name}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={driver.isOnDuty?'badge-green text-xs':'badge-gray text-xs'}>
                        {driver.isOnDuty?'On Duty':'Off Duty'}
                      </span>
                      <button onClick={() => setAssignModal(driver)} className="btn-secondary btn-sm">
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6">
              <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>Analytics</h2>
              {!analytics ? <div className="flex justify-center py-12"><div className="dot-loader"><span/><span/><span/></div></div> : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={TrendingUp} label="Total Trips" value={analytics.totalTrips} color="#1A56DB" sub="Last 7 days" />
                    <StatTile icon={Activity} label="Avg Rating" value={analytics.avgRating?`${analytics.avgRating}★`:'N/A'} color="#D97706" sub={`${analytics.totalRatings} reviews`} />
                    <StatTile icon={Route} label="Routes" value={routes.length} color="#10B981" />
                    <StatTile icon={Bus} label="Fleet" value={shuttleList.length} color="#8B5CF6" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>Daily ridership</h3>
                      <BarChart data={analytics.ridership} color="#1A56DB" />
                    </div>
                    <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>Trips by route</h3>
                      <BarChart data={analytics.tripsByRoute} color="#D97706" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* LIVE MAP */}
          {activeTab === 'map' && (
            <div className="relative" style={{ height: 'calc(100vh - 130px)' }}>
              <div ref={mapRef} className="w-full h-full" />
              <div className="absolute top-4 left-4 z-10">
                <div className="glass rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Live Fleet</p>
                  {liveArr.length===0 ? <p className="text-xs" style={{ color:'var(--text-4)' }}>No active vehicles</p>
                    : liveArr.map(s => (
                      <div key={s.shuttleId} className="flex items-center gap-2 text-xs" style={{ color:'var(--text-3)' }}>
                        <span className="status-dot-green" />
                        <span className="font-bold" style={{ color: routes.find(r=>r._id===s.routeId)?.color||'var(--brand)' }}>
                          {routes.find(r=>r._id===s.routeId)?.shortCode||'?'}
                        </span>
                        <span>·</span>
                        <span>{s.passengerCount||0} pax</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <button onClick={fitAllShuttles} className="glass btn btn-sm gap-2">
                  <Navigation size={13} /> Fit all
                </button>
              </div>
            </div>
          )}

          {/* ORGANISATION */}
          {activeTab === 'org' && (
            <div className="p-6 max-w-xl">
              <h2 className="font-display font-bold text-xl mb-5" style={{ color: 'var(--text-1)' }}>Organisation</h2>
              {org ? <OrgPanel org={org} onRegenerate={handleRegenOrgCode} /> : (
                <div className="flex justify-center py-12"><div className="dot-loader"><span/><span/><span/></div></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showBroadcast && <BroadcastModal onSend={handleBroadcast} onClose={() => setShowBroadcast(false)} />}
      {shuttleModal !== null && (
        <ShuttleFormModal
          shuttle={shuttleModal==='new'?null:shuttleModal}
          drivers={drivers}
          routes={routes}
          onSave={handleShuttleSaved}
          onClose={() => setShuttleModal(null)}
        />
      )}
      {maintenanceModal && <MaintenanceModal shuttle={maintenanceModal} onClose={() => setMaintenanceModal(null)} onSaved={load} />}
      {assignModal && (
        <AssignModal
          driver={assignModal}
          routes={routes}
          shuttles={shuttleList}
          onSave={load}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;
