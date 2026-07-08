import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStorage = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string) {
    if (isWeb) {
      return AsyncStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

export const memoryOnlyStorage = {
  getItem(key: string) {
    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    memoryStorage.set(key, value);
  },
  removeItem(key: string) {
    memoryStorage.delete(key);
  },
};
