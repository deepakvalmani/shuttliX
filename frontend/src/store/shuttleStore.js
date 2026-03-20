import { create } from 'zustand';
import api from '../services/api';

const useShuttleStore = create((set, get) => ({
  // Live shuttle positions from WebSocket
  liveShuttles: {},      // { shuttleId: positionData }
  offlineShuttles: [],   // shuttleIds that just went offline

  // Static data
  routes: [],
  stops: [],
  selectedShuttle: null,
  selectedRoute: null,

  // UI state
  isLoadingRoutes: false,
  isLoadingStops: false,
  lastUpdated: null,

  // ─── LIVE POSITION UPDATES (from WebSocket) ──────────────
  updateShuttlePosition: (positionData) => {
    set(state => ({
      liveShuttles: {
        ...state.liveShuttles,
        [positionData.shuttleId]: {
          ...positionData,
          receivedAt: Date.now(),
        },
      },
      lastUpdated: Date.now(),
    }));
  },

  setAllPositions: (positions) => {
    const mapped = {};
    positions.forEach(p => {
      mapped[p.shuttleId] = { ...p, receivedAt: Date.now() };
    });
    set({ liveShuttles: mapped, lastUpdated: Date.now() });
  },

  removeShuttle: (shuttleId) => {
    set(state => {
      const updated = { ...state.liveShuttles };
      delete updated[shuttleId];
      return {
        liveShuttles: updated,
        offlineShuttles: [...state.offlineShuttles, shuttleId],
      };
    });
    // Clear offline marker after 5s
    setTimeout(() => {
      set(state => ({
        offlineShuttles: state.offlineShuttles.filter(id => id !== shuttleId),
      }));
    }, 5000);
  },

  updateCapacity: (shuttleId, passengerCount) => {
    set(state => {
      if (!state.liveShuttles[shuttleId]) return state;
      return {
        liveShuttles: {
          ...state.liveShuttles,
          [shuttleId]: { ...state.liveShuttles[shuttleId], passengerCount },
        },
      };
    });
  },

  // ─── FETCH ROUTES ────────────────────────────────────────
  fetchRoutes: async () => {
    set({ isLoadingRoutes: true });
    try {
      const { data } = await api.get('/student/routes');
      set({ routes: data.data, isLoadingRoutes: false });
    } catch (err) {
      console.error('Failed to fetch routes:', err);
      set({ isLoadingRoutes: false });
    }
  },

  // ─── FETCH STOPS ─────────────────────────────────────────
  fetchStops: async () => {
    set({ isLoadingStops: true });
    try {
      const { data } = await api.get('/student/stops');
      set({ stops: data.data, isLoadingStops: false });
    } catch (err) {
      console.error('Failed to fetch stops:', err);
      set({ isLoadingStops: false });
    }
  },

  // ─── UI SELECTIONS ────────────────────────────────────────
  selectShuttle: (shuttle) => set({ selectedShuttle: shuttle }),
  selectRoute: (route) => set({ selectedRoute: route }),
  clearSelection: () => set({ selectedShuttle: null, selectedRoute: null }),

  // ─── GETTER: live shuttles as array ──────────────────────
  getLiveShuttlesArray: () => Object.values(get().liveShuttles),

  // ─── GETTER: get shuttle's route color ───────────────────
  getRouteForShuttle: (routeId) => {
    return get().routes.find(r => r._id === routeId) || null;
  },
}));

export default useShuttleStore;