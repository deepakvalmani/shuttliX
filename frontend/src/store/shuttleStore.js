import { create } from 'zustand';
import api from '../services/api';

const useShuttleStore = create((set, get) => ({
  liveShuttles:  {},
  routes:        [],
  stops:         [],
  selectedShuttle: null,
  isLoadingRoutes: false,
  isLoadingStops:  false,
  lastUpdated: null,

  updateShuttlePosition: pos =>
    set(s => ({
      liveShuttles: { ...s.liveShuttles, [pos.shuttleId]: { ...pos, receivedAt: Date.now() } },
      lastUpdated: Date.now(),
    })),

  setAllPositions: positions => {
    const mapped = {};
    positions.forEach(p => { mapped[p.shuttleId] = { ...p, receivedAt: Date.now() }; });
    set({ liveShuttles: mapped, lastUpdated: Date.now() });
  },

  removeShuttle: shuttleId => {
    set(s => {
      const next = { ...s.liveShuttles };
      delete next[shuttleId];
      return { liveShuttles: next };
    });
  },

  updateCapacity: (shuttleId, passengerCount) =>
    set(s => {
      if (!s.liveShuttles[shuttleId]) return s;
      return {
        liveShuttles: {
          ...s.liveShuttles,
          [shuttleId]: { ...s.liveShuttles[shuttleId], passengerCount },
        },
      };
    }),

  fetchRoutes: async () => {
    set({ isLoadingRoutes: true });
    try {
      const { data } = await api.get('/student/routes');
      set({ routes: data.data, isLoadingRoutes: false });
    } catch { set({ isLoadingRoutes: false }); }
  },

  fetchStops: async () => {
    set({ isLoadingStops: true });
    try {
      const { data } = await api.get('/student/stops');
      set({ stops: data.data, isLoadingStops: false });
    } catch { set({ isLoadingStops: false }); }
  },

  selectShuttle: shuttle => set({ selectedShuttle: shuttle }),
  getLiveShuttlesArray: () => Object.values(get().liveShuttles),
  getRouteForShuttle: routeId => get().routes.find(r => r._id === routeId) || null,
}));

export default useShuttleStore;
