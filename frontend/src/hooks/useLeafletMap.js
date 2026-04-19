/**
 * useLeafletMap.js
 * Drop-in replacement for useGoogleMap — identical exported API.
 * Uses Leaflet + CartoDB tiles (dark/light automatically matched to theme).
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

// Fix Leaflet's broken default icon path in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Multiple tile options for better visuals
const TILE_STYLES = {
  // CartoDB options
  cartoDark:   'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  cartoLight:  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  cartoVoyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  cartoVoyagerNoLabels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  // Esri options (satellite, streets)
  esriSatellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  esriStreets: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  // OpenStreetMap
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

// Default tiles (theme-aware)
const TILES = {
  dark:  TILE_STYLES.cartoDark,
  light: TILE_STYLES.cartoLight,
};

const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> &copy; Esri';

const ANIMATION_DURATION = 1800;

const getResolvedTheme = () => {
  const saved = localStorage.getItem('shutlix-theme') || 'dark';
  if (saved === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return saved;
};

const svgToDataUrl = (svg) =>
  'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

const makeBusIcon = (heading, color, isActive, shortCode) =>
  L.divIcon({
    className: '',
    iconSize: [48, 52],
    iconAnchor: [24, 26],
    popupAnchor: [0, -26],
    html: `<img src="${createShuttleMarkerSVG(heading, color, isActive, shortCode)}" 
      style="width:48px;height:52px;transform:rotate(0deg)" />`,
  });

const makeStopIcon = (label, color) =>
  L.divIcon({
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    html: `<img src="${createStopMarkerSVG(label, color)}" style="width:32px;height:40px" />`,
  });

const useLeafletMap = ({
  mapRef,
  center = { lat: 24.9056, lng: 67.0822 },
  zoom = 15,
  liveShuttles = {},
  stops = [],
  routes = [],
  onShuttleClick,
  onStopClick,
}) => {
  const mapInstanceRef = useRef(null);
  const tileLayerRef   = useRef(null);
  const markerRefs     = useRef({});
  const prevPositions  = useRef({});
  const animFrames     = useRef({});
  const stopMarkersRef = useRef([]);
  const polylineRefs   = useRef([]);
  const animationFrameRef = useRef(null);
  const currentThemeRef = useRef(getResolvedTheme());

  // ── INIT MAP ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const theme = getResolvedTheme();
    currentThemeRef.current = theme;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      attributionControl: true,
    });

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Tile layer
    tileLayerRef.current = L.tileLayer(TILES[theme] || TILES.dark, {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Listen for theme changes and swap tiles
    const observer = new MutationObserver(() => {
      const newTheme = getResolvedTheme();
      if (newTheme !== currentThemeRef.current && tileLayerRef.current) {
        tileLayerRef.current.setUrl(TILES[newTheme] || TILES.dark);
        currentThemeRef.current = newTheme;
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapRef]);

  // ── DRAW ROUTE POLYLINES ──────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    polylineRefs.current.forEach(p => p.remove());
    polylineRefs.current = [];

    routes.forEach(route => {
      const path = route.pathCoordinates?.length
        ? route.pathCoordinates.map(c => [c.lat, c.lng])
        : (route.stops || []).map(s => {
            const lat = s.stopId?.lat || s.lat;
            const lng = s.stopId?.lng || s.lng;
            return lat && lng ? [lat, lng] : null;
          }).filter(Boolean);

      if (path.length < 2) return;

      const color = route.color || '#1A56DB';

      // Glow line (outer)
      const glow = L.polyline(path, {
        color,
        weight: 12,
        opacity: 0.1,
      }).addTo(mapInstanceRef.current);

      // Main line
      const main = L.polyline(path, {
        color,
        weight: 4,
        opacity: 0.9,
        dashArray: null,
      }).addTo(mapInstanceRef.current);

      // Animated dashed overlay
      const animated = L.polyline(path, {
        color: color,
        weight: 2,
        opacity: 0.6,
        dashArray: '10, 10',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current);

      // Animate the dash offset
      let dashOffset = 0;
      const animateDash = () => {
        dashOffset -= 1;
        animated.setStyle({ dashOffset: dashOffset });
        animationFrameRef.current = requestAnimationFrame(animateDash);
      };
      animationFrameRef.current = requestAnimationFrame(animateDash);

      polylineRefs.current.push(glow, main, animated);
    });
  }, [routes, mapInstanceRef.current]);

  // ── DRAW STOP MARKERS ─────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;

      const marker = L.marker([stop.lat, stop.lng], {
        icon: makeStopIcon(String(idx + 1), '#D97706'),
        title: stop.name,
        zIndexOffset: 500,
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`<div class="shuttle-iw"><h3>${stop.name}</h3><p>Bus stop</p></div>`);
      marker.on('click', () => {
        onStopClick?.(stop);
        marker.openPopup();
      });

      stopMarkersRef.current.push(marker);
    });
  }, [stops, mapInstanceRef.current]);

  // ── SMOOTH MARKER ANIMATION ───────────────────────────────
  const animateMarker = useCallback((shuttleId, fromPos, toPos, marker, heading, color, shortCode) => {
    if (animFrames.current[shuttleId]) cancelAnimationFrame(animFrames.current[shuttleId]);
    const start = performance.now();

    const step = (now) => {
      const fraction = Math.min((now - start) / ANIMATION_DURATION, 1);
      const eased = 1 - Math.pow(1 - fraction, 3);
      const pos = interpolatePosition(fromPos, toPos, eased);
      marker.setLatLng([pos.lat, pos.lng]);

      if (fraction < 1) {
        animFrames.current[shuttleId] = requestAnimationFrame(step);
      } else {
        marker.setIcon(makeBusIcon(heading, color, true, shortCode));
      }
    };
    animFrames.current[shuttleId] = requestAnimationFrame(step);
  }, []);

  // ── UPDATE SHUTTLE MARKERS ────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const activeIds = new Set(Object.keys(liveShuttles));

    // Remove offline shuttles
    Object.keys(markerRefs.current).forEach(id => {
      if (!activeIds.has(id)) {
        markerRefs.current[id].remove();
        delete markerRefs.current[id];
        delete prevPositions.current[id];
        if (animFrames.current[id]) {
          cancelAnimationFrame(animFrames.current[id]);
          delete animFrames.current[id];
        }
      }
    });

    // Update/create
    Object.values(liveShuttles).forEach(shuttle => {
      const { shuttleId, lat, lng, heading = 0, passengerCount = 0, shortCode } = shuttle;
      if (!lat || !lng) return;

      const cs = getCapacityStatus(passengerCount, shuttle.capacity || 30);
      const color = cs.color === 'red' ? '#EF4444'
        : cs.color === 'orange' ? '#F97316'
        : cs.color === 'yellow' ? '#F59E0B'
        : '#1A56DB';

      const newPos = { lat, lng };

      if (markerRefs.current[shuttleId]) {
        const prev = prevPositions.current[shuttleId] || newPos;
        const bearing = calculateBearing(prev.lat, prev.lng, lat, lng) || heading;
        animateMarker(shuttleId, prev, newPos, markerRefs.current[shuttleId], bearing, color, shortCode);
      } else {
        const marker = L.marker([lat, lng], {
          icon: makeBusIcon(heading, color, true, shortCode),
          title: `Shuttle ${shuttleId.slice(-4)}`,
          zIndexOffset: 1000,
        }).addTo(mapInstanceRef.current);

        marker.bindPopup(`
          <div class="shuttle-iw">
            <h3>Shuttle ${shuttleId.slice(-4)}</h3>
            <p>${passengerCount} passengers on board</p>
          </div>
        `);
        marker.on('click', () => {
          onShuttleClick?.(shuttle);
          marker.openPopup();
        });

        markerRefs.current[shuttleId] = marker;
      }

      prevPositions.current[shuttleId] = newPos;
    });
  }, [liveShuttles, animateMarker, onShuttleClick]);

  // ── PAN / FIT ─────────────────────────────────────────────
  const panToShuttle = useCallback((shuttle) => {
    if (!mapInstanceRef.current) return;
    const s = typeof shuttle === 'string'
      ? liveShuttles[shuttle]
      : shuttle;
    if (!s) return;
    mapInstanceRef.current.setView([s.lat, s.lng], 17, { animate: true });
  }, [liveShuttles]);

  const panToLocation = useCallback((lat, lng, z = 16) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([lat, lng], z, { animate: true });
  }, []);

  const fitAllShuttles = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const shuttles = Object.values(liveShuttles);
    if (!shuttles.length) return;
    const bounds = L.latLngBounds(shuttles.map(s => [s.lat, s.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], animate: true });
  }, [liveShuttles]);

  // Cleanup
  useEffect(() => () => {
    Object.values(animFrames.current).forEach(cancelAnimationFrame);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  // ── MAP CONTROLS ─────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const container = map.getContainer();
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const setTileLayer = useCallback((style) => {
    if (!tileLayerRef.current || !TILE_STYLES[style]) return;
    tileLayerRef.current.setUrl(TILE_STYLES[style]);
  }, []);

  return { 
    mapInstance: mapInstanceRef.current, 
    panToShuttle, 
    panToLocation, 
    fitAllShuttles,
    toggleFullscreen,
    setTileLayer,
  };
};

export default useLeafletMap;
