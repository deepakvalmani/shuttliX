/**
 * services/maps.js — SVG marker generators and geo utilities for Leaflet.
 */

export const createShuttleMarkerSVG = (heading = 0, color = '#7C3AED', isActive = true, shortCode = '') => {
  const ring = isActive ? `<circle cx="24" cy="26" r="22" fill="${color}" opacity="0.15"/>` : '';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="52" viewBox="0 0 48 52">
      ${ring}
      <rect x="8" y="12" width="32" height="22" rx="6" fill="${color}"/>
      <rect x="10" y="8" width="28" height="10" rx="4" fill="${color}" opacity="0.7"/>
      <rect x="9" y="18" width="8" height="6" rx="2" fill="rgba(255,255,255,0.4)"/>
      <rect x="20" y="18" width="8" height="6" rx="2" fill="rgba(255,255,255,0.4)"/>
      <rect x="31" y="18" width="8" height="6" rx="2" fill="rgba(255,255,255,0.4)"/>
      <circle cx="14" cy="35" r="4" fill="#1a1a2e" stroke="white" stroke-width="1.5"/>
      <circle cx="34" cy="35" r="4" fill="#1a1a2e" stroke="white" stroke-width="1.5"/>
      ${shortCode ? `<text x="24" y="26" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="Inter,sans-serif">${shortCode.slice(0,3)}</text>` : ''}
    </svg>
  `)}`;
};

export const createStopMarkerSVG = (label = '', color = '#D97706') => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 20 14 20s14-9.5 14-20C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="8" fill="white"/>
      <text x="14" y="18" text-anchor="middle" fill="${color}" font-size="9" font-weight="bold" font-family="Inter,sans-serif">${label}</text>
    </svg>
  `)}`;
};

export const interpolatePosition = (from, to, t) => ({
  lat: from.lat + (to.lat - from.lat) * t,
  lng: from.lng + (to.lng - from.lng) * t,
});

export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const dLng  = toRad(lng2 - lng1);
  const lat1R = toRad(lat1), lat2R = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export const getCapacityStatus = (current, total = 30) => {
  const pct = current / total;
  if (pct >= 1)   return { color: 'red',    label: 'Full' };
  if (pct >= 0.8) return { color: 'orange', label: 'Nearly full' };
  if (pct >= 0.5) return { color: 'yellow', label: 'Filling up' };
  return { color: 'green', label: 'Available' };
};
