import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bus, MapPin, Clock, Navigation, Bell, BellOff,
  Star, ChevronRight, WifiOff, LogOut, List, Map,
  History, Locate, X, Route, UserCircle, Search,
  AlertTriangle, Calendar, Megaphone, Flag, Heart,
  TrendingUp, Zap, CheckCircle, ChevronDown, ChevronUp,
  BarChart2, MessageSquare, RefreshCw,
} from 'lucide-react';
import { estimateETA, haversineDistance, formatDistance } from '../services/maps';
import { searchPlaces, geocodeQuery } from '../services/nominatim';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useLeafletMap from '../hooks/useLeafletMap';
import { CapacityBadge } from '../components/ui/index';
import RatingModal from '../components/RatingModal';
import ThemeToggle from '../components/ui/ThemeToggle';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ── helpers ──────────────────────────────────────────────
const capColor = p => p >= 1 ? '#EF4444' : p >= 0.8 ? '#F97316' : p >= 0.5 ? '#F59E0B' : '#10B981';
const capLabel = p => p >= 1 ? 'Full' : p >= 0.8 ? 'Nearly full' : p >= 0.5 ? 'Filling up' : 'Available';

// ── SHUTTLE CARD ─────────────────────────────────────────
const ShuttleCard = ({ shuttle, route, isSelected, onClick, userLocation, isFav, onToggleFav }) => {
  const pct = (shuttle.passengerCount || 0) / (shuttle.capacity || 30);
  const eta = userLocation ? estimateETA(shuttle.lat, shuttle.lng, userLocation.lat, userLocation.lng) : null;
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3.5 transition-all group"
      style={{
        background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
        borderBottom: '1px solid var(--border-1)',
        borderLeft: `3px solid ${isSelected ? 'var(--brand)' : 'transparent'}`,
      }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${route?.color || '#1A56DB'}18`, border: `1px solid ${route?.color || '#1A56DB'}33` }}>
          {route?.shortCode
            ? <span className="text-xs font-bold" style={{ color: route.color || '#1A56DB' }}>{route.shortCode}</span>
            : <Bus size={16} style={{ color: route?.color || 'var(--brand)' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{route?.name || 'Live Shuttle'}</p>
            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${capColor(pct)}20`, color: capColor(pct), fontSize: 9 }}>
              {capLabel(pct)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 rounded-full flex-1" style={{ background: 'var(--glass-1)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct * 100, 100)}%`, background: capColor(pct) }} />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
              {shuttle.passengerCount || 0}/{shuttle.capacity || 30}
            </span>
          </div>
          {shuttle.speed > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{Math.round(shuttle.speed)} km/h</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {eta !== null && (
            <div className="text-right">
              <span className="font-bold text-lg leading-none" style={{ color: 'var(--brand)' }}>{eta}</span>
              <p className="text-xs" style={{ color: 'var(--text-4)' }}>min</p>
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); onToggleFav(shuttle.shuttleId); }}
            className="btn-ghost btn-icon p-0.5" style={{ color: isFav ? '#EF4444' : 'var(--text-4)' }}>
            <Heart size={13} style={{ fill: isFav ? '#EF4444' : 'none' }} />
          </button>
        </div>
      </div>
    </button>
  );
};

// ── SCHEDULE CARD ─────────────────────────────────────────
const ScheduleCard = ({ route }) => {
  const [open, setOpen] = useState(false);
  const sched = route.schedule?.[0];
  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3">
        <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ background: route.color || 'var(--brand)' }} />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{route.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {sched ? `Every ${sched.frequency} min · ${sched.startTime}–${sched.endTime}` : 'No schedule set'}
          </p>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-4)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-4)' }} />}
      </button>
      {open && sched && (
        <div className="mt-3 ml-6 space-y-2 animate-slide-down">
          <div className="flex flex-wrap gap-1">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <span key={d} className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: sched.days?.includes(d) ? `${route.color || '#1A56DB'}22` : 'var(--glass-1)',
                  color: sched.days?.includes(d) ? (route.color || 'var(--brand)') : 'var(--text-4)',
                  border: `1px solid ${sched.days?.includes(d) ? (route.color || 'var(--brand)') + '55' : 'transparent'}`,
                }}>{d}</span>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {route.stops?.length || 0} stops · {route.isCircular ? 'Circular route' : 'One-way'}
            {route.totalDistanceKm ? ` · ${route.totalDistanceKm} km` : ''}
          </p>
        </div>
      )}
    </div>
  );
};

