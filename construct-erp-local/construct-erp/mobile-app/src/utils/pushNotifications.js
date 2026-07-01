import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { notificationsAPI } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// IMPORTANT: the backend (backend/src/services/fcm.service.js) sends push via
// the Firebase Admin SDK directly to raw FCM/APNs device tokens — it does NOT
// go through Expo's push relay. So this MUST request the native device token
// (getDevicePushTokenAsync), not an Expo push token (getExpoPushTokenAsync) —
// those are a different, incompatible token format and Firebase Admin will
// reject them. On Android this requires google-services.json for the same
// Firebase project as the backend's FIREBASE_SERVICE_ACCOUNT to be present
// (see mobile-app/app.json — googleServicesFile) and an EAS/dev build (this
// does not work inside Expo Go).
//
// Registers this device and hands the token to the backend
// (POST /notifications/devices, table: notification_device_tokens).
// Call after a successful login. Safe to call repeatedly — the backend
// upserts on (user_id, token).
export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) return; // push tokens aren't available on simulators

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      // Channel id must match the one fcm.service.js sends with (`erp-alerts`)
      // or the notification may not display with the right priority/sound.
      await Notifications.setNotificationChannelAsync('erp-alerts', {
        name: 'ERP Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await notificationsAPI.registerDevice(token, Platform.OS);
  } catch (err) {
    // Push registration must never block login/app usage.
    console.warn('[push] registration failed:', err.message);
  }
}

// Call when a notification is tapped (foreground or from a killed/background
// state) to deep-link to the relevant screen. `onNavigate` receives the
// `data.link` string that the backend attached to the notification.
export function addNotificationResponseListener(onNavigate) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const link = response.notification.request.content.data?.link;
    if (link) onNavigate(link);
  });
}
