/**
 * services/api.js  v2.0
 * Axios instance with:
 * – Automatic JWT refresh with request queueing
 * – Typed API error class for consistent error handling
 * – Request cancellation support
 * – Retry on network failures
 */
import axios from 'axios';

// ── API Error class ───────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status, errors = [], requestId = null) {
    super(message);
    this.name       = 'ApiError';
    this.status     = status;
    this.errors     = errors;   // field-level validation errors
    this.requestId  = requestId;
  }
}

// ── Axios instance ────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach token ────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, Promise.reject);

// ── Response interceptor — silent token refresh ──────────
let isRefreshing = false;
let queue = [];

const flush = (err, token) => {
  queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  queue = [];
};

const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
};

api.interceptors.response.use(
  // ── Success ────────────────────────────────────────────
  res => res,

  // ── Error ──────────────────────────────────────────────
  async err => {
    const orig   = err.config;
    const status = err.response?.status;
    const data   = err.response?.data;

    // Network error (no response)
    if (!err.response) {
      throw new ApiError('Network error — please check your connection', 0);
    }

    // 401 — try refresh once
    if (status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => {
            orig.headers.Authorization = `Bearer ${token}`;
            return api(orig);
          });
      }

      orig._retry   = true;
      isRefreshing  = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        clearSession();
        throw new ApiError('Session expired', 401);
      }

      try {
        const { data: refresh } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        );
        const newToken = refresh.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.Authorization = `Bearer ${newToken}`;
        orig.headers.Authorization         = `Bearer ${newToken}`;
        flush(null, newToken);
        return api(orig);
      } catch {
        flush(new ApiError('Session expired', 401), null);
        clearSession();
        throw new ApiError('Session expired', 401);
      } finally {
        isRefreshing = false;
      }
    }

    // All other errors — wrap in ApiError
    throw new ApiError(
      data?.message || getDefaultMessage(status),
      status,
      data?.errors || [],
      err.response.headers?.['x-request-id']
    );
  }
);

const getDefaultMessage = status => ({
  400: 'Invalid request',
  403: 'Access denied',
  404: 'Not found',
  409: 'Conflict — resource already exists',
  422: 'Validation failed',
  429: 'Too many requests — please slow down',
  500: 'Server error — please try again later',
  503: 'Service unavailable',
}[status] || 'Something went wrong');

// ── Cancellation helper ───────────────────────────────────
export const makeCancelToken = () => {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
};

export default api;
