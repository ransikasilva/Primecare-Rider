// Test notification registration
import notificationService from './src/services/notificationService';

async function test() {
  const token = await notificationService.registerForPushNotifications();
  console.log('🔔 EXPO PUSH TOKEN:', token);
  alert('Push Token: ' + token);
}

test();
