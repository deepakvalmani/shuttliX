import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
if (typeof window !== 'undefined') window._L = L;
import {
  Bus, Play, Square, Users, AlertTriangle, PhoneCall,
  Navigation, Clock, CheckCircle, LogOut, Plus, Minus,
  ChevronDown, BarChart2, MapPin, Map, List,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import ThemeToggle from '../components/ThemeToggle';
import CapacityBadge from '../components/ui/CapacityBadge';
import QRGenerator from '../components/QRGenerator';
import api from '../services/api';
import toast from 'react-hot-toast';

const AccuracyBadge = ({ accuracy }) => {
  if (!accuracy) return null;
  const good = accuracy < 20, ok = accuracy < 50;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: good ? 'rgba(16,185,129,0.12)' : ok ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
        color: good ? '#34D399' : ok ? '#FBBF24' : '#F87171',
        border: `1px solid ${good ? 'rgba(16,185,129,0.3)' : ok ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}>
      GPS ±{Math.round(accuracy)}m
    </span>
  );
};

const DelayModal = ({ onConfirm, onClose }) => {
  const [minutes, setMinutes] = useState(10);
  const [msg, setMsg] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>Report Delay</h3>
        <div className="mb-4">
          <label className="label">Delay (minutes)</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setMinutes(m => Math.max(5, m - 5))} className="btn-secondary btn-icon"><Minus size={14} /></button>
            <span className="font-bold text-2xl flex-1 text-center" style={{ color: 'var(--text-1)' }}>{minutes}</span>
            <button onClick={() => setMinutes(m => m + 5)} className="btn-secondary btn-icon"><Plus size={14} /></button>
          </div>
        </div>
        <div className="mb-5">
          <label className="label">Message (optional)</label>
          <input className="input" placeholder="Reason for delay..." value={msg} onChange={e => setMsg(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onConfirm(minutes, msg)} className="btn-primary flex-1">Notify students</button>
        </div>
      </div>
    </div>
  );
};

const EmergencyModal = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.85)' }}>
    <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
      style={{ background: '#1A0A0A', border: '2px solid #EF4444' }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(239,68,68,0.2)', border: '2px solid #EF4444' }}>
        <PhoneCall size={28} style={{ color: '#EF4444' }} />
      </div>
      <h3 className="font-display font-bold text-xl text-center mb-2" style={{ color: '#F87171' }}>Emergency SOS</h3>
      <p className="text-sm text-center mb-6" style={{ color: 'var(--text-3)' }}>
        This will immediately alert your admin with your current GPS location.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={onConfirm} className="btn-danger flex-1 font-bold">🆘 Send SOS</button>
      </div>
    </div>
  </div>
);

const DriverPage = () => {
  const { user, logout } = useAuthStore();
  const { emitLocation, emitPassengerCount, emitDelay, emitEmergency,
    emitStartTrip, emitEndTrip, joinOrganization } = useSocket();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const stopMarkersRef = useRef([]);

  const [isOnTrip, setIsOnTrip] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [shuttles, setShuttles] = useState([]);
  const [selectedShuttle, setSelectedShuttle] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [gpsPos, setGpsPos] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [passengerCount, setPassengerCount] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(30);
  const [tripDuration, setTripDuration] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showShuttleSelect, setShowShuttleSelect] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard | map | route
  const [nextStop, setNextStop] = useState(null);
  const [nextStopETA, setNextStopETA] = useState(null);

  const gpsWatchRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const latestPosRef = useRef(null);
  const prevPosRef = useRef(null);
  const totalDistRef = useRef(0);

  // Join org socket room
  useEffect(() => {
    if (user?.organizationId) joinOrganization();
  }, [user?.organizationId]);

  // Init driver map (Leaflet)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || activeView !== 'map') return;
    const L = window._L;
    if (!L) return;
    const theme = localStorage.getItem('shutlix-theme') || 'dark';
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
      : theme;
    const tileUrl = resolved === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const map = L.map(mapRef.current, {
      center: gpsPos ? [gpsPos.lat, gpsPos.lng] : [24.9056, 67.0822],
      zoom: 15,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [activeView]);

  // Update driver marker on map (Leaflet)
  useEffect(() => {
    if (!mapInstanceRef.current || !gpsPos) return;
    const L = window._L;
    if (!L) return;

    const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#1A56DB" stroke="white" stroke-width="2"/>
      <polygon points="16,6 22,24 16,20 10,24" fill="white" transform="rotate(${gpsPos.heading||0},16,16)"/>
    </svg>`;

    const icon = L.divIcon({
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(arrowSvg)}" style="width:32px;height:32px"/>`,
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([gpsPos.lat, gpsPos.lng]);
      driverMarkerRef.current.setIcon(icon);
    } else {
      driverMarkerRef.current = L.marker([gpsPos.lat, gpsPos.lng], { icon, zIndexOffset: 2000 })
        .addTo(mapInstanceRef.current);
    }
    mapInstanceRef.current.setView([gpsPos.lat, gpsPos.lng], mapInstanceRef.current.getZoom(), { animate: true });
  }, [gpsPos]);

  // Draw route on driver map (Leaflet)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedRoute) return;
    const L = window._L;
    if (!L) return;

    if (routePolylineRef.current) { routePolylineRef.current.remove(); routePolylineRef.current = null; }
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    const routeStops = selectedRoute.stops?.map(s => s.stopId).filter(Boolean) || [];
    const path = routeStops.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);

    if (path.length >= 2) {
      routePolylineRef.current = L.polyline(path, {
        color: selectedRoute.color || '#1A56DB',
        weight: 4, opacity: 0.8,
      }).addTo(mapInstanceRef.current);
    }

    routeStops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const color = selectedRoute.color || '#D97706';
      const icon = L.divIcon({
        className: '',
        iconSize: [22, 22], iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white">${idx+1}</div>`,
      });
      const m = L.marker([stop.lat, stop.lng], { icon, title: stop.name }).addTo(mapInstanceRef.current);
      m.bindPopup(`<strong>${stop.name}</strong>`);
      stopMarkersRef.current.push(m);
    });
  }, [selectedRoute, mapInstanceRef.current]);

  // Calculate next stop ETA
  useEffect(() => {
    if (!gpsPos || !selectedRoute) return;
    const stops = selectedRoute.stops?.map(s => s.stopId).filter(Boolean) || [];
    if (!stops.length) return;

    let closestStop = null;
    let closestDist = Infinity;

    stops.forEach(stop => {
      if (!stop.lat || !stop.lng) return;
      const R = 6371;
      const dLat = ((stop.lat - gpsPos.lat) * Math.PI) / 180;
      const dLng = ((stop.lng - gpsPos.lng) * Math.PI) / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos((gpsPos.lat*Math.PI)/180)*Math.cos((stop.lat*Math.PI)/180)*Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (dist < closestDist) { closestDist = dist; closestStop = stop; }
    });

    if (closestStop) {
      setNextStop(closestStop);
      const speed = gpsPos.speed > 1 ? gpsPos.speed : 25;
      setNextStopETA(Math.max(1, Math.round((closestDist / speed) * 60)));
    }
  }, [gpsPos, selectedRoute]);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [shuttleRes, routeRes, tripRes] = await Promise.all([
          api.get('/shuttles'),
          api.get('/routes?activeOnly=true'),
          api.get('/driver/current-trip'),
        ]);
        setShuttles(shuttleRes.data.data || []);
        setRoutes(routeRes.data.data || []);

        if (tripRes.data.data) {
          const trip = tripRes.data.data;
          setCurrentTrip(trip);
          setIsOnTrip(true);
          setSelectedShuttle(trip.shuttleId);
          setSelectedRoute(trip.routeId);
          setMaxCapacity(trip.shuttleId?.capacity || 30);
          setTripStartTime(new Date(trip.startTime));
          startGPS(trip);
        } else {
          const assigned = user?.assignedShuttleId;
          if (assigned) {
            const s = shuttleRes.data.data.find(x => x._id === (assigned._id || assigned));
            if (s) { setSelectedShuttle(s); setMaxCapacity(s.capacity || 30); }
          }
        }
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  // Duration timer
  useEffect(() => {
    if (isOnTrip && tripStartTime) {
      durationIntervalRef.current = setInterval(() => {
        setTripDuration(Math.floor((Date.now() - tripStartTime.getTime()) / 60000));
      }, 10000);
    }
    return () => clearInterval(durationIntervalRef.current);
  }, [isOnTrip, tripStartTime]);

  const startGPS = useCallback((trip) => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          heading: pos.coords.heading || 0,
          accuracy: pos.coords.accuracy,
        };
        setGpsPos(position);
        setGpsAccuracy(pos.coords.accuracy);
        setLastUpdate(new Date());
        latestPosRef.current = position;

        // Accumulate distance
        if (prevPosRef.current) {
          const R = 6371;
          const dLat = ((position.lat - prevPosRef.current.lat) * Math.PI) / 180;
          const dLng = ((position.lng - prevPosRef.current.lng) * Math.PI) / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos((prevPosRef.current.lat*Math.PI)/180)*Math.cos((position.lat*Math.PI)/180)*Math.sin(dLng/2)**2;
          totalDistRef.current += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          setDistanceCovered(parseFloat(totalDistRef.current.toFixed(2)));
        }
        prevPosRef.current = position;
      },
      err => { console.warn('GPS error:', err); toast.error('GPS signal lost'); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    locationIntervalRef.current = setInterval(() => {
      if (!latestPosRef.current) return;
      const sid = trip?.shuttleId?._id || trip?.shuttleId || selectedShuttle?._id;
      if (!sid) return;
      emitLocation({
        lat: latestPosRef.current.lat,
        lng: latestPosRef.current.lng,
        speed: latestPosRef.current.speed,
        heading: latestPosRef.current.heading,
        passengerCount,
        shuttleId: sid,
      });
    }, 3000);
  }, [emitLocation, selectedShuttle, passengerCount]);

  const stopGPS = useCallback(() => {
    if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
    clearInterval(locationIntervalRef.current);
    setGpsPos(null);
    latestPosRef.current = null;
    prevPosRef.current = null;
    totalDistRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isOnTrip || !currentTrip) return;
    const sid = currentTrip?.shuttleId?._id || currentTrip?.shuttleId || selectedShuttle?._id;
    if (sid) emitPassengerCount(sid, passengerCount);
  }, [passengerCount, isOnTrip]);

  const handleStartTrip = async () => {
    if (!selectedShuttle) { toast.error('Select a shuttle first'); return; }
    setIsStarting(true);
    try {
      const { data } = await api.post('/driver/start-trip', {
        shuttleId: selectedShuttle._id,
        routeId: selectedRoute?._id || null,
      });
      const trip = { _id: data.data.tripId, shuttleId: selectedShuttle, routeId: selectedRoute };
      setCurrentTrip(trip);
      setIsOnTrip(true);
      setTripStartTime(new Date());
      setPassengerCount(0);
      setDistanceCovered(0);
      totalDistRef.current = 0;
      emitStartTrip(data.data.tripId, selectedShuttle._id, selectedRoute?._id);
      startGPS(trip);
      toast.success('Trip started! GPS is now broadcasting your location.');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not start trip'); }
    finally { setIsStarting(false); }
  };

  const handleEndTrip = async () => {
    if (!currentTrip) return;
    setIsEnding(true);
    try {
      await api.post('/driver/end-trip', {
        tripId: currentTrip._id,
        shuttleId: currentTrip.shuttleId?._id || currentTrip.shuttleId,
      });
      const sid = currentTrip.shuttleId?._id || currentTrip.shuttleId;
      emitEndTrip(sid, currentTrip._id);
      stopGPS();
      setIsOnTrip(false);
      setCurrentTrip(null);
      setPassengerCount(0);
      setTripDuration(0);
      setTripStartTime(null);
      setNextStop(null);
      setNextStopETA(null);
      toast.success('Trip ended. Good work!');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not end trip'); }
    finally { setIsEnding(false); }
  };

  const handleDelay = (minutes, message) => {
    const sid = currentTrip?.shuttleId?._id || currentTrip?.shuttleId;
    const rid = currentTrip?.routeId?._id || currentTrip?.routeId;
    emitDelay(sid, rid, minutes, message || `Route delayed by approximately ${minutes} minutes`);
    setShowDelayModal(false);
    toast.success('Delay reported — students notified');
  };

  const handleEmergency = () => {
    const sid = currentTrip?.shuttleId?._id || currentTrip?.shuttleId;
    emitEmergency(sid, latestPosRef.current?.lat, latestPosRef.current?.lng);
    setShowEmergencyModal(false);
    toast.error('🆘 Emergency alert sent to admin!', { duration: 8000 });
  };

  const changeCount = d => setPassengerCount(prev => Math.max(0, Math.min(maxCapacity, prev + d)));

  const shuttleName = currentTrip?.shuttleId?.name || selectedShuttle?.name || 'No shuttle';
  const routeName = currentTrip?.routeId?.name || selectedRoute?.name || 'No route';
  const routeStops = (currentTrip?.routeId?.stops || selectedRoute?.stops || []).filter(s => s.stopId);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: isOnTrip ? 'var(--brand)' : 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <Bus size={18} style={{ color: isOnTrip ? 'white' : 'var(--text-3)' }} />
          </div>
          <div>
            <p className="font-display font-bold text-base leading-none" style={{ color: 'var(--text-1)' }}>Driver Portal</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gpsPos && <AccuracyBadge accuracy={gpsAccuracy} />}
          {isOnTrip && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="status-dot-green" /> LIVE
            </span>
          )}
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost btn-icon"><LogOut size={15} /></button>
        </div>
      </div>

      {/* View tabs */}
      {isOnTrip && (
        <div className="flex gap-1 px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {[
            { key: 'dashboard', icon: List, label: 'Dashboard' },
            { key: 'map', icon: Map, label: 'My Location' },
            { key: 'route', icon: Navigation, label: 'Route' },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveView(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeView === key ? 'var(--brand)' : 'transparent',
                color: activeView === key ? 'white' : 'var(--text-3)',
              }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Map view */}
      {isOnTrip && activeView === 'map' && (
        <div className="flex-1" style={{ minHeight: 400 }}>
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: 400 }} />
          {gpsPos && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="glass rounded-xl px-4 py-3 flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold" style={{ color: 'var(--brand)' }}>{Math.round(gpsPos.speed)} km/h</div>
                  <div className="text-xs" style={{ color: 'var(--text-4)' }}>speed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold" style={{ color: 'var(--text-1)' }}>{distanceCovered} km</div>
                  <div className="text-xs" style={{ color: 'var(--text-4)' }}>covered</div>
                </div>
                {nextStop && (
                  <div className="text-center ml-auto">
                    <div className="font-bold" style={{ color: '#10B981' }}>~{nextStopETA} min</div>
                    <div className="text-xs truncate max-w-24" style={{ color: 'var(--text-4)' }}>to {nextStop.name}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Route view */}
      {isOnTrip && activeView === 'route' && (
        <div className="flex-1 overflow-y-auto p-5">
          <p className="font-display font-semibold text-base mb-4" style={{ color: 'var(--text-1)' }}>
            {routeName}
          </p>
          {routeStops.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No stops defined for this route</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-5 bottom-5 w-0.5" style={{ background: 'var(--surface-4)' }} />
              {routeStops.map((s, idx) => {
                const stop = s.stopId;
                const isNext = nextStop?._id === stop?._id;
                return (
                  <div key={idx} className="flex items-start gap-4 mb-4 relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 font-bold text-sm"
                      style={{
                        background: isNext ? 'var(--brand)' : 'var(--surface-3)',
                        border: `2px solid ${isNext ? 'var(--brand)' : 'var(--border-md)'}`,
                        color: isNext ? 'white' : 'var(--text-3)',
                      }}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="font-medium text-sm" style={{ color: isNext ? 'var(--brand)' : 'var(--text-1)' }}>
                        {stop?.name || 'Unknown Stop'}
                        {isNext && <span className="ml-2 text-xs" style={{ color: '#34D399' }}>← Next · ~{nextStopETA} min</span>}
                      </p>
                      {stop?.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{stop.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dashboard view */}
      {(!isOnTrip || activeView === 'dashboard') && (
        <div className="flex-1 overflow-y-auto px-5 py-5 max-w-lg mx-auto w-full space-y-5">

          {/* Pre-trip */}
          {!isOnTrip && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="font-display font-semibold text-base mb-4" style={{ color: 'var(--text-1)' }}>
                Select Vehicle & Route
              </p>
              <div className="mb-3">
                <label className="label">Vehicle</label>
                <div className="relative">
                  <button onClick={() => setShowShuttleSelect(v => !v)}
                    className="input w-full text-left flex items-center justify-between">
                    <span style={{ color: selectedShuttle ? 'var(--text-1)' : 'var(--text-4)' }}>
                      {selectedShuttle
                        ? `${selectedShuttle.name}${selectedShuttle.shortCode ? ` (${selectedShuttle.shortCode})` : ''} · ${selectedShuttle.plateNumber}`
                        : 'Choose a vehicle...'}
                    </span>
                    <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />
                  </button>
                  {showShuttleSelect && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {shuttles.filter(s => s.status !== 'retired').map(s => (
                        <button key={s._id} onClick={() => {
                          setSelectedShuttle(s);
                          setMaxCapacity(s.capacity || 30);
                          setShowShuttleSelect(false);
                        }}
                          className="w-full text-left px-4 py-3 text-sm"
                          style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}
                          onMouseEnter={e => e.target.style.background = 'var(--surface-4)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}>
                          <span className="font-medium">{s.name}</span>
                          {s.shortCode && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--brand)', color: 'white' }}>{s.shortCode}</span>}
                          <span style={{ color: 'var(--text-3)' }}> · {s.plateNumber} · Cap: {s.capacity}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-5">
                <label className="label">Route <span style={{ color: 'var(--text-4)' }}>(optional)</span></label>
                <select className="input" value={selectedRoute?._id || ''}
                  onChange={e => setSelectedRoute(routes.find(r => r._id === e.target.value) || null)}>
                  <option value="">No specific route</option>
                  {routes.map(r => (
                    <option key={r._id} value={r._id}>{r.name} ({r.shortCode})</option>
                  ))}
                </select>
              </div>
              <button onClick={handleStartTrip} disabled={isStarting || !selectedShuttle} className="btn-primary btn-lg w-full">
                {isStarting ? <><span className="dot-loader"><span/><span/><span/></span> Starting...</>
                  : <><Play size={18} /> Start Trip & Share Location</>}
              </button>
            </div>
          )}

          {/* On trip dashboard */}
          {isOnTrip && (
            <>
              {/* Trip status */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--brand)', boxShadow: '0 0 0 1px rgba(26,86,219,0.2)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--brand)' }}>Active Trip</p>
                    <p className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>{shuttleName}</p>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>{routeName}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-2xl" style={{ color: 'var(--brand)' }}>{tripDuration}m</div>
                    <div className="text-xs" style={{ color: 'var(--text-4)' }}>duration</div>
                  </div>
                </div>

                {/* GPS status */}
                <div className="flex items-center gap-2 text-sm mb-3">
                  {gpsPos ? (
                    <>
                      <div className="relative flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-50" />
                      </div>
                      <span style={{ color: '#34D399' }}>GPS broadcasting</span>
                      {lastUpdate && (
                        <span className="ml-auto text-xs" style={{ color: 'var(--text-4)' }}>
                          {Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                        </span>
                      )}
                    </>
                  ) : (
                    <><div className="w-2 h-2 rounded-full bg-red-400" /><span style={{ color: '#F87171' }}>GPS not active</span></>
                  )}
                </div>

                {/* GPS coords */}
                {gpsPos && (
                  <div className="rounded-xl px-3 py-2 text-xs font-mono mb-3 flex items-center gap-2"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                    <Navigation size={12} style={{ color: 'var(--brand)' }} />
                    {gpsPos.lat.toFixed(5)}, {gpsPos.lng.toFixed(5)}
                    {gpsPos.speed > 0 && (
                      <span className="ml-auto" style={{ color: 'var(--text-2)' }}>{Math.round(gpsPos.speed)} km/h</span>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Duration', value: `${tripDuration}m`, color: 'var(--brand)' },
                    { label: 'Speed', value: gpsPos?.speed ? `${Math.round(gpsPos.speed)} km/h` : '—', color: '#10B981' },
                    { label: 'Distance', value: `${distanceCovered} km`, color: '#D97706' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl p-3 text-center"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                      <div className="font-bold text-base" style={{ color }}>{value}</div>
                      <div className="text-xs" style={{ color: 'var(--text-4)' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Next stop */}
                {nextStop && (
                  <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <MapPin size={14} style={{ color: '#10B981' }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: '#34D399' }}>Next stop</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{nextStop.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: '#10B981' }}>~{nextStopETA} min</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Passenger counter */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>Passenger Count</p>
                <CapacityBadge current={passengerCount} total={maxCapacity} />
                <div className="flex items-center gap-4 mt-5">
                  <button onClick={() => changeCount(-1)} disabled={passengerCount <= 0}
                    className="btn-secondary flex-1 py-4 text-2xl font-bold" style={{ borderRadius: 14 }}>−</button>
                  <div className="flex flex-col items-center gap-0.5 min-w-20">
                    <span className="font-display font-bold text-5xl leading-none" style={{ color: 'var(--text-1)' }}>{passengerCount}</span>
                    <span className="text-xs" style={{ color: 'var(--text-4)' }}>on board</span>
                  </div>
                  <button onClick={() => changeCount(1)} disabled={passengerCount >= maxCapacity}
                    className="btn-primary flex-1 py-4 text-2xl font-bold" style={{ borderRadius: 14 }}>+</button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setPassengerCount(Math.min(maxCapacity, n))}
                      className="btn-secondary text-sm py-2">Set {n}</button>
                  ))}
                </div>
              </div>

              {/* QR Check-in */}
              <QRGenerator
                tripId={currentTrip?._id}
                shuttleId={currentTrip?.shuttleId?._id || currentTrip?.shuttleId}
                isActive={isOnTrip}
              />

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowDelayModal(true)}
                  className="rounded-2xl p-4 flex flex-col items-center gap-2"
                  style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)' }}>
                  <AlertTriangle size={24} style={{ color: '#D97706' }} />
                  <span className="text-sm font-medium" style={{ color: '#FBBF24' }}>Report Delay</span>
                </button>
                <button onClick={() => setShowEmergencyModal(true)}
                  className="rounded-2xl p-4 flex flex-col items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <PhoneCall size={24} style={{ color: '#EF4444' }} />
                  <span className="text-sm font-medium" style={{ color: '#F87171' }}>Emergency SOS</span>
                </button>
              </div>

              {/* End trip */}
              <button onClick={handleEndTrip} disabled={isEnding} className="btn-danger btn-lg w-full rounded-2xl">
                {isEnding
                  ? <><span className="dot-loader"><span/><span/><span/></span> Ending...</>
                  : <><Square size={18} /> End Trip</>}
              </button>
            </>
          )}
        </div>
      )}

      {showDelayModal && <DelayModal onConfirm={handleDelay} onClose={() => setShowDelayModal(false)} />}
      {showEmergencyModal && <EmergencyModal onConfirm={handleEmergency} onClose={() => setShowEmergencyModal(false)} />}
    </div>
  );
};

export default DriverPage;
