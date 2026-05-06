import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Trash2, Save, MapPin, Navigation, Search } from 'lucide-react';
import { searchPlaces, reverseGeocode } from '../services/nominatim';
import api from '../services/api';
import toast from 'react-hot-toast';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getTheme = () => {
  const s = localStorage.getItem('shutlix-theme')||'dark';
  return s==='system'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):s;
};
const TILES = {
  dark:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const FACILITIES = ['shelter','bench','lighting','accessibility','cctv'];

const StopManagerPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pendingMarkerRef = useRef(null);

  const [stops, setStops] = useState([]);
  const [pendingStop, setPendingStop] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [stopName, setStopName] = useState('');
  const [stopDesc, setStopDesc] = useState('');
  const [stopFacilities, setStopFacilities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef(null);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const theme = getTheme();
    const map = L.map(mapRef.current, { center:[24.9056,67.0822], zoom:13, zoomControl:false });
    L.control.zoom({ position:'bottomright' }).addTo(map);
    L.tileLayer(TILES[theme], { attribution:ATTR, subdomains:'abcd', maxZoom:20 }).addTo(map);
    mapInstanceRef.current = map;

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      setPendingStop({ lat, lng });
      setSelectedStop(null);
      setStopFacilities([]);
      setStopDesc('');
      if (pendingMarkerRef.current) pendingMarkerRef.current.remove();
      pendingMarkerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className:'',
          iconSize:[20,20], iconAnchor:[10,10],
          html:`<div style="width:20px;height:20px;border-radius:50%;background:#1A56DB;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
        }),
      }).addTo(map).bindPopup('New stop — fill name below').openPopup();
      // Reverse geocode to suggest name
      try {
        const result = await reverseGeocode(lat, lng);
        setStopName(result.label?.slice(0, 40) || '');
      } catch { setStopName(''); }
    });

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Load stops
  useEffect(() => {
    api.get('/admin/stops').then(r => setStops(r.data.data||[])).catch(()=>toast.error('Failed to load stops'));
  }, []);

  // Draw stop markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const isSel = selectedStop?._id === stop._id;
      const icon = L.divIcon({
        className:'',
        iconSize:[isSel?34:28, isSel?42:34],
        iconAnchor:[isSel?17:14, isSel?42:34],
        html:`<svg xmlns="http://www.w3.org/2000/svg" width="${isSel?34:28}" height="${isSel?42:34}" viewBox="0 0 30 38">
          <path d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 23 15 23S30 26.25 30 15C30 6.72 23.28 0 15 0z" fill="${isSel?'#1A56DB':'#D97706'}"/>
          <circle cx="15" cy="15" r="7" fill="white"/>
          <text x="15" y="19" text-anchor="middle" font-family="Inter,sans-serif" font-size="7" font-weight="700" fill="${isSel?'#1A56DB':'#D97706'}">${idx+1}</text>
        </svg>`,
      });

      const marker = L.marker([stop.lat, stop.lng], { icon, title:stop.name })
        .addTo(mapInstanceRef.current);
      marker.bindPopup(`<strong>${stop.name}</strong>`);
      marker.on('click', () => {
        setSelectedStop(stop);
        setPendingStop(null);
        setStopName(stop.name);
        setStopDesc(stop.description||'');
        setStopFacilities(stop.facilities||[]);
        if (pendingMarkerRef.current) pendingMarkerRef.current.remove();
        mapInstanceRef.current.setView([stop.lat, stop.lng], 17, { animate:true });
      });
      markersRef.current[stop._id] = marker;
    });
  }, [stops, selectedStop]);

  // Search with debounce
  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(val);
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 400);
  };

  const selectSearchResult = (r) => {
    setShowResults(false);
    setSearchQuery(r.label);
    mapInstanceRef.current?.setView([r.lat, r.lng], 16, { animate:true });
  };

  const handleSearchEnter = async (e) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchPlaces(searchQuery, 1);
      if (results[0]) {
        mapInstanceRef.current?.setView([results[0].lat, results[0].lng], 16, { animate:true });
        setShowResults(false);
      } else { toast.error('Location not found'); }
    } catch { toast.error('Search failed'); }
    finally { setIsSearching(false); }
  };

  const toggleFacility = (f) =>
    setStopFacilities(prev => prev.includes(f) ? prev.filter(x=>x!==f) : [...prev,f]);

  const saveStop = async () => {
    if (!stopName.trim()) { toast.error('Stop name required'); return; }
    const pos = selectedStop || pendingStop;
    if (!pos) { toast.error('Click on the map to place a stop'); return; }
    setIsSaving(true);
    try {
      const payload = { name:stopName, description:stopDesc, facilities:stopFacilities,
        lat: selectedStop ? selectedStop.lat : pendingStop.lat,
        lng: selectedStop ? selectedStop.lng : pendingStop.lng };
      if (selectedStop) {
        const res = await api.patch(`/admin/stops/${selectedStop._id}`, payload);
        setStops(prev => prev.map(s=>s._id===selectedStop._id?res.data.data:s));
        toast.success('Stop updated');
      } else {
        const res = await api.post('/admin/stops', payload);
        setStops(prev => [...prev, res.data.data]);
        if (pendingMarkerRef.current) pendingMarkerRef.current.remove();
        toast.success('Stop saved');
      }
      setPendingStop(null); setSelectedStop(null); setStopName(''); setStopDesc(''); setStopFacilities([]);
    } catch (err) { toast.error(err.response?.data?.message||'Save failed'); }
    finally { setIsSaving(false); }
  };

  const deleteStop = async (stopId) => {
    if (!confirm('Delete this stop? It will be removed from all routes.')) return;
    try {
      await api.delete(`/admin/stops/${stopId}`);
      setStops(prev => prev.filter(s=>s._id!==stopId));
      if (markersRef.current[stopId]) { markersRef.current[stopId].remove(); delete markersRef.current[stopId]; }
      if (selectedStop?._id===stopId) { setSelectedStop(null); setStopName(''); setStopDesc(''); setStopFacilities([]); }
      toast.success('Stop removed');
    } catch { toast.error('Delete failed'); }
  };

  const isEditing = !!(selectedStop || pendingStop);

  return (
    <div className="min-h-screen flex flex-col" style={{ background:'var(--bg-layer1)' }}>
      <div className="flex-shrink-0 px-5 py-4 flex items-center gap-4"
        style={{ background:'var(--glass-2)', borderBottom:'1px solid var(--border)' }}>
        <button onClick={()=>navigate('/admin')} className="btn-ghost btn-icon"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg" style={{ color:'var(--text-1)' }}>Stop Manager</h1>
          <p className="text-xs" style={{ color:'var(--text-3)' }}>Search any place on Earth · click map to place stop</p>
        </div>
        <span className="text-sm" style={{ color:'var(--text-3)' }}>{stops.length} stops</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col"
          style={{ background:'var(--glass-2)', borderRight:'1px solid var(--border)' }}>
          {/* Search */}
          <div className="p-4 relative" style={{ borderBottom:'1px solid var(--border)' }}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-4)' }}/>
                <input className="input pl-9 text-sm w-full" placeholder="Search any place on Earth..."
                  value={searchQuery}
                  onChange={e=>handleSearchInput(e.target.value)}
                  onKeyDown={handleSearchEnter}/>
              </div>
              {isSearching && <div className="flex items-center"><div className="loader"><span/><span/><span/></div></div>}
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-4 right-4 z-[2000] mt-1 rounded-xl overflow-hidden"
                style={{ background:'var(--glass-2)', border:'1px solid var(--border-2)', boxShadow:'0 8px 24px rgba(0,0,0,0.4)', maxHeight:240, overflowY:'auto' }}>
                {searchResults.map((r,i) => (
                  <button key={i} onClick={()=>selectSearchResult(r)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ borderBottom:'1px solid var(--border)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--glass-1)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div className="font-medium" style={{ color:'var(--text-1)' }}>{r.label}</div>
                    {r.sublabel && <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{r.sublabel}</div>}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs mt-2" style={{ color:'var(--text-4)' }}>Then click on the map to place a stop pin</p>
          </div>

          {/* Edit form */}
          {isEditing && (
            <div className="p-4" style={{ borderBottom:'1px solid var(--border)', background:selectedStop?'rgba(26,86,219,0.06)':'rgba(26,86,219,0.1)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color:'var(--brand)' }}>
                {selectedStop ? '✏️ Edit stop' : '📍 New stop'}
              </p>
              {(pendingStop||selectedStop) && (
                <p className="text-xs mb-2 font-mono" style={{ color:'var(--text-4)' }}>
                  {(pendingStop||selectedStop).lat.toFixed(5)}, {(pendingStop||selectedStop).lng.toFixed(5)}
                </p>
              )}
              <div className="space-y-3">
                <div><label className="label">Stop name *</label>
                  <input className="input text-sm" placeholder="e.g. Main Gate, Block C..."
                    value={stopName} onChange={e=>setStopName(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&saveStop()} autoFocus/></div>
                <div><label className="label">Description</label>
                  <input className="input text-sm" placeholder="Optional description"
                    value={stopDesc} onChange={e=>setStopDesc(e.target.value)}/></div>
                <div><label className="label">Facilities</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FACILITIES.map(fac => (
                      <button key={fac} onClick={()=>toggleFacility(fac)}
                        className="text-xs px-2 py-1 rounded-lg capitalize transition-all"
                        style={{ background:stopFacilities.includes(fac)?'rgba(26,86,219,0.2)':'var(--glass-1)', border:`1px solid ${stopFacilities.includes(fac)?'var(--brand)':'var(--border-1)'}`, color:stopFacilities.includes(fac)?'var(--brand)':'var(--text-3)' }}>
                        {fac}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={()=>{ setPendingStop(null); setSelectedStop(null); setStopName(''); setStopDesc(''); setStopFacilities([]); if(pendingMarkerRef.current) pendingMarkerRef.current.remove(); }}
                    className="btn-secondary flex-1 btn-sm">Cancel</button>
                  {selectedStop && <button onClick={()=>deleteStop(selectedStop._id)} className="btn-danger btn-sm"><Trash2 size={13}/></button>}
                  <button onClick={saveStop} disabled={isSaving||!stopName.trim()} className="btn-primary flex-1 btn-sm gap-1">
                    {isSaving ? <span className="loader"><span/><span/><span/></span> : <><Save size={13}/>{selectedStop?'Update':'Save'}</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stops list */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color:'var(--text-4)' }}>
              All Stops ({stops.length})
            </p>
            {stops.length === 0 ? (
              <div className="text-center py-8">
                <MapPin size={28} className="mx-auto mb-2" style={{ color:'var(--text-4)' }}/>
                <p className="text-xs" style={{ color:'var(--text-4)' }}>Search then click the map to add a stop</p>
              </div>
            ) : stops.map((stop,i) => (
              <button key={stop._id} onClick={()=>{ setSelectedStop(stop); setPendingStop(null); setStopName(stop.name); setStopDesc(stop.description||''); setStopFacilities(stop.facilities||[]); mapInstanceRef.current?.setView([stop.lat,stop.lng],17,{animate:true}); if(pendingMarkerRef.current) pendingMarkerRef.current.remove(); }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 transition-all"
                style={{ background:selectedStop?._id===stop._id?'rgba(26,86,219,0.15)':'var(--glass-2)', border:`1px solid ${selectedStop?._id===stop._id?'var(--brand)':'transparent'}` }}
                onMouseEnter={()=>markersRef.current[stop._id]?.openPopup()}
                onMouseLeave={()=>markersRef.current[stop._id]?.closePopup()}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background:'#D97706', color:'#fff', fontSize:'9px' }}>{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color:'var(--text-1)' }}>{stop.name}</p>
                  {stop.facilities?.length>0 && <p className="text-xs capitalize truncate" style={{ color:'var(--text-4)' }}>{stop.facilities.join(', ')}</p>}
                </div>
                <button onClick={e=>{e.stopPropagation();mapInstanceRef.current?.setView([stop.lat,stop.lng],17,{animate:true});}} className="btn-ghost btn-icon p-1 flex-shrink-0"><Navigation size={12}/></button>
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" style={{ minHeight:400 }}/>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="glass rounded-xl px-4 py-2 text-xs" style={{ color:'var(--text-2)' }}>
              {isEditing ? '✅ Stop placed — fill name and save' : 'Search above · Click map to place stop · Click marker to edit'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StopManagerPage;
