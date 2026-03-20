import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bus, MapPin, Clock, Navigation, Bell, BellOff,
  Star, ChevronRight, WifiOff, LogOut, List, Map,
  History, Locate, X, Route, UserCircle, Search,
} from 'lucide-react';
import { estimateETA } from '../services/maps';
import { searchPlaces, geocodeQuery } from '../services/nominatim';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useLeafletMap from '../hooks/useLeafletMap';
import CapacityBadge from '../components/ui/CapacityBadge';
import RatingModal from '../components/RatingModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

// ── SHUTTLE CARD ─────────────────────────────────────────
const ShuttleCard = ({ shuttle, route, isSelected, onClick, userLocation }) => {
  const eta = userLocation
    ? estimateETA(shuttle.lat, shuttle.lng, userLocation.lat, userLocation.lng)
    : null;
  const pct = shuttle.passengerCount / (shuttle.capacity || 30);
  const capColor = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F97316' : pct >= 0.5 ? '#F59E0B' : '#10B981';

  return (
    <button onClick={onClick} className="w-full text-left px-4 py-4 transition-all"
      style={{
        background: isSelected ? 'rgba(26,86,219,0.08)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        borderLeft: isSelected ? '3px solid var(--brand)' : '3px solid transparent',
      }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${route?.color || '#1A56DB'}18`, border: `1px solid ${route?.color || '#1A56DB'}33` }}>
          {route?.shortCode ? (
            <span className="text-xs font-bold" style={{ color: route.color || '#1A56DB' }}>{route.shortCode}</span>
          ) : (
            <Bus size={16} style={{ color: route?.color || 'var(--brand)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
            {route?.name || 'Live Shuttle'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 rounded-full flex-1" style={{ background: 'var(--surface-4)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct * 100, 100)}%`, background: capColor }} />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
              {shuttle.passengerCount || 0}/{shuttle.capacity || 30}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {eta !== null ? (
            <>
              <span className="font-bold text-base" style={{ color: 'var(--brand)' }}>{eta}</span>
              <p className="text-xs" style={{ color: 'var(--text-4)' }}>min</p>
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{shuttle.speed ? `${Math.round(shuttle.speed)} km/h` : 'Live'}</span>
          )}
        </div>
      </div>
    </button>
  );
};

// ── STOP CARD ─────────────────────────────────────────────
const StopCard = ({ stop, onClick }) => (
  <button onClick={onClick} className="w-full text-left px-4 py-3 transition-all"
    style={{ borderBottom: '1px solid var(--border)' }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)' }}>
        <MapPin size={14} style={{ color: '#D97706' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{stop.name}</p>
        {stop.facilities?.length > 0 && (
          <p className="text-xs capitalize truncate" style={{ color: 'var(--text-4)' }}>
            {stop.facilities.join(', ')}
          </p>
        )}
      </div>
      <ChevronRight size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
    </div>
  </button>
);

// ── HISTORY ITEM ──────────────────────────────────────────
const HistoryItem = ({ trip }) => (
  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--surface-3)' }}>
      <Star size={15} style={{ color: '#D97706' }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
        {trip.routeId?.name || 'Shuttle Ride'}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
        {new Date(trip.startTime).toLocaleDateString()}
      </p>
    </div>
    {trip.rating && (
      <div className="flex-shrink-0 flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={11} style={{ fill: s <= trip.rating ? '#D97706' : 'transparent', color: '#D97706' }} />
        ))}
      </div>
    )}
  </div>
);

