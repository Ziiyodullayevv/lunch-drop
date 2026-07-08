import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken } from './api/auth';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }

  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');

  if (!Device.isDevice) {
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await savePushToken(token.data);

  return token.data;
}

export async function scheduleLocalOrderNotification(title: string, body: string) {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }

  const Notifications = await import('expo-notifications');

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: null,
  });
}
