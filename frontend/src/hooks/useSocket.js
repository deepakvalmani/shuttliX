import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import toast from 'react-hot-toast';

const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { updateShuttlePosition, setAllPositions, removeShuttle, updateCapacity } = useShuttleStore();
  const joined = useRef(false);

  const joinOrganization = useCallback(() => {
    const s = getSocket();
    if (!s || !user?.organizationId || joined.current) return;
    s.emit('join:organization', { organizationId: user.organizationId });
    joined.current = true;
  }, [user?.organizationId]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = connectSocket();

    socket.on('connect', () => {
      joined.current = false;
      joinOrganization();
    });
    socket.on('disconnect', () => { joined.current = false; });

    // Shuttle positions
    socket.on('shuttle:position',     updateShuttlePosition);
    socket.on('shuttle:allPositions', setAllPositions);
    socket.on('shuttle:offline',      ({ shuttleId }) => removeShuttle(shuttleId));
    socket.on('shuttle:capacity',     ({ shuttleId, passengerCount }) => updateCapacity(shuttleId, passengerCount));

    // Alerts
    socket.on('shuttle:delay', data => {
      toast(`⏱ Delay: ${data.message || 'A shuttle is delayed'}`, {
        icon: '⚠️', duration: 8000,
        style: { background: '#1A0E00', color: '#FDE68A', border: '1px solid #78350F' },
      });
    });

    socket.on('shuttle:emergency', () => {
      toast.error('🆘 Emergency reported on campus!', { duration: 10000 });
    });

    socket.on('admin:announcement', ({ message, type }) => {
      const styles = {
        danger:  { background: '#1A0000', color: '#FCA5A5', border: '1px solid #7F1D1D' },
        success: { background: '#001A0A', color: '#6EE7B7', border: '1px solid #065F46' },
        warning: { background: '#1A0E00', color: '#FDE68A', border: '1px solid #78350F' },
        info:    { background: '#0A0015', color: '#C4B5FD', border: '1px solid #4C1D95' },
      };
      toast(message, {
        duration: 8000,
        style: styles[type] || styles.info,
      });
    });

    socket.on('geofence:arrived', ({ stopName }) => {
      toast(`🚏 Shuttle arrived at ${stopName}`, { duration: 5000, icon: '📍' });
    });

    socket.on('route:updated', () => {
      toast('🗺 Route updated by admin', { duration: 4000 });
    });

    if (user.role === 'admin' || user.role === 'superadmin') {
      socket.on('emergency:sos', data => {
        toast.error(
          `🆘 DRIVER SOS — lat:${data.location?.lat?.toFixed(4)}, lng:${data.location?.lng?.toFixed(4)}`,
          { duration: 30000 }
        );
      });
      socket.on('student:report', data => {
        toast(`📢 ${data.studentName}: ${data.type}`, { icon: '🚨', duration: 10000 });
      });
    }

    if (!socket.connected) socket.connect();

    return () => {
      [
        'connect','disconnect','shuttle:position','shuttle:allPositions',
        'shuttle:offline','shuttle:capacity','shuttle:delay','shuttle:emergency',
        'admin:announcement','geofence:arrived','route:updated',
        'emergency:sos','student:report',
      ].forEach(e => socket.off(e));
      disconnectSocket();
    };
  }, [isAuthenticated, user?.organizationId, user?.role]);

  const emit = useCallback((event, data) => getSocket()?.emit(event, data), []);

  return {
    joinOrganization,
    emitLocation:       data  => emit('driver:location', data),
    emitPassengerCount: (id, count) => emit('driver:passengerCount', { shuttleId: id, count }),
    emitDelay:          (sid, rid, delay, msg) => emit('driver:delay', { shuttleId: sid, routeId: rid, estimatedDelay: delay, message: msg }),
    emitEmergency:      (sid, lat, lng) => emit('driver:emergency', { shuttleId: sid, lat, lng }),
    emitStartTrip:      (tid, sid, rid) => emit('driver:startTrip', { tripId: tid, shuttleId: sid, routeId: rid }),
    emitEndTrip:        (sid, tid) => emit('driver:endTrip', { shuttleId: sid, tripId: tid }),
    emitBroadcast:      (orgId, msg, type) => emit('admin:broadcast', { organizationId: orgId, message: msg, type }),
  };
};

export default useSocket;
