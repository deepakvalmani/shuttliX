/**
 * hooks/useSocket.js  v2.0
 * – Tracks connection status in state (show offline banner)
 * – Re-joins org room on every reconnect automatically
 * – Proper event cleanup with named handler refs
 * – Emits typed socket events via stable callbacks
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import toast from 'react-hot-toast';

const ANNOUNCEMENT_STYLES = {
  danger:  { background: '#1A0000', color: '#FCA5A5', border: '1px solid #7F1D1D' },
  success: { background: '#001A0A', color: '#6EE7B7', border: '1px solid #065F46' },
  warning: { background: '#1A0E00', color: '#FDE68A', border: '1px solid #78350F' },
  info:    { background: '#0A0015', color: '#C4B5FD', border: '1px solid #4C1D95' },
};

const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();
  const {
    updateShuttlePosition, setAllPositions, removeShuttle, updateCapacity,
  } = useShuttleStore();

  const [isConnected,  setIsConnected]  = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const joinedRef = useRef(false);

  // ── Join org room ─────────────────────────────────────
  const joinOrganization = useCallback(() => {
    const s = getSocket();
    const orgId = user?.organizationId?._id ?? user?.organizationId;
    if (!s?.connected || !orgId || joinedRef.current) return;
    s.emit('join:organization', { organizationId: orgId });
    joinedRef.current = true;
  }, [user?.organizationId]);

  // ── Effect ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = connectSocket();

    // ── Connection events ─────────────────────────────
    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      joinedRef.current = false;
      joinOrganization();
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      joinedRef.current = false;
      if (reason === 'io server disconnect') {
        // Server disconnected us — likely auth issue, don't auto-reconnect
        console.warn('[Socket] Server disconnected:', reason);
      }
    };

    const onReconnectAttempt = () => setIsReconnecting(true);
    const onReconnect        = () => { setIsReconnecting(false); joinOrganization(); };
    const onReconnectFailed  = () => {
      setIsReconnecting(false);
      toast.error('Lost connection to server. Please refresh.', { duration: 0, id: 'socket-fail' });
    };

    // ── Shuttle events ────────────────────────────────
    const onPosition     = updateShuttlePosition;
    const onAllPositions = setAllPositions;
    const onOffline      = ({ shuttleId }) => removeShuttle(shuttleId);
    const onCapacity     = ({ shuttleId, passengerCount }) => updateCapacity(shuttleId, passengerCount);

    // ── Notification events ───────────────────────────
    const onDelay = data => {
      toast(`⏱ Delay reported: ${data.message || 'A shuttle is delayed'}`, {
        icon: '⚠️', duration: 8000,
        style: ANNOUNCEMENT_STYLES.warning,
      });
    };

    const onEmergency = () => {
      toast.error('🆘 Emergency reported on campus!', { duration: 10000, id: 'emergency' });
    };

    const onAnnouncement = ({ message, type }) => {
      toast(message, {
        duration: 8000,
        style: ANNOUNCEMENT_STYLES[type] || ANNOUNCEMENT_STYLES.info,
      });
    };

    const onGeofenceArrived = ({ stopName }) => {
      toast(`🚏 Shuttle arrived at ${stopName}`, { duration: 5000, icon: '📍' });
    };

    const onRouteUpdated = () => toast('🗺 Route updated by admin', { duration: 4000 });

    // ── Admin-only events ─────────────────────────────
    const onSOS = data => {
      if (!['admin', 'superadmin'].includes(user.role)) return;
      toast.error(
        `🆘 DRIVER SOS — ${data.location?.lat?.toFixed(4)}, ${data.location?.lng?.toFixed(4)}`,
        { duration: 0, id: 'driver-sos' }
      );
    };

    const onStudentReport = data => {
      if (!['admin', 'superadmin'].includes(user.role)) return;
      toast(`📢 ${data.studentName}: ${data.type}`, { icon: '🚨', duration: 10000 });
    };

    // ── Bind events ───────────────────────────────────
    socket.on('connect',             onConnect);
    socket.on('disconnect',          onDisconnect);
    socket.on('reconnect_attempt',   onReconnectAttempt);
    socket.on('reconnect',           onReconnect);
    socket.on('reconnect_failed',    onReconnectFailed);
    socket.on('shuttle:position',    onPosition);
    socket.on('shuttle:allPositions',onAllPositions);
    socket.on('shuttle:offline',     onOffline);
    socket.on('shuttle:capacity',    onCapacity);
    socket.on('shuttle:delay',       onDelay);
    socket.on('shuttle:emergency',   onEmergency);
    socket.on('admin:announcement',  onAnnouncement);
    socket.on('geofence:arrived',    onGeofenceArrived);
    socket.on('route:updated',       onRouteUpdated);
    socket.on('emergency:sos',       onSOS);
    socket.on('student:report',      onStudentReport);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off('connect',             onConnect);
      socket.off('disconnect',          onDisconnect);
      socket.off('reconnect_attempt',   onReconnectAttempt);
      socket.off('reconnect',           onReconnect);
      socket.off('reconnect_failed',    onReconnectFailed);
      socket.off('shuttle:position',    onPosition);
      socket.off('shuttle:allPositions',onAllPositions);
      socket.off('shuttle:offline',     onOffline);
      socket.off('shuttle:capacity',    onCapacity);
      socket.off('shuttle:delay',       onDelay);
      socket.off('shuttle:emergency',   onEmergency);
      socket.off('admin:announcement',  onAnnouncement);
      socket.off('geofence:arrived',    onGeofenceArrived);
      socket.off('route:updated',       onRouteUpdated);
      socket.off('emergency:sos',       onSOS);
      socket.off('student:report',      onStudentReport);
      disconnectSocket();
    };
  }, [isAuthenticated, user?.organizationId, user?.role]);

  // ── Stable emit helpers ───────────────────────────────
  const emit = useCallback((event, data) => getSocket()?.emit(event, data), []);

  return {
    isConnected,
    isReconnecting,
    joinOrganization,
    emitLocation:       (data)               => emit('driver:location',      data),
    emitPassengerCount: (shuttleId, count)   => emit('driver:passengerCount',{ shuttleId, count }),
    emitDelay:          (sid, rid, delay, msg) => emit('driver:delay',       { shuttleId: sid, routeId: rid, estimatedDelay: delay, message: msg }),
    emitEmergency:      (sid, lat, lng)      => emit('driver:emergency',     { shuttleId: sid, lat, lng }),
    emitStartTrip:      (tid, sid, rid)      => emit('driver:startTrip',     { tripId: tid, shuttleId: sid, routeId: rid }),
    emitEndTrip:        (sid, tid)           => emit('driver:endTrip',       { shuttleId: sid, tripId: tid }),
    emitBroadcast:      (orgId, msg, type)   => emit('admin:broadcast',      { organizationId: orgId, message: msg, type }),
  };
};

export default useSocket;
