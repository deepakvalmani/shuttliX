import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Silent token refresh on 401
let isRefreshing = false;
let queue = [];

const flush = (err, token) => {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
      }
      orig._retry  = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        flush(null, data.accessToken);
        return api(orig);
      } catch (e) {
        flush(e, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
