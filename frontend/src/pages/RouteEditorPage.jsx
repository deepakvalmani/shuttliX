import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  MapPin, Palette, Clock, ChevronUp, ChevronDown,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROUTE_COLORS = ['#1A56DB','#D97706','#10B981','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const getResolvedTheme = () => {
  const s = localStorage.getItem('shutlix-theme') || 'dark';
  return s === 'system' ? (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : s;
};
const TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const RouteEditorPage = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const stopMarkersRef = useRef({});
  const polylineRef = useRef(null);

  const [form, setForm] = useState({ name:'', shortCode:'', color:'#1A56DB', isCircular:false, notes:'' });
  const [schedule, setSchedule] = useState([{ days:['Mon','Tue','Wed','Thu','Fri'], startTime:'08:00', endTime:'20:00', frequency:20 }]);
  const [selectedStops, setSelectedStops] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const theme = getResolvedTheme();
    const map = L.map(mapRef.current, { center:[24.9056,67.0822], zoom:14, zoomControl:false });
    L.control.zoom({ position:'bottomright' }).addTo(map);
    L.tileLayer(TILES[theme], { attribution:ATTR, subdomains:'abcd', maxZoom:20 }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const stopsRes = await api.get('/admin/stops');
        setAllStops(stopsRes.data.data || []);
        if (routeId) {
          const routeRes = await api.get(`/admin/routes/${routeId}`);
          const route = routeRes.data.data;
          setForm({ name:route.name||'', shortCode:route.shortCode||'', color:route.color||'#1A56DB', isCircular:route.isCircular||false, notes:route.notes||'' });
          if (route.schedule?.length) setSchedule(route.schedule);
          const ordered = [...(route.stops||[])].sort((a,b)=>a.order-b.order).map(s=>s.stopId).filter(Boolean);
          setSelectedStops(ordered);
        }
      } catch { toast.error('Failed to load data'); }
      finally { setIsLoading(false); }
    };
    load();
  }, [routeId]);

  const toggleStop = useCallback((stop) => {
    setSelectedStops(prev => prev.some(s=>s._id===stop._id) ? prev.filter(s=>s._id!==stop._id) : [...prev,stop]);
  }, []);

  // Redraw stop markers
  useEffect(() => {
    if (!mapInstanceRef.current || !allStops.length) return;
    Object.values(stopMarkersRef.current).forEach(m => m.remove());
    stopMarkersRef.current = {};

    allStops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const isSelected = selectedStops.some(s=>s._id===stop._id);
      const orderIdx = selectedStops.findIndex(s=>s._id===stop._id);

      const icon = L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:${isSelected ? form.color : '#6B7280'};
          border:2px solid ${isSelected ? '#fff' : '#374151'};
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:#fff;
          cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.4)">
          ${isSelected && orderIdx >= 0 ? orderIdx+1 : ''}
        </div>`,
      });

      const marker = L.marker([stop.lat, stop.lng], { icon, title: stop.name })
        .addTo(mapInstanceRef.current);
      marker.bindPopup(`<strong>${stop.name}</strong><br><small>${isSelected ? `Stop #${orderIdx+1} — click to remove` : 'Click to add'}</small>`);
      marker.on('click', () => toggleStop(stop));
      stopMarkersRef.current[stop._id] = marker;
    });
  }, [allStops, selectedStops, form.color, toggleStop]);

  // Redraw polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (selectedStops.length < 2) return;
    const path = selectedStops.filter(s=>s.lat&&s.lng).map(s=>[s.lat,s.lng]);
    if (form.isCircular && path.length > 2) path.push(path[0]);
    polylineRef.current = L.polyline(path, { color:form.color, weight:4, opacity:0.8 }).addTo(mapInstanceRef.current);
  }, [selectedStops, form.color, form.isCircular]);

  const moveStop = (idx, dir) => {
    setSelectedStops(prev => {
      const arr = [...prev];
      const t = idx+dir;
      if (t<0||t>=arr.length) return arr;
      [arr[idx],arr[t]] = [arr[t],arr[idx]];
      return arr;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Route name required'); return; }
    if (selectedStops.length < 2) { toast.error('Add at least 2 stops'); return; }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        stops: selectedStops.map((s,i) => ({ stopId:s._id, order:i+1, estimatedMinutesFromStart:i*3 })),
        pathCoordinates: selectedStops.map(s=>({ lat:s.lat, lng:s.lng })),
        schedule, isActive:true,
      };
      if (routeId) { await api.patch(`/admin/routes/${routeId}`, payload); toast.success('Route updated'); }
      else { await api.post('/admin/routes', payload); toast.success('Route created'); }
      navigate('/admin');
    } catch (err) { toast.error(err.response?.data?.message||'Save failed'); }
    finally { setIsSaving(false); }
  };

  const updateSchedule = (idx, field, value) =>
    setSchedule(prev => prev.map((s,i) => i===idx ? {...s,[field]:value} : s));

  const toggleDay = (si, day) =>
    setSchedule(prev => prev.map((s,i) => i!==si ? s : {
      ...s, days: s.days.includes(day) ? s.days.filter(d=>d!==day) : [...s.days,day]
    }));

  return (
    <div className="min-h-screen flex flex-col" style={{ background:'var(--surface-1)' }}>
      <div className="flex-shrink-0 px-5 py-4 flex items-center gap-4"
        style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
        <button onClick={() => navigate('/admin')} className="btn-ghost btn-icon"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg" style={{ color:'var(--text-1)' }}>
            {routeId ? 'Edit Route' : 'New Route'}
          </h1>
          <p className="text-xs" style={{ color:'var(--text-3)' }}>Click stop markers to add/remove from route</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary gap-2">
          {isSaving ? <span className="dot-loader"><span/><span/><span/></span> : <><Save size={15}/>Save Route</>}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-4 space-y-4"
          style={{ background:'var(--surface-2)', borderRight:'1px solid var(--border)' }}>
          {isLoading ? <div className="flex justify-center py-12"><div className="dot-loader"><span/><span/><span/></div></div> : (
            <>
              <div className="rounded-xl p-4" style={{ background:'var(--surface-3)', border:'1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color:'var(--text-4)' }}>Route Details</p>
                <div className="space-y-3">
                  <div><label className="label">Route name *</label>
                    <input className="input" placeholder="e.g. Main Campus Loop" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
                  <div><label className="label">Short code</label>
                    <input className="input uppercase" placeholder="e.g. A, RED" maxLength={6} value={form.shortCode} onChange={e=>setForm(f=>({...f,shortCode:e.target.value.toUpperCase()}))}/></div>
                  <div><label className="label">Route colour</label>
                    <div className="flex flex-wrap gap-2">
                      {ROUTE_COLORS.map(c => (
                        <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                          className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                          style={{ background:c, border:form.color===c?'2px solid white':'2px solid transparent' }}/>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isCircular} onChange={e=>setForm(f=>({...f,isCircular:e.target.checked}))} className="w-4 h-4 rounded"/>
                    <span className="text-sm" style={{ color:'var(--text-2)' }}>Circular route</span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background:'var(--surface-3)', border:'1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color:'var(--text-4)' }}>
                  Stops ({selectedStops.length})
                </p>
                {selectedStops.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color:'var(--text-4)' }}>Click stops on the map to add them</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedStops.map((stop, idx) => (
                      <div key={stop._id} className="flex items-center gap-2 px-2 py-2 rounded-lg"
                        style={{ background:'var(--surface-2)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background:form.color, color:'#fff', fontSize:'9px' }}>{idx+1}</div>
                        <span className="flex-1 text-xs truncate" style={{ color:'var(--text-2)' }}>{stop.name}</span>
                        <button onClick={()=>moveStop(idx,-1)} disabled={idx===0} className="btn-ghost btn-icon p-0.5" style={{ opacity:idx===0?.3:1 }}><ChevronUp size={12}/></button>
                        <button onClick={()=>moveStop(idx,1)} disabled={idx===selectedStops.length-1} className="btn-ghost btn-icon p-0.5" style={{ opacity:idx===selectedStops.length-1?.3:1 }}><ChevronDown size={12}/></button>
                        <button onClick={()=>setSelectedStops(prev=>prev.filter(s=>s._id!==stop._id))} className="btn-ghost btn-icon p-0.5" style={{ color:'#EF4444' }}><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl p-4" style={{ background:'var(--surface-3)', border:'1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color:'var(--text-4)' }}>Schedule</p>
                {schedule.map((sched, idx) => (
                  <div key={idx} className="space-y-3">
                    <div><label className="label">Operating days</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map(day => (
                          <button key={day} onClick={()=>toggleDay(idx,day)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                            style={{ background:sched.days.includes(day)?form.color:'var(--surface-4)', color:sched.days.includes(day)?'#fff':'var(--text-3)' }}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label">Start</label>
                        <input type="time" className="input" value={sched.startTime} onChange={e=>updateSchedule(idx,'startTime',e.target.value)}/></div>
                      <div><label className="label">End</label>
                        <input type="time" className="input" value={sched.endTime} onChange={e=>updateSchedule(idx,'endTime',e.target.value)}/></div>
                    </div>
                    <div><label className="label">Frequency (minutes)</label>
                      <input type="number" className="input" min={5} max={120} step={5} value={sched.frequency} onChange={e=>updateSchedule(idx,'frequency',parseInt(e.target.value))}/></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" style={{ minHeight:400 }}/>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="glass rounded-xl px-4 py-2 text-xs" style={{ color:'var(--text-2)' }}>
              Gray = available · Coloured = selected · Click to toggle
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteEditorPage;
