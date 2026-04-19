// ─── FIREBASE MESSAGING SERVICE ───────────────────────────────────────────────
// Handles FCM push notifications for the web app

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import api from './api';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let app = null;
let messaging = null;

export const initFirebase = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.info('FCM not supported in this browser');
      return null;
    }
    if (!firebaseConfig.apiKey) {
      console.info('Firebase config not set — push notifications disabled');
      return null;
    }
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.warn('Firebase init error:', err.message);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  try {
    if (!messaging) await initFirebase();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Notification permission denied');
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    await api.post('/auth/fcm-token', {
      token,
      device: `web-${navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'}`,
    });

    console.log('✅ FCM token registered');
    return token;
  } catch (err) {
    console.warn('FCM token error:', err.message);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('FCM foreground message:', payload);
    callback({
      title: payload.notification?.title || 'ShutliX',
      body: payload.notification?.body || '',
      data: payload.data || {},
    });
  });
};

export { messaging };