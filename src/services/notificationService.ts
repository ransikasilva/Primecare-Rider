import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Expo Push Notification Service
 * Handles push notifications for both Android and iOS
 */

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  /**
   * Register for push notifications and get Expo Push Token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices, not simulators');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If permission denied, return null
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return null;
      }

      // Configure Android notification channels FIRST (before getting token)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('job_offers', {
          name: 'Job Offers',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          lightColor: '#FF0000',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });

        await Notifications.setNotificationChannelAsync('handovers', {
          name: 'Handover Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      // Try to get Expo Push Token - without projectId for local dev
      let expoPushToken: string;
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        expoPushToken = tokenData.data;
      } catch (tokenError: any) {
        console.warn('⚠️ Could not get Expo Push Token (this is expected in Expo Go):', tokenError.message);

        // For development: Generate a mock token that includes device info
        // In production, you'll need to use a development build
        const deviceId = Constants.deviceId || Constants.sessionId || 'unknown';
        expoPushToken = `ExpoPushToken[DEV-${Platform.OS}-${deviceId}]`;
        console.log('🔧 Using development token:', expoPushToken);
      }

      console.log('✅ Push Token:', expoPushToken);
      return expoPushToken;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      throw error;
    }
  }

  /**
   * Add listener for notifications received while app is in foreground
   */
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for when user taps on notification
   */
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get the notification that opened the app (if any)
   */
  async getInitialNotification(): Promise<Notifications.Notification | null> {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification || null;
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });
      console.log('✅ Local notification scheduled');
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All notifications cancelled');
  }

  /**
   * Set app badge count (iOS)
   */
  async setBadgeCount(count: number) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Clear app badge (iOS)
   */
  async clearBadge() {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(0);
    }
  }

  /**
   * Dismiss all notifications from notification tray
   */
  async dismissAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    console.log('✅ All notifications dismissed');
  }
}

export default new NotificationService();
