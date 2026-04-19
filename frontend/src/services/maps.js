/**
 * Haversine formula — straight-line distance between two lat/lng points
 * Returns distance in kilometers
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Estimate ETA (minutes) from shuttle to stop
 * Uses average shuttle speed of 25 km/h on campus
 */
export const estimateETA = (shuttleLat, shuttleLng, stopLat, stopLng, speedKmh = 25) => {
  const distKm = haversineDistance(shuttleLat, shuttleLng, stopLat, stopLng);
  const minutes = (distKm / speedKmh) * 60;
  return Math.max(1, Math.round(minutes));
};

/**
 * Format ETA for display
 */
export const formatETA = (minutes) => {
  if (minutes <= 0) return 'Arriving now';
  if (minutes === 1) return '1 min away';
  if (minutes < 60) return `${minutes} min away`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m away` : `${h}h away`;
};

/**
 * Format walking distance for display
 */
export const formatDistance = (km) => {
  if (km < 0.1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)} km away`;
};

/**
 * Get capacity status based on occupancy percentage
 */
export const getCapacityStatus = (current, total) => {
  if (!total) return { label: 'Unknown', color: 'gray', percent: 0, tailwindClass: 'bg-gray-500', textClass: 'text-gray-400' };
  const percent = (current / total) * 100;

  if (percent >= 100) return {
    label: 'Full',
    color: 'red',
    percent: 100,
    tailwindClass: 'bg-red-500',
    textClass: 'text-red-400',
    badgeClass: 'badge-red',
  };
  if (percent >= 80) return {
    label: 'Nearly full',
    color: 'orange',
    percent,
    tailwindClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    badgeClass: 'badge-orange',
  };
  if (percent >= 50) return {
    label: 'Filling up',
    color: 'yellow',
    percent,
    tailwindClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    badgeClass: 'badge-yellow',
  };
  return {
    label: 'Available',
    color: 'green',
    percent,
    tailwindClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    badgeClass: 'badge-green',
  };
};

/**
 * Interpolate between two positions for smooth marker animation
 */
export const interpolatePosition = (from, to, fraction) => ({
  lat: from.lat + (to.lat - from.lat) * fraction,
  lng: from.lng + (to.lng - from.lng) * fraction,
});

/**
 * Calculate bearing (heading) between two points in degrees
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/**
 * Creates a custom SVG shuttle marker icon for Google Maps
 */
export const createShuttleMarkerSVG = (heading = 0, color = '#1A56DB', isActive = true, shortCode = '') => {
  const label = shortCode ? shortCode.slice(0, 2) : '';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="60" viewBox="0 0 56 60">
      <!-- Drop shadow -->
      <ellipse cx="28" cy="57" rx="12" ry="3" fill="rgba(0,0,0,0.3)" />
      <!-- Bus body -->
      <rect x="8" y="12" width="40" height="30" rx="6" fill="${color}" />
      <!-- Windshield -->
      <rect x="12" y="6" width="32" height="12" rx="4" fill="rgba(255,255,255,0.88)" />
      <!-- Windows row -->
      <rect x="10" y="19" width="9" height="7" rx="2" fill="rgba(255,255,255,0.45)" />
      <rect x="23" y="19" width="10" height="7" rx="2" fill="rgba(255,255,255,0.45)" />
      <rect x="37" y="19" width="9" height="7" rx="2" fill="rgba(255,255,255,0.45)" />
      <!-- Wheels -->
      <circle cx="18" cy="44" r="5" fill="#0a1628" stroke="${color}" stroke-width="2" />
      <circle cx="38" cy="44" r="5" fill="#0a1628" stroke="${color}" stroke-width="2" />
      <!-- Short code label on bus body -->
      ${label ? `
        <rect x="16" y="27" width="24" height="12" rx="3" fill="rgba(255,255,255,0.2)" />
        <text x="28" y="37" text-anchor="middle" font-family="Inter,system-ui,sans-serif"
          font-size="10" font-weight="800" fill="white" letter-spacing="1">${label}</text>
      ` : ''}
      <!-- Live dot -->
      ${isActive ? `
        <circle cx="48" cy="8" r="6" fill="#10B981" stroke="#0D2137" stroke-width="2" />
        <circle cx="48" cy="8" r="3" fill="white" />
      ` : ''}
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};

/**
 * Creates a custom stop marker SVG
 */
export const createStopMarkerSVG = (label = '', color = '#D97706') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <filter id="drop-shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
      </filter>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" filter="url(#drop-shadow)" />
      <circle cx="18" cy="18" r="10" fill="rgba(0,0,0,0.2)" />
      <circle cx="18" cy="18" r="8" fill="white" />
      <text x="18" y="22" text-anchor="middle" font-family="Inter, sans-serif"
        font-size="9" font-weight="700" fill="${color}">${label}</text>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};