// ── HISTORY ITEM ─────────────────────────────────────────
const HistoryItem = ({ trip, onRate }) => (
  <div style={{ borderBottom: '1px solid var(--border-1)' }}>
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${trip.routeId?.color || 'var(--brand)'}18`, border: '1px solid var(--border-1)' }}>
        <Bus size={15} style={{ color: trip.routeId?.color || 'var(--brand)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
          {trip.routeId?.name || 'Shuttle Ride'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          {new Date(trip.startTime).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
          {trip.driverId?.name ? ` · ${trip.driverId.name}` : ''}
        </p>
      </div>
      {trip.rating ? (
        <div className="flex gap-0.5 flex-shrink-0">
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={11} style={{ fill: s <= trip.rating ? '#D97706' : 'none', color: '#D97706' }} />
          ))}
        </div>
      ) : (
        <button onClick={() => onRate(trip)}
          className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 transition-all"
          style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--brand)', border: '1px solid rgba(37,99,235,0.25)' }}>
          Rate
        </button>
      )}
    </div>
  </div>
);

// ── STATS CARD ───────────────────────────────────────────
const StatsCard = ({ history }) => {
  const total = history.length;
  const rated = history.filter(t => t.rating);
  const avgRating = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : '—';
  const routeCounts = {};
  history.forEach(t => { const n = t.routeId?.name || 'Unknown'; routeCounts[n] = (routeCounts[n] || 0) + 1; });
  const topRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.split(' ')[0] || '—';
  return (
    <div className="glass-md mx-3 my-3 rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>My Stats</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total rides', value: total, icon: Bus, color: 'var(--brand)' },
          { label: 'Avg rating', value: avgRating, icon: Star, color: '#D97706' },
          { label: 'Top route', value: topRoute, icon: Route, color: '#10B981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-2.5 text-center"
            style={{ background: 'var(--glass-2)', border: '1px solid var(--border-1)' }}>
            <Icon size={14} className="mx-auto mb-1" style={{ color }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{value}</p>
            <p className="text-xs leading-tight" style={{ color: 'var(--text-4)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── REPORT MODAL ─────────────────────────────────────────
const ReportModal = ({ onClose, onSubmit }) => {
  const [type, setType] = useState('late');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const TYPES = [
    { key: 'late', label: '⏱ Shuttle late' },
    { key: 'full', label: '🚫 Shuttle full' },
    { key: 'driver', label: '🧑 Driver issue' },
    { key: 'stop', label: '📍 Stop problem' },
    { key: 'other', label: '💬 Other' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-heavy w-full max-w-sm rounded-2xl p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>Report an Issue</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16}/></button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: type === t.key ? 'rgba(239,68,68,0.15)' : 'var(--glass-2)',
                border: `1px solid ${type === t.key ? '#EF4444' : 'var(--border-1)'}`,
                color: type === t.key ? '#EF4444' : 'var(--text-3)',
              }}>{t.label}</button>
          ))}
        </div>
        <textarea className="input resize-none mb-4" rows={3} value={note}
          onChange={e => setNote(e.target.value)} placeholder="Describe the issue (optional)" />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={async () => { setSending(true); await onSubmit(type, note); setSending(false); }}
            disabled={sending} className="btn-primary flex-1 gap-1">
            {sending ? <span className="loader"><span/><span/><span/></span> : <><Flag size={14}/> Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// ── MAIN STUDENT PAGE ────────────────────────────────
// ═══════════════════════════════════════════════════════
const StudentPage = () => {
  const { user, logout } = useAuthStore();
  const { liveShuttles, routes, stops, fetchRoutes, fetchStops,
    selectedShuttle, selectShuttle, getLiveShuttlesArray } = useShuttleStore();

  const mapRef = useRef(null);
  const navigate = useNavigate();
  const nominatimTimerRef = useRef(null);
  const notifiedRef = useRef(new Set());

  const [activeTab, setActiveTab] = useState('home');
  const [userLocation, setUserLocation] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [showMap, setShowMap] = useState(true);
  const [mapHeight, setMapHeight] = useState('50vh'); // Mobile: 50%, 70%, or 100%
  const [ratingTrip, setRatingTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [favShuttles, setFavShuttles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fav-shuttles') || '[]'); } catch { return []; }
  });
  const [nearestStop, setNearestStop] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem('notif-enabled') !== 'false'
  );
  const [showReport, setShowReport] = useState(false);

  const { panToShuttle, panToLocation, fitAllShuttles } = useLeafletMap({
    mapRef,
    center: { lat: 24.9056, lng: 67.0822 },
    zoom: 14,
    liveShuttles,
    stops,
    routes,
    onShuttleClick: shuttle => selectShuttle(shuttle),
    onStopClick: stop => panToLocation(stop.lat, stop.lng, 17),
  });

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Nearest stop
  useEffect(() => {
    if (!userLocation || !stops.length) return;
    let closest = null, minDist = Infinity;
    stops.forEach(stop => {
      if (!stop.lat || !stop.lng) return;
      const d = haversineDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng);
      if (d < minDist) { minDist = d; closest = stop; }
    });
    if (closest) setNearestStop({ stop: closest, distance: minDist });
  }, [userLocation, stops]);

  // Proximity alerts
  useEffect(() => {
    if (!notificationsEnabled || !userLocation) return;
    getLiveShuttlesArray().forEach(shuttle => {
      if (!shuttle.lat || !shuttle.lng) return;
      const dist = haversineDistance(userLocation.lat, userLocation.lng, shuttle.lat, shuttle.lng);
      const key = `${shuttle.shuttleId}-${Math.floor(Date.now() / 60000)}`;
      if (dist <= 0.5 && !notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        const route = routes.find(r => r._id === shuttle.routeId);
        toast(`🚌 ${route?.name || 'A shuttle'} is ${Math.round(dist * 1000)}m away!`, {
          icon: '🔔', duration: 6000,
        });
      }
    });
  }, [liveShuttles, userLocation, notificationsEnabled]);

  // Load data
  useEffect(() => { fetchRoutes(); fetchStops(); }, []);

  // Debug: log live shuttles changes
  useEffect(() => {
    console.log('[DEBUG] liveShuttles updated:', Object.keys(liveShuttles).length, 'shuttles');
    console.log('[DEBUG] liveShuttles data:', liveShuttles);
  }, [liveShuttles]);

  // Load history
  useEffect(() => {
    if (activeTab !== 'history' || rideHistory.length) return;
    setIsLoadingHistory(true);
    api.get('/student/history?limit=30')
      .then(r => setRideHistory(r.data.data || []))
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, [activeTab]);

  const toggleFavShuttle = useCallback(id => {
    setFavShuttles(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('fav-shuttles', JSON.stringify(next));
      return next;
    });
  }, []);

  const submitReport = useCallback(async (type, note) => {
    try {
      await api.post('/student/report', { type, note, shuttleId: selectedShuttle?.shuttleId });
      toast.success('Report submitted — admin notified');
    } catch { toast.error('Failed to submit report'); }
    setShowReport(false);
  }, [selectedShuttle]);

  // Search
  const handleSearch = useCallback(query => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
    const q = query.toLowerCase();
    const results = [];
    getLiveShuttlesArray().forEach(shuttle => {
      const route = routes.find(r => r._id === shuttle.routeId);
      if (route?.name?.toLowerCase().includes(q) || route?.shortCode?.toLowerCase().includes(q)) {
        results.push({
          type: 'shuttle', id: shuttle.shuttleId,
          label: route?.name || 'Live Shuttle',
          sub: `Live · ${shuttle.passengerCount||0} passengers`,
          color: route?.color || '#1A56DB',
          action: () => { selectShuttle(shuttle); panToShuttle(shuttle); setShowSearchResults(false); setSearchQuery(''); },
        });
      }
    });
    stops.forEach(stop => {
      if (stop.name?.toLowerCase().includes(q)) {
        results.push({
          type: 'stop', id: stop._id, label: stop.name, sub: 'Bus stop', color: '#D97706',
          action: () => { panToLocation(stop.lat, stop.lng, 17); setShowSearchResults(false); setSearchQuery(''); },
        });
      }
    });
    routes.forEach(route => {
      if (route.name?.toLowerCase().includes(q) || route.shortCode?.toLowerCase().includes(q)) {
        results.push({
          type: 'route', id: route._id, label: route.name,
          sub: `${route.stops?.length||0} stops`,
          color: route.color || '#1A56DB',
          action: () => {
            const first = route.stops?.[0]?.stopId;
            if (first?.lat) panToLocation(first.lat, first.lng, 15);
            setShowSearchResults(false); setSearchQuery('');
          },
        });
      }
    });
    setSearchResults(results);
    setShowSearchResults(true);
    if (nominatimTimerRef.current) clearTimeout(nominatimTimerRef.current);
    if (query.length < 2) return;
    nominatimTimerRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query, 4);
        const placeResults = places.map((p, i) => ({
          type: 'place', id: `place-${i}`, label: p.label, sub: p.sublabel || '', color: '#10B981',
          action: () => { panToLocation(p.lat, p.lng, 16); setShowSearchResults(false); setSearchQuery(p.label); },
        }));
        setSearchResults(prev => [...prev.filter(r => r.type !== 'place'), ...placeResults]);
      } catch {}
    }, 400);
  }, [routes, stops, getLiveShuttlesArray, selectShuttle, panToShuttle, panToLocation]);

  const handleSearchEnter = useCallback(async e => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    try {
      const result = await geocodeQuery(searchQuery);
      if (result) { panToLocation(result.lat, result.lng, 16); setShowSearchResults(false); setSearchQuery(result.label); }
      else toast.error('Location not found');
    } catch { toast.error('Search failed'); }
  }, [searchQuery, panToLocation]);

  const shuttlesArray = getLiveShuttlesArray();
  const favShuttlesData = shuttlesArray.filter(s => favShuttles.includes(s.shuttleId));
  const activeRoutes = routes.filter(r => r.isActive);

  const TABS = [
    { key: 'home', icon: Zap, label: 'Live' },
    { key: 'stops', icon: MapPin, label: 'Stops' },
    { key: 'schedule', icon: Calendar, label: 'Schedule' },
    { key: 'history', icon: History, label: 'History' },
    { key: 'alerts', icon: Megaphone, label: 'Alerts', count: announcements.length },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg-base)' }}>

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <div className={`flex flex-col w-full lg:w-[360px] lg:flex-shrink-0 ${showMap ? 'hidden lg:flex' : 'flex'} lg:h-screen lg:overflow-hidden`}
        style={{ background: 'var(--glass-3)', backdropFilter: 'blur(24px)', borderRight: '1px solid var(--border-1)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--brand), #818CF8)' }}>
              <Bus size={16} color="white" />
            </div>
            <div>
              <span className="font-display font-bold text-sm" style={{ color: 'var(--text-1)' }}>ShutliX</span>
              {user?.name && <p className="text-xs leading-none" style={{ color: 'var(--text-4)' }}>{user.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={fitAllShuttles} className="btn-ghost btn-icon" title="Fit all"><Locate size={15}/></button>
            <button
              onClick={() => {
                const next = !notificationsEnabled;
                setNotificationsEnabled(next);
                localStorage.setItem('notif-enabled', String(next));
                toast(next ? '🔔 Proximity alerts on' : '🔕 Alerts off');
              }}
              className="btn-ghost btn-icon"
              style={{ color: notificationsEnabled ? 'var(--brand)' : 'var(--text-4)' }}>
              {notificationsEnabled ? <Bell size={15}/> : <BellOff size={15}/>}
            </button>
            <button onClick={() => setShowReport(true)} className="btn-ghost btn-icon" title="Report issue">
              <Flag size={15} style={{ color: 'var(--text-3)' }}/>
            </button>
            <button onClick={() => navigate('/chat')} className="btn-ghost btn-icon" title="Messages">
              <MessageSquare size={15}/>
            </button>
            <ThemeToggle />
            <button onClick={logout} className="btn-ghost btn-icon"><LogOut size={15}/></button>
          </div>
        </div>

        {/* Nearest stop banner */}
        {nearestStop && activeTab === 'home' && (
          <button className="mx-3 mt-2.5 px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left transition-all hover:opacity-90"
            style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)' }}
            onClick={() => { panToLocation(nearestStop.stop.lat, nearestStop.stop.lng, 17); setShowMap(true); }}>
            <Navigation size={14} style={{ color: '#D97706', flexShrink: 0 }}/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#FBBF24' }}>
                Nearest: {nearestStop.stop.name}
              </p>
              <p className="text-xs" style={{ color: '#D97706' }}>
                {nearestStop.distance < 1 ? `${Math.round(nearestStop.distance * 1000)}m` : `${nearestStop.distance.toFixed(1)}km`}
                {' · '}~{Math.ceil(nearestStop.distance / 0.08)} min walk
              </p>
            </div>
            <ChevronRight size={13} style={{ color: '#D97706' }}/>
          </button>
        )}

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-0.5 px-3 py-2" style={{ borderBottom: '1px solid var(--border-1)' }}>
          {TABS.map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeTab === key ? 'var(--brand)' : 'transparent',
                color: activeTab === key ? 'white' : 'var(--text-3)',
              }}>
              <div className="relative">
                <Icon size={14}/>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
                    style={{ background: '#EF4444', fontSize: 8 }}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── HOME TAB ── */}
          {activeTab === 'home' && (
            <>
              {/* Seat availability summary */}
              {shuttlesArray.length > 0 && (
                <div className="mx-3 mt-3 mb-1 rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-1)' }}>
                  <div className="px-3 py-2 flex items-center gap-2"
                    style={{ background: 'var(--glass-2)', borderBottom: '1px solid var(--border-1)' }}>
                    <BarChart2 size={13} style={{ color: 'var(--brand)' }}/>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
                      Live Seat Availability
                    </span>
                  </div>
                  {shuttlesArray.map(shuttle => {
                    const route = routes.find(r => r._id === shuttle.routeId);
                    const pct = (shuttle.passengerCount || 0) / (shuttle.capacity || 30);
                    return (
                      <div key={shuttle.shuttleId} className="px-3 py-2 flex items-center gap-2.5"
                        style={{ borderBottom: '1px solid var(--border-1)' }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${route?.color || '#1A56DB'}18` }}>
                          <span className="font-bold" style={{ color: route?.color || 'var(--brand)', fontSize: 9 }}>
                            {route?.shortCode || 'S'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{route?.name || 'Shuttle'}</span>
                            <span className="text-xs flex-shrink-0 ml-2" style={{ color: capColor(pct) }}>
                              {shuttle.passengerCount || 0}/{shuttle.capacity || 30}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--glass-1)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(pct * 100, 100)}%`, background: capColor(pct) }}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Favourites */}
              {favShuttlesData.length > 0 && (
                <div className="mt-2">
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-4)', background: 'var(--glass-2)', borderBottom: '1px solid var(--border-1)' }}>
                    ❤️ Favourites
                  </p>
                  {favShuttlesData.map(shuttle => (
                    <ShuttleCard key={shuttle.shuttleId} shuttle={shuttle}
                      route={routes.find(r => r._id === shuttle.routeId)}
                      isSelected={selectedShuttle?.shuttleId === shuttle.shuttleId}
                      onClick={() => { selectShuttle(shuttle); panToShuttle(shuttle); setShowMap(true); }}
                      userLocation={userLocation} isFav onToggleFav={toggleFavShuttle}
                    />
                  ))}
                </div>
              )}

              {/* All shuttles */}
              <div className="mt-2">
                <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-4)', background: 'var(--glass-2)', borderBottom: '1px solid var(--border-1)' }}>
                  🚌 All Live ({shuttlesArray.length})
                </p>
                {shuttlesArray.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                    <WifiOff size={32} style={{ color: 'var(--text-4)' }}/>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-2)' }}>No active shuttles</p>
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>Shuttles appear once a driver starts a trip</p>
                  </div>
                ) : shuttlesArray.map(shuttle => (
                  <ShuttleCard key={shuttle.shuttleId} shuttle={shuttle}
                    route={routes.find(r => r._id === shuttle.routeId)}
                    isSelected={selectedShuttle?.shuttleId === shuttle.shuttleId}
                    onClick={() => { selectShuttle(shuttle); panToShuttle(shuttle); setShowMap(true); }}
                    userLocation={userLocation}
                    isFav={favShuttles.includes(shuttle.shuttleId)}
                    onToggleFav={toggleFavShuttle}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── STOPS TAB ── */}
          {activeTab === 'stops' && (
            <>
              {nearestStop && (
                <>
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-4)', background: 'var(--glass-2)', borderBottom: '1px solid var(--border-1)' }}>
                    📍 Nearest to you
                  </p>
                  <button onClick={() => { panToLocation(nearestStop.stop.lat, nearestStop.stop.lng, 17); setShowMap(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                    style={{ borderBottom: '1px solid var(--border-1)', background: 'rgba(217,119,6,0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.05)'}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
                      <Navigation size={16} style={{ color: '#D97706' }}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{nearestStop.stop.name}</p>
                      <p className="text-xs" style={{ color: '#D97706' }}>
                        {nearestStop.distance < 1 ? `${Math.round(nearestStop.distance * 1000)}m` : `${nearestStop.distance.toFixed(1)}km`}
                        {' · '}~{Math.ceil(nearestStop.distance / 0.08)} min walk
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color: '#D97706' }}/>
                  </button>
                </>
              )}
              <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-4)', background: 'var(--glass-2)', borderBottom: '1px solid var(--border-1)', borderTop: '1px solid var(--border-1)' }}>
                All Stops ({stops.length})
              </p>
              {stops.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin size={28} className="mx-auto mb-2" style={{ color: 'var(--text-4)' }}/>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No stops configured</p>
                </div>
              ) : stops.map(stop => {
                const dist = userLocation ? haversineDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng) : null;
                return (
                  <button key={stop._id}
                    onClick={() => { panToLocation(stop.lat, stop.lng, 17); setShowMap(true); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all"
                    style={{ borderBottom: '1px solid var(--border-1)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)' }}>
                      <MapPin size={14} style={{ color: '#D97706' }}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{stop.name}</p>
                      {dist !== null && (
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away
                        </p>
                      )}
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-4)' }}/>
                  </button>
                );
              })}
            </>
          )}

          {/* ── SCHEDULE TAB ── */}
          {activeTab === 'schedule' && (
            <>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-1)', background: 'var(--glass-2)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Route timetables · tap to expand</p>
              </div>
              {activeRoutes.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={28} className="mx-auto mb-2" style={{ color: 'var(--text-4)' }}/>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No routes configured</p>
                </div>
              ) : activeRoutes.map(route => <ScheduleCard key={route._id} route={route} />)}
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <>
              {rideHistory.length > 0 && <StatsCard history={rideHistory} />}
              {isLoadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="loader"><span/><span/><span/></div>
                </div>
              ) : rideHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History size={28} className="mx-auto mb-2" style={{ color: 'var(--text-4)' }}/>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No ride history yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Your trips appear here</p>
                </div>
              ) : rideHistory.map(trip => (
                <HistoryItem key={trip._id} trip={trip} onRate={setRatingTrip} />
              ))}
            </>
          )}

          {/* ── ALERTS TAB ── */}
          {activeTab === 'alerts' && (
            <>
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--glass-2)', borderBottom: '1px solid var(--border-1)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Announcements</p>
                {announcements.length > 0 && (
                  <button onClick={() => setAnnouncements([])} className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Clear all
                  </button>
                )}
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone size={28} className="mx-auto mb-2" style={{ color: 'var(--text-4)' }}/>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No announcements yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Admin alerts appear here in real time</p>
                </div>
              ) : announcements.map(a => (
                <div key={a.id} className="px-4 py-3 flex gap-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
                  <Megaphone size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>{a.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
                      {new Date(a.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex-shrink-0 p-3 lg:hidden" style={{ borderTop: '1px solid var(--border-1)' }}>
          <button onClick={() => setShowMap(true)} className="btn-primary w-full gap-2">
            <Map size={16}/> View Live Map
          </button>
        </div>
      </div>

      {/* ── MAP AREA ─────────────────────────────────────── */}
      <div className={`flex-1 relative ${showMap ? 'flex' : 'hidden lg:flex'} flex-col lg:h-auto`} style={{ height: mapHeight }}>

        {/* Back button */}
        <div className="absolute top-4 left-4 z-20 lg:hidden">
          <button onClick={() => setShowMap(false)} className="glass btn flex items-center gap-2 text-sm py-2 px-3">
            <List size={15}/> List
          </button>
        </div>

        {/* Search */}
        <div className="absolute top-4 z-20 lg:left-1/2 lg:-translate-x-1/2 left-20 right-4 lg:right-auto lg:w-96">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-3)' }}/>
            <input type="text" value={searchQuery}
              placeholder="Search shuttles, stops, places..."
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSearchEnter(e);
                if (e.key === 'Escape') { setShowSearchResults(false); setSearchQuery(''); setSearchResults([]); }
              }}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--glass-3)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-2)', color: 'var(--text-1)', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14}/>
              </button>
            )}
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-1.5 rounded-xl overflow-hidden"
              style={{ background: 'var(--glass-3)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: 320, overflowY: 'auto' }}>
              {['shuttle','stop','route','place'].map(type => {
                const group = searchResults.filter(r => r.type === type);
                if (!group.length) return null;
                const labels = { shuttle: '🚌 Live Shuttles', stop: '📍 Stops', route: '🗺 Routes', place: '🔍 Locations' };
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: 'var(--glass-2)', color: 'var(--text-4)' }}>{labels[type]}</div>
                    {group.map(result => (
                      <button key={result.id} onClick={result.action}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all"
                        style={{ borderBottom: '1px solid var(--border-1)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: `${result.color}22`, border: `1px solid ${result.color}44` }}>
                          {result.type === 'shuttle' && <Bus size={13} style={{ color: result.color }}/>}
                          {result.type === 'stop' && <MapPin size={13} style={{ color: result.color }}/>}
                          {result.type === 'route' && <Route size={13} style={{ color: result.color }}/>}
                          {result.type === 'place' && <Search size={13} style={{ color: result.color }}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{result.label}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{result.sub}</div>
                        </div>
                        <ChevronRight size={13} style={{ color: 'var(--text-4)' }}/>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {showSearchResults && !searchResults.length && searchQuery.length > 1 && (
            <div className="mt-1.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--glass-3)', border: '1px solid var(--border-2)', color: 'var(--text-3)' }}>
              No results — press Enter to search OpenStreetMap
            </div>
          )}
        </div>

        {/* Selected shuttle overlay */}
        {selectedShuttle && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
            <div className="glass-heavy rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bus size={18} style={{ color: 'var(--brand)' }}/>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {routes.find(r => r._id === selectedShuttle.routeId)?.name || 'Shuttle'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowReport(true)} className="btn-ghost btn-icon p-1" style={{ color: '#EF4444' }}>
                    <Flag size={13}/>
                  </button>
                  <button onClick={() => selectShuttle(null)} className="btn-ghost btn-icon p-1">
                    <X size={14}/>
                  </button>
                </div>
              </div>
              <CapacityBadge current={selectedShuttle.passengerCount || 0} total={selectedShuttle.capacity || 30} />
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
                <span className="flex items-center gap-1">
                  <Navigation size={12}/>
                  {selectedShuttle.speed ? `${Math.round(selectedShuttle.speed)} km/h` : 'Stopped'}
                </span>
                {userLocation && (
                  <span className="flex items-center gap-1">
                    <Clock size={12}/>
                    ETA: {estimateETA(selectedShuttle.lat, selectedShuttle.lng, userLocation.lat, userLocation.lng)} min
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1" style={{ color: '#34D399' }}>
                  <span className="dot-green"/> Live
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live count badge */}
        {shuttlesArray.length > 0 && !selectedShuttle && (
          <div className="absolute bottom-6 right-4 z-10">
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
              <span className="dot-green"/> {shuttlesArray.length} live
            </div>
          </div>
        )}

        {/* Map resize toggle - mobile only */}
        <div className="absolute bottom-6 left-4 z-10 lg:hidden">
          <button 
            onClick={() => setMapHeight(h => h === '50vh' ? '70vh' : h === '70vh' ? '100vh' : '50vh')}
            className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2"
            style={{ color: 'var(--text-2)' }}
          >
            <span>⬆</span> {mapHeight === '50vh' ? 'Expand' : mapHeight === '70vh' ? 'More' : 'Collapse'}
          </button>
        </div>

        <div ref={mapRef} className="w-full h-full min-h-0" onClick={() => setShowSearchResults(false)} />
      </div>

      {ratingTrip && (
        <RatingModal trip={ratingTrip} onClose={() => setRatingTrip(null)}
          onSubmitted={() => { setRatingTrip(null); setRideHistory([]); }} />
      )}
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={submitReport} />}
    </div>
  );
};

export default StudentPage;
