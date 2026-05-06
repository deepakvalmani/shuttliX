/**
 * nominatim.js
 * OpenStreetMap Nominatim geocoding — free, no API key needed.
 * Rate limit: 1 req/sec on public server. We cache + debounce.
 */

const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'ShutliX/1.0' };

// Simple in-memory cache (5 min TTL)
const _cache = new Map();
const TTL = 5 * 60 * 1000;

async function _fetch(url) {
  const now = Date.now();
  if (_cache.has(url)) {
    const { data, ts } = _cache.get(url);
    if (now - ts < TTL) return data;
  }
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  _cache.set(url, { data, ts: now });
  return data;
}

/**
 * Forward geocode — text query → [{label, sublabel, lat, lng, boundingBox}]
 */
export async function searchPlaces(query, limit = 6) {
  if (!query || query.trim().length < 2) return [];
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=${limit}&addressdetails=1`;
  const results = await _fetch(url);
  return results.map(r => ({
    label: r.display_name.split(',')[0],
    sublabel: r.display_name.split(',').slice(1, 3).join(',').trim(),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    fullAddress: r.display_name,
    boundingBox: r.boundingbox?.map(Number),
  }));
}

/**
 * Reverse geocode — {lat,lng} → address string
 */
export async function reverseGeocode(lat, lng) {
  const url = `${BASE}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`;
  const r = await _fetch(url);
  return {
    label: r.name || r.display_name.split(',')[0],
    fullAddress: r.display_name,
    address: r.address,
  };
}

/**
 * Single result geocode (for Enter-key search)
 */
export async function geocodeQuery(query) {
  const results = await searchPlaces(query, 1);
  return results[0] || null;
}
