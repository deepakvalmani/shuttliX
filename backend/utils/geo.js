/**
 * Haversine — returns distance in kilometres
 */
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
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
 * Estimate ETA in minutes between two lat/lng points
 * Uses average speed if not provided
 */
const etaMinutes = (lat1, lng1, lat2, lng2, speedKmh = 25) => {
  const dist = haversine(lat1, lng1, lat2, lng2);
  return Math.max(1, Math.round((dist / speedKmh) * 60));
};

module.exports = { haversine, etaMinutes };
