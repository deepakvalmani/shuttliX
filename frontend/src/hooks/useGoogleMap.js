import { useEffect, useRef, useCallback } from 'react';
import {
  createShuttleMarkerSVG,
  createStopMarkerSVG,
  interpolatePosition,
  calculateBearing,
  getCapacityStatus,
} from '../services/maps';

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d2137' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8baec8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a3352' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#091929' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5a85a8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#234870' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a3352' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#051018' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d7a9e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0a1f33' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#0f2840' }] },
];

const ANIMATION_DURATION = 2000; // ms — smooth interpolation duration

const useGoogleMap = ({
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
  const markerRefs = useRef({});       // shuttleId → google.maps.Marker
  const prevPositions = useRef({});    // shuttleId → last position
  const animFrames = useRef({});       // shuttleId → requestAnimationFrame id
  const stopMarkersRef = useRef([]);
  const polylineRefs = useRef([]);
  const infoWindowRef = useRef(null);

  // ── INIT MAP ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps) {
      console.warn('Google Maps JS API not loaded');
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
      gestureHandling: 'greedy',
      clickableIcons: false,
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [mapRef]);

  // ── DRAW ROUTE POLYLINES ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // Remove existing
    polylineRefs.current.forEach(p => p.setMap(null));
    polylineRefs.current = [];

    routes.forEach(route => {
      if (!route.pathCoordinates?.length && !route.stops?.length) return;

      const path = route.pathCoordinates?.length
        ? route.pathCoordinates.map(c => ({ lat: c.lat, lng: c.lng }))
        : route.stops.map(s => ({ lat: s.stopId?.lat || s.lat, lng: s.stopId?.lng || s.lng })).filter(p => p.lat);

      if (path.length < 2) return;

      // Outer glow line
      const glowLine = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: route.color || '#1A56DB',
        strokeOpacity: 0.15,
        strokeWeight: 10,
        map: mapInstanceRef.current,
      });

      // Main route line
      const mainLine = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: route.color || '#1A56DB',
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: mapInstanceRef.current,
      });

      polylineRefs.current.push(glowLine, mainLine);
    });
  }, [routes, mapInstanceRef.current]);

  // ── DRAW STOP MARKERS ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstanceRef.current,
        icon: {
          url: createStopMarkerSVG(String(idx + 1), '#D97706'),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40),
        },
        title: stop.name,
        zIndex: 5,
      });

      marker.addListener('click', () => {
        onStopClick?.(stop);
        infoWindowRef.current?.setContent(`
          <div class="shuttle-iw">
            <h3>${stop.name}</h3>
            <p>Bus stop</p>
          </div>
        `);
        infoWindowRef.current?.open(mapInstanceRef.current, marker);
      });

      stopMarkersRef.current.push(marker);
    });
  }, [stops, mapInstanceRef.current]);

  // ── SMOOTH MARKER ANIMATION ───────────────────────────────────────────────
  const animateMarker = useCallback((shuttleId, fromPos, toPos, marker, heading) => {
    if (animFrames.current[shuttleId]) {
      cancelAnimationFrame(animFrames.current[shuttleId]);
    }

    const start = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const fraction = Math.min(elapsed / ANIMATION_DURATION, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - fraction, 3);

      const pos = interpolatePosition(fromPos, toPos, eased);
      marker.setPosition(pos);

      // Update icon with new heading
      marker.setIcon({
        url: createShuttleMarkerSVG(heading, marker._routeColor || '#1A56DB', true),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24),
      });

      if (fraction < 1) {
        animFrames.current[shuttleId] = requestAnimationFrame(step);
      }
    };

    animFrames.current[shuttleId] = requestAnimationFrame(step);
  }, []);

  // ── UPDATE SHUTTLE MARKERS ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    const activeIds = new Set(Object.keys(liveShuttles));

    // Remove markers for shuttles that went offline
    Object.keys(markerRefs.current).forEach(id => {
      if (!activeIds.has(id)) {
        markerRefs.current[id].setMap(null);
        delete markerRefs.current[id];
        delete prevPositions.current[id];
        if (animFrames.current[id]) {
          cancelAnimationFrame(animFrames.current[id]);
          delete animFrames.current[id];
        }
      }
    });

    // Update or create markers
    Object.values(liveShuttles).forEach(shuttle => {
      const { shuttleId, lat, lng, heading = 0, passengerCount = 0, routeId } = shuttle;
      if (!lat || !lng) return;

      const capacityStatus = getCapacityStatus(passengerCount, shuttle.capacity || 30);
      const color = capacityStatus.color === 'red' ? '#EF4444'
        : capacityStatus.color === 'orange' ? '#F97316'
        : capacityStatus.color === 'yellow' ? '#F59E0B'
        : '#1A56DB';

      const newPos = { lat, lng };

      if (markerRefs.current[shuttleId]) {
        // Animate existing marker to new position
        const prev = prevPositions.current[shuttleId] || newPos;
        const bearing = calculateBearing(prev.lat, prev.lng, lat, lng) || heading;
        animateMarker(shuttleId, prev, newPos, markerRefs.current[shuttleId], bearing);
        markerRefs.current[shuttleId]._routeColor = color;
      } else {
        // Create new marker
        const marker = new window.google.maps.Marker({
          position: newPos,
          map: mapInstanceRef.current,
          icon: {
            url: createShuttleMarkerSVG(heading, color, true),
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
          },
          title: `Shuttle ${shuttleId.slice(-4)}`,
          zIndex: 10,
          animation: window.google.maps.Animation.DROP,
        });

        marker._routeColor = color;

        marker.addListener('click', () => {
          onShuttleClick?.(shuttle);
          infoWindowRef.current?.setContent(`
            <div class="shuttle-iw">
              <h3>Shuttle ${shuttleId.slice(-4)}</h3>
              <p>${passengerCount} passengers on board</p>
            </div>
          `);
          infoWindowRef.current?.open(mapInstanceRef.current, marker);
        });

        markerRefs.current[shuttleId] = marker;
      }

      prevPositions.current[shuttleId] = newPos;
    });
  }, [liveShuttles, animateMarker, onShuttleClick]);

  // ── PAN TO SHUTTLE ────────────────────────────────────────────────────────
  const panToShuttle = useCallback((shuttleId) => {
    const shuttle = liveShuttles[shuttleId];
    if (!shuttle || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: shuttle.lat, lng: shuttle.lng });
    mapInstanceRef.current.setZoom(17);
  }, [liveShuttles]);

  const panToLocation = useCallback((lat, lng, z = 16) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat, lng });
    mapInstanceRef.current.setZoom(z);
  }, []);

  const fitAllShuttles = useCallback(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const shuttles = Object.values(liveShuttles);
    if (!shuttles.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    shuttles.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
    mapInstanceRef.current.fitBounds(bounds, 80);
  }, [liveShuttles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(animFrames.current).forEach(cancelAnimationFrame);
    };
  }, []);

  return { mapInstance: mapInstanceRef.current, panToShuttle, panToLocation, fitAllShuttles };
};

export default useGoogleMap;