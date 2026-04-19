import { create } from 'zustand';

const useShuttleStore = create((set, get) => ({
  liveShuttles: {},   // { [shuttleId]: positionData }

  updateShuttlePosition: (pos) => {
    if (!pos?.shuttleId) return;
    set(state => ({
      liveShuttles: { ...state.liveShuttles, [pos.shuttleId]: pos },
    }));
  },

  setAllPositions: (positions) => {
    const map = {};
    (positions || []).forEach(p => { if (p?.shuttleId) map[p.shuttleId] = p; });
    set({ liveShuttles: map });
  },

  removeShuttle: (shuttleId) => {
    set(state => {
      const next = { ...state.liveShuttles };
      delete next[shuttleId];
      return { liveShuttles: next };
    });
  },

  updateCapacity: (shuttleId, passengerCount) => {
    set(state => {
      if (!state.liveShuttles[shuttleId]) return {};
      return {
        liveShuttles: {
          ...state.liveShuttles,
          [shuttleId]: { ...state.liveShuttles[shuttleId], passengerCount },
        },
      };
    });
  },

  clearAll: () => set({ liveShuttles: {} }),
}));

export default useShuttleStore;
