import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import toast from 'react-hot-toast';

const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { updateShuttlePosition, setAllPositions, removeShuttle, updateCapacity } = useShuttleStore();
  const socketRef = useRef(null);
  const hasJoinedRef = useRef(false);

  const joinOrganization = useCallback(() => {
    const socket = getSocket();
    if (!socket || !user?.organizationId || hasJoinedRef.current) return;
    socket.emit('join:organization', { organizationId: user.organizationId });
    hasJoinedRef.current = true;
  }, [user?.organizationId]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      hasJoinedRef.current = false;
      joinOrganization();
    });
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      hasJoinedRef.current = false;
    });
    socket.on('connect_error', (err) => console.warn('⚠️ Socket connection error:', err.message));

    socket.on('shuttle:position', updateShuttlePosition);
    socket.on('shuttle:allPositions', setAllPositions);
    socket.on('shuttle:offline', ({ shuttleId }) => removeShuttle(shuttleId));
    socket.on('shuttle:capacity', ({ shuttleId, passengerCount }) => updateCapacity(shuttleId, passengerCount));

    socket.on('shuttle:delay', (data) => {
      toast(data.message || 'A shuttle is delayed', {
        icon: '⚠️',
        duration: 6000,
        style: { background: '#78350F', color: '#FDE68A', border: '1px solid #92400E' },
      });
    });
    socket.on('shuttle:emergency', (data) => {
      toast.error('🆘 Emergency reported on campus. Authorities notified.', { duration: 10000 });
    });
    socket.on('admin:announcement', ({ message, type }) => {
      if (type === 'danger') toast.error(message, { duration: 10000 });
      else if (type === 'success') toast.success(message, { duration: 8000 });
      else toast(message, { duration: 8000 });
    });
    if (user.role === 'admin' || user.role === 'superadmin') {
      socket.on('emergency:sos', (data) => {
        toast.error(
          `🆘 DRIVER SOS — Shuttle ${data.shuttleId?.slice(-4)} at ${data.location?.lat?.toFixed(4)}, ${data.location?.lng?.toFixed(4)}`,
          { duration: 30000 }
        );
      });
    }

    if (!socket.connected) socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('shuttle:position');
      socket.off('shuttle:allPositions');
      socket.off('shuttle:offline');
      socket.off('shuttle:capacity');
      socket.off('shuttle:delay');
      socket.off('shuttle:emergency');
      socket.off('admin:announcement');
      socket.off('emergency:sos');
      disconnectSocket();
    };
  }, [isAuthenticated, user?.organizationId, user?.role]);

  const emitLocation = useCallback((data) => getSocket()?.emit('driver:location', data), []);
  const emitPassengerCount = useCallback((shuttleId, count) => getSocket()?.emit('driver:passengerCount', { shuttleId, count }), []);
  const emitDelay = useCallback((shuttleId, routeId, estimatedDelay, message) => getSocket()?.emit('driver:delay', { shuttleId, routeId, estimatedDelay, message }), []);
  const emitEmergency = useCallback((shuttleId, lat, lng) => getSocket()?.emit('driver:emergency', { shuttleId, lat, lng }), []);
  const emitStartTrip = useCallback((tripId, shuttleId, routeId) => getSocket()?.emit('driver:startTrip', { tripId, shuttleId, routeId }), []);
  const emitEndTrip = useCallback((shuttleId, tripId) => getSocket()?.emit('driver:endTrip', { shuttleId, tripId }), []);
  const emitAdminBroadcast = useCallback((organizationId, message, type) => getSocket()?.emit('admin:broadcast', { organizationId, message, type }), []);

  return {
    socket: socketRef.current,
    emitLocation,
    emitPassengerCount,
    emitDelay,
    emitEmergency,
    emitStartTrip,
    emitEndTrip,
    emitAdminBroadcast,
    joinOrganization,
  };
};

export default useSocket;