// ── MAIN STUDENT PAGE ─────────────────────────────────────
const StudentPage = () => {
  const { user, logout } = useAuthStore();
  const { liveShuttles, routes, stops, fetchRoutes, fetchStops,
    selectedShuttle, selectShuttle, getLiveShuttlesArray } = useShuttleStore();

  const mapRef = useRef(null);
  const navigate = useNavigate();
  const searchTimerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);

  const [activeTab, setActiveTab] = useState('shuttles');
  const [userLocation, setUserLocation] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { panToShuttle, panToLocation, fitAllShuttles } = useLeafletMap({
    mapRef,
    center: { lat: 24.9056, lng: 67.0822 },
    zoom: 14,
    liveShuttles,
    stops,
    routes,
    onShuttleClick: (shuttle) => selectShuttle(shuttle),
    onStopClick: (stop) => panToLocation(stop.lat, stop.lng, 17),
  });

  // Get user GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // Load data
  useEffect(() => {
    fetchRoutes();
    fetchStops();
  }, []);

  // Load history when tab opens
  useEffect(() => {
    if (activeTab !== 'history' || rideHistory.length) return;
    setIsLoadingHistory(true);
    api.get('/student/history?limit=20')
      .then(r => setRideHistory(r.data.data || []))
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, [activeTab]);

  // ── SEARCH (Nominatim — no Google API needed) ──────────────
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); setShowSearchResults(false); return; }

    const q = query.toLowerCase();
    const localResults = [];

    // Live shuttles
    getLiveShuttlesArray().forEach(shuttle => {
      const route = routes.find(r => r._id === shuttle.routeId);
      if (route?.name?.toLowerCase().includes(q) || route?.shortCode?.toLowerCase().includes(q)) {
        localResults.push({
          type: 'shuttle', id: shuttle.shuttleId,
          label: route?.name || 'Live Shuttle',
          sub: `Live · ${shuttle.passengerCount||0} passengers${shuttle.speed?` · ${Math.round(shuttle.speed)} km/h`:''}`,
          color: route?.color || '#1A56DB',
          action: () => { selectShuttle(shuttle); panToShuttle(shuttle); setShowSearchResults(false); setSearchQuery(''); },
        });
      }
    });

    // Stops
    stops.forEach(stop => {
      if (stop.name?.toLowerCase().includes(q)) {
        localResults.push({
          type: 'stop', id: stop._id, label: stop.name, sub: 'Bus stop', color: '#D97706',
          action: () => { panToLocation(stop.lat, stop.lng, 17); setShowSearchResults(false); setSearchQuery(''); },
        });
      }
    });

    // Routes
    routes.forEach(route => {
      if (route.name?.toLowerCase().includes(q) || route.shortCode?.toLowerCase().includes(q)) {
        localResults.push({
          type: 'route', id: route._id, label: route.name,
          sub: `Route ${route.shortCode} · ${route.stops?.length||0} stops`,
          color: route.color || '#1A56DB',
          action: () => {
            const first = route.stops?.[0]?.stopId;
            if (first?.lat) panToLocation(first.lat, first.lng, 15);
            setShowSearchResults(false); setSearchQuery('');
          },
        });
      }
    });

    setSearchResults(localResults);
    setShowSearchResults(true);

    // Nominatim place search — debounced 400ms
    if (nominatimTimerRef.current) clearTimeout(nominatimTimerRef.current);
    if (query.length < 2) return;

    nominatimTimerRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query, 5);
        const placeResults = places.map((p, i) => ({
          type: 'place', id: `place-${i}`,
          label: p.label, sub: p.sublabel || p.fullAddress,
          color: '#10B981',
          action: () => { panToLocation(p.lat, p.lng, 16); setShowSearchResults(false); setSearchQuery(p.label); },
        }));
        setSearchResults(prev => [...prev.filter(r => r.type !== 'place'), ...placeResults]);
      } catch { /* Nominatim unreachable — silent fail */ }
    }, 400);
  }, [routes, stops, getLiveShuttlesArray, selectShuttle, panToShuttle, panToLocation]);

  // Enter key — direct Nominatim geocode
  const handleSearchEnter = useCallback(async (e) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    try {
      const result = await geocodeQuery(searchQuery);
      if (result) {
        panToLocation(result.lat, result.lng, 16);
        setShowSearchResults(false);
        setSearchQuery(result.label);
      } else {
        toast.error('Location not found');
      }
    } catch { toast.error('Search failed'); }
  }, [searchQuery, panToLocation]);

  const shuttlesArray = getLiveShuttlesArray();

  const TABS = [
    { key: 'shuttles', icon: Bus, label: 'Shuttles', count: shuttlesArray.length },
    { key: 'stops', icon: MapPin, label: 'Stops', count: stops.length },
    { key: 'history', icon: History, label: 'History' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--navy)' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <div className={`flex flex-col w-full lg:w-[340px] lg:flex-shrink-0 ${showMap ? 'hidden lg:flex' : 'flex'} lg:h-screen lg:overflow-hidden`}
        style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand)' }}>
              <Bus size={16} color="white" />
            </div>
            <span className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>ShutliX</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={fitAllShuttles} className="btn-ghost btn-icon" title="Fit all shuttles">
              <Locate size={16} />
            </button>
            <button onClick={() => navigate('/profile')} className="btn-ghost btn-icon" title="Profile">
              <UserCircle size={16} />
            </button>
            <ThemeToggle />
            <button onClick={logout} className="btn-ghost btn-icon" title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Announcement */}
        {announcement && (
          <div className="mx-4 my-2 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-slide-down"
            style={{ background: 'rgba(26,86,219,0.1)', border: '1px solid rgba(26,86,219,0.3)', color: 'var(--brand)' }}>
            <Bell size={14} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1">{announcement.message}</span>
            <button onClick={() => setAnnouncement(null)} className="btn-ghost btn-icon p-0"><X size={12} /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-1 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeTab === key ? 'var(--brand)' : 'transparent',
                color: activeTab === key ? 'white' : 'var(--text-3)',
              }}>
              <Icon size={13} />
              {label}
              {count !== undefined && count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: activeTab === key ? 'rgba(255,255,255,0.2)' : 'var(--surface-4)', minWidth: 18 }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'shuttles' && (
            <>
              {shuttlesArray.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                  <WifiOff size={32} style={{ color: 'var(--text-4)' }} />
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-2)' }}>No active shuttles</p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Shuttles appear here once a driver starts their trip
                  </p>
                </div>
              ) : (
                shuttlesArray.map(shuttle => (
                  <ShuttleCard
                    key={shuttle.shuttleId}
                    shuttle={shuttle}
                    route={routes.find(r => r._id === shuttle.routeId)}
                    isSelected={selectedShuttle?.shuttleId === shuttle.shuttleId}
                    onClick={() => { selectShuttle(shuttle); panToShuttle(shuttle); setShowMap(true); }}
                    userLocation={userLocation}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'stops' && (
            <>
              {stops.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin size={28} className="mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No stops configured</p>
                </div>
              ) : (
                stops.map(stop => (
                  <StopCard key={stop._id} stop={stop}
                    onClick={() => { panToLocation(stop.lat, stop.lng, 17); setShowMap(true); }} />
                ))
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {isLoadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="dot-loader"><span /><span /><span /></div>
                </div>
              ) : rideHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={28} className="mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No ride history yet</p>
                </div>
              ) : (
                rideHistory.map(trip => (
                  <div key={trip._id}>
                    <HistoryItem trip={trip} />
                    <button onClick={() => setRatingTrip(trip)}
                      className="w-full text-xs py-1.5 mb-1"
                      style={{ color: 'var(--brand)', background: 'rgba(26,86,219,0.04)' }}>
                      ★ Rate this ride
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Mobile map toggle */}
        <div className="flex-shrink-0 p-4 lg:hidden" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setShowMap(true)} className="btn-primary w-full gap-2">
            <Map size={16} /> View Live Map
          </button>
        </div>
      </div>

      {/* ── MAP AREA ─────────────────────────────────────────────── */}
      <div className={`flex-1 relative ${showMap ? 'flex' : 'hidden lg:flex'} flex-col`}>

        {/* Back button on mobile */}
        <div className="absolute top-4 left-4 z-20 lg:hidden">
          <button onClick={() => setShowMap(false)} className="glass btn flex items-center gap-2 text-sm py-2 px-3">
            <List size={15} /> List
          </button>
        </div>

        {/* ── SEARCH BAR ─────────────────────────────────────── */}
        <div className="absolute top-4 z-20 lg:left-1/2 lg:-translate-x-1/2 left-20 right-4 lg:right-auto lg:w-96">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              value={searchQuery}
              placeholder="Search shuttles, stops, routes, or any place..."
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSearchEnter(e);
                if (e.key === 'Escape') { setShowSearchResults(false); setSearchQuery(''); setSearchResults([]); }
              }}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-1.5 rounded-xl overflow-hidden"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                maxHeight: 340,
                overflowY: 'auto',
              }}>
              {['shuttle', 'stop', 'route', 'place'].map(type => {
                const group = searchResults.filter(r => r.type === type);
                if (!group.length) return null;
                const labels = { shuttle: '🚌 Live Shuttles', stop: '📍 Stops', route: '🗺 Routes', place: '🔍 Locations' };
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-4)' }}>
                      {labels[type]}
                    </div>
                    {group.map(result => (
                      <button key={result.id} onClick={result.action}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                        style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: `${result.color}22`, border: `1px solid ${result.color}44` }}>
                          {result.type === 'shuttle' && <Bus size={13} style={{ color: result.color }} />}
                          {result.type === 'stop' && <MapPin size={13} style={{ color: result.color }} />}
                          {result.type === 'route' && <Route size={13} style={{ color: result.color }} />}
                          {result.type === 'place' && <Search size={13} style={{ color: result.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{result.label}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{result.sub}</div>
                        </div>
                        <ChevronRight size={13} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {showSearchResults && searchResults.length === 0 && searchQuery.length > 1 && (
            <div className="mt-1.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-3)' }}>
              No results for "{searchQuery}" — press Enter to search OpenStreetMap
            </div>
          )}
        </div>

        {/* Selected shuttle overlay */}
        {selectedShuttle && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bus size={18} style={{ color: 'var(--brand)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {routes.find(r => r._id === selectedShuttle.routeId)?.name || 'Shuttle'}
                  </span>
                </div>
                <button onClick={() => selectShuttle(null)} className="btn-ghost btn-icon">
                  <X size={14} />
                </button>
              </div>
              <CapacityBadge current={selectedShuttle.passengerCount || 0} total={selectedShuttle.capacity || 30} />
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
                <span className="flex items-center gap-1">
                  <Navigation size={12} />
                  {selectedShuttle.speed ? `${Math.round(selectedShuttle.speed)} km/h` : 'Stopped'}
                </span>
                {userLocation && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    ETA: {estimateETA(selectedShuttle.lat, selectedShuttle.lng, userLocation.lat, userLocation.lng)} min
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1" style={{ color: '#34D399' }}>
                  <span className="status-dot-green" /> Live
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live count badge */}
        {shuttlesArray.length > 0 && !selectedShuttle && (
          <div className="absolute bottom-6 right-4 z-10">
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
              <span className="status-dot-green" />
              {shuttlesArray.length} live
            </div>
          </div>
        )}

        {/* Map */}
        <div ref={mapRef} className="w-full h-full" onClick={() => setShowSearchResults(false)} />
      </div>

      {ratingTrip && (
        <RatingModal trip={ratingTrip} onClose={() => setRatingTrip(null)} onSubmitted={() => setRatingTrip(null)} />
      )}
    </div>
  );
};

export default StudentPage;
