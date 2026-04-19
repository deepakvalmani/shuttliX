/**
 * hooks/useLeafletMap.js  v2.0
 *
 * FIXES vs v1:
 * 1. Shuttle marker rotation was broken — heading was applied to the
 *    container img element incorrectly. Now uses CSS rotate on the div icon.
 * 2. No smooth heading interpolation — heading jumped instantly.
 *    Now lerps heading over the same animation duration as position.
 * 3. Map init center did not persist org settings — now accepts dynamic center.
 * 4. Mobile touch gestures were not enabled — added touch gesture options.
 * 5. Map destroyed on re-render due to missing useRef guard — now properly guarded.
 * 6. Stop markers always amber — now respects route color.
 * 7. Popup content was plain HTML with no styling — now styled with CSS variables.
 */
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  createShuttleMarkerSVG,
  createStopMarkerSVG,
  interpolatePosition,
  calculateBearing,
  getCapacityStatus,
} from '../services/maps';

// ── CartoDB tiles — no API key needed ─────────────────────
const TILES = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const ANIMATION_MS = 1600; // smooth interpolation over GPS update interval

const getTheme = () => {
  const saved = localStorage.getItem('sx-theme') || 'dark';
  if (saved === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return saved;
};

// ── Icon factories ─────────────────────────────────────────
// v2 fix: rotation is now applied via CSS transform on the wrapping div,
// not on the <img> element inside it. Leaflet's divIcon html is the right place.
const makeBusIcon = (headingDeg, color, shortCode) =>
  L.divIcon({
    className: '',
    iconSize:   [48, 52],
    iconAnchor: [24, 42],
    popupAnchor:[0, -44],
    html: `
      <div style="
        width:48px;height:52px;
        transform:rotate(${headingDeg || 0}deg);
        transform-origin:center 38px;
        transition:transform 0.8s ease-out;
        will-change:transform;
      ">
        <img src="${createShuttleMarkerSVG(0, color, true, shortCode)}" style="width:100%;height:100%;display:block" />
      </div>`,
  });

const makeStopIcon = (label, color) =>
  L.divIcon({
    className: '',
    iconSize:   [28, 34],
    iconAnchor: [14, 34],
    popupAnchor:[0, -36],
    html: `<img src="${createStopMarkerSVG(label, color)}" style="width:28px;height:34px;display:block" />`,
  });

// ── Hook ──────────────────────────────────────────────────
const useLeafletMap = ({
  mapRef,
  center       = { lat: 24.9056, lng: 67.0822 },
  zoom         = 15,
  liveShuttles = {},
  stops        = [],
  routes       = [],
  onShuttleClick,
  onStopClick,
}) => {
  const mapInst       = useRef(null);
  const tileLayer     = useRef(null);
  const shuttleMarkers= useRef({});  // { [shuttleId]: L.Marker }
  const prevPos       = useRef({});  // { [shuttleId]: {lat,lng,heading} }
  const animFrames    = useRef({});  // { [shuttleId]: rAF id }
  const stopMarkers   = useRef([]);
  const polylines     = useRef([]);
  const themeRef      = useRef(getTheme());
  const userMarker    = useRef(null);

  // ── Init map ───────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const theme = getTheme();
    themeRef.current = theme;

    const map = L.map(mapRef.current, {
      center:             [center.lat, center.lng],
      zoom,
      zoomControl:        false,
      attributionControl: true,
      // Mobile: enable all gestures
      tap:                true,
      tapTolerance:       15,
      touchZoom:          true,
      bounceAtZoomLimits: false,
      // Smooth panning
      inertia:            true,
      inertiaDeceleration:3000,
      inertiaMaxSpeed:    1500,
    });

    // Zoom control — bottom right, away from mobile thumb
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    tileLayer.current = L.tileLayer(TILES[theme] || TILES.dark, {
      attribution: ATTR,
      subdomains:  'abcd',
      maxZoom:     20,
      minZoom:     5,
      // Performance: fewer requests on slow mobile connections
      keepBuffer:  2,
      updateWhenIdle:    false,
      updateWhenZooming: false,
    }).addTo(map);

    mapInst.current = map;

    // Watch for theme changes and swap tiles
    const obs = new MutationObserver(() => {
      const nt = getTheme();
      if (nt !== themeRef.current) {
        tileLayer.current?.setUrl(TILES[nt] || TILES.dark);
        themeRef.current = nt;
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Invalidate size on resize (fixes blank tiles on mobile orientation change)
    const onResize = () => map.invalidateSize({ animate: false });
    window.addEventListener('resize', onResize);
    // Force one invalidation after mount
    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      obs.disconnect();
      window.removeEventListener('resize', onResize);
      Object.values(animFrames.current).forEach(cancelAnimationFrame);
      map.remove();
      mapInst.current     = null;
      shuttleMarkers.current = {};
      stopMarkers.current = [];
      polylines.current   = [];
    };
  }, []); // intentionally empty — init once

  // ── Draw route polylines ───────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    polylines.current.forEach(p => p.remove());
    polylines.current = [];

    routes.forEach(route => {
      const coords = route.pathCoordinates?.length
        ? route.pathCoordinates.map(c => [c.lat, c.lng])
        : (route.stops || [])
            .map(s => {
              const lat = s.stopId?.lat ?? s.lat;
              const lng = s.stopId?.lng ?? s.lng;
              return (lat && lng) ? [lat, lng] : null;
            })
            .filter(Boolean);

      if (coords.length < 2) return;

      const color = route.color || '#7C3AED';

      // Glow / shadow layer
      const glow = L.polyline(coords, { color, weight: 12, opacity: 0.12, lineCap: 'round' }).addTo(mapInst.current);
      // Main line
      const main = L.polyline(coords, { color, weight: 3.5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(mapInst.current);

      polylines.current.push(glow, main);
    });
  }, [routes]);

  // ── Draw stop markers ──────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    stopMarkers.current.forEach(m => m.remove());
    stopMarkers.current = [];

    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const color = stop.routeColor || '#D97706';
      const marker = L.marker([stop.lat, stop.lng], {
        icon:        makeStopIcon(String(idx + 1), color),
        title:       stop.name,
        zIndexOffset:500,
      }).addTo(mapInst.current);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:140px">
          <p style="font-weight:700;margin:0 0 4px;color:#fff">${stop.name}</p>
          <p style="margin:0;color:#9B8EC4;font-size:12px">Stop ${idx + 1}</p>
        </div>
      `, { className: 'shuttlix-popup' });

      marker.on('click', () => { onStopClick?.(stop); marker.openPopup(); });
      stopMarkers.current.push(marker);
    });
  }, [stops]);

  // ── Smooth shuttle marker animation ───────────────────
  const animateShuttle = useCallback((id, from, to, heading, marker) => {
    if (animFrames.current[id]) cancelAnimationFrame(animFrames.current[id]);

    const startTime    = performance.now();
    const fromHeading  = prevPos.current[id]?.heading || heading;

    const tick = (now) => {
      const t       = Math.min((now - startTime) / ANIMATION_MS, 1);
      const eased   = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const pos     = interpolatePosition(from, to, eased);

      // Lerp heading (handle wrap-around)
      let dh = heading - fromHeading;
      if (dh > 180)  dh -= 360;
      if (dh < -180) dh += 360;
      const h = fromHeading + dh * eased;

      marker.setLatLng([pos.lat, pos.lng]);

      // Update the rotation div directly instead of recreating the icon
      const el  = marker.getElement();
      const div = el?.querySelector('div');
      if (div) div.style.transform = `rotate(${h}deg)`;

      if (t < 1) {
        animFrames.current[id] = requestAnimationFrame(tick);
      } else {
        delete animFrames.current[id];
      }
    };

    animFrames.current[id] = requestAnimationFrame(tick);
  }, []);

  // ── Update shuttle markers on every position change ────
  useEffect(() => {
    if (!mapInst.current) return;

    const liveIds = new Set(Object.keys(liveShuttles));

    // Remove offline shuttles
    Object.keys(shuttleMarkers.current).forEach(id => {
      if (!liveIds.has(id)) {
        shuttleMarkers.current[id].remove();
        delete shuttleMarkers.current[id];
        delete prevPos.current[id];
        if (animFrames.current[id]) {
          cancelAnimationFrame(animFrames.current[id]);
          delete animFrames.current[id];
        }
      }
    });

    Object.values(liveShuttles).forEach(shuttle => {
      const { shuttleId, lat, lng, heading = 0, passengerCount = 0, capacity = 30, shortCode } = shuttle;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const cs    = getCapacityStatus(passengerCount, capacity);
      const color = cs.color === 'red' ? '#EF4444'
        : cs.color === 'orange' ? '#F97316'
        : cs.color === 'yellow' ? '#F59E0B'
        : '#7C3AED';

      const newPos = { lat, lng };

      if (shuttleMarkers.current[shuttleId]) {
        const prev    = prevPos.current[shuttleId] || newPos;
        const bearing = calculateBearing(prev.lat, prev.lng, lat, lng) || heading;
        animateShuttle(shuttleId, prev, newPos, bearing, shuttleMarkers.current[shuttleId]);

        // Refresh popup content (passenger count may have changed)
        shuttleMarkers.current[shuttleId].setPopupContent(`
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <p style="font-weight:700;margin:0 0 4px;color:#fff">${shuttle.routeName || `Shuttle ${shuttleId.slice(-4)}`}</p>
            <p style="margin:0 0 4px;color:#9B8EC4;font-size:12px">${passengerCount} / ${capacity} passengers</p>
            <p style="margin:0;color:#9B8EC4;font-size:12px">${Math.round(shuttle.speed || 0)} km/h</p>
          </div>
        `);
      } else {
        // New marker
        const bearing = calculateBearing(
          prevPos.current[shuttleId]?.lat || lat,
          prevPos.current[shuttleId]?.lng || lng,
          lat, lng
        ) || heading;

        const marker = L.marker([lat, lng], {
          icon:        makeBusIcon(bearing, color, shortCode),
          title:       shuttle.routeName || `Shuttle ${shuttleId.slice(-4)}`,
          zIndexOffset:1000,
        }).addTo(mapInst.current);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <p style="font-weight:700;margin:0 0 4px;color:#fff">${shuttle.routeName || `Shuttle ${shuttleId.slice(-4)}`}</p>
            <p style="margin:0 0 4px;color:#9B8EC4;font-size:12px">${passengerCount} / ${capacity} passengers</p>
            <p style="margin:0;color:#9B8EC4;font-size:12px">${Math.round(shuttle.speed || 0)} km/h</p>
          </div>
        `, { className: 'shuttlix-popup' });

        marker.on('click', () => { onShuttleClick?.(shuttle); marker.openPopup(); });
        shuttleMarkers.current[shuttleId] = marker;
      }

      prevPos.current[shuttleId] = { lat, lng, heading };
    });
  }, [liveShuttles, animateShuttle]);

  // ── User location marker ───────────────────────────────
  const showUserLocation = useCallback((lat, lng) => {
    if (!mapInst.current) return;
    const pos = [lat, lng];

    if (userMarker.current) {
      userMarker.current.setLatLng(pos);
    } else {
      userMarker.current = L.circleMarker(pos, {
        radius:      8,
        color:       '#fff',
        weight:      2,
        fillColor:   '#3B82F6',
        fillOpacity: 1,
      }).addTo(mapInst.current).bindPopup('You are here');
    }
  }, []);

  // ── Exported pan/fit helpers ───────────────────────────
  const panToShuttle = useCallback(shuttleOrId => {
    if (!mapInst.current) return;
    const s = typeof shuttleOrId === 'string' ? liveShuttles[shuttleOrId] : shuttleOrId;
    if (s?.lat && s?.lng) mapInst.current.flyTo([s.lat, s.lng], 17, { animate: true, duration: 0.8 });
  }, [liveShuttles]);

  const panToLocation = useCallback((lat, lng, z = 16) => {
    if (!mapInst.current) return;
    mapInst.current.flyTo([lat, lng], z, { animate: true, duration: 0.8 });
  }, []);

  const fitAllShuttles = useCallback(() => {
    if (!mapInst.current) return;
    const pts = Object.values(liveShuttles).filter(s => s.lat && s.lng);
    if (!pts.length) return;
    if (pts.length === 1) {
      mapInst.current.flyTo([pts[0].lat, pts[0].lng], 16);
      return;
    }
    const bounds = L.latLngBounds(pts.map(s => [s.lat, s.lng]));
    mapInst.current.flyToBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
  }, [liveShuttles]);

  return {
    mapInstance: mapInst.current,
    panToShuttle,
    panToLocation,
    fitAllShuttles,
    showUserLocation,
  };
};

export default useLeafletMap;
