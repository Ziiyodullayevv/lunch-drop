import { requireNativeModule } from 'expo-modules-core';

let LiveActivityNative: any = null;
try {
  LiveActivityNative = requireNativeModule('LiveActivity');
} catch {
  // Expo Go da native module mavjud emas — no-op
}

export type LiveActivityParams = {
  orderId: string;
  itemCount: number;
  status: 'cooking' | 'ready' | 'delivered';
  kitchenName: string;
  estimatedTime: string;
};

export const LiveActivity = {
  isSupported(): boolean {
    return LiveActivityNative?.isSupported?.() ?? false;
  },

  async start(params: LiveActivityParams): Promise<string | null> {
    return LiveActivityNative?.startActivity(params) ?? null;
  },

  async update(activityId: string, params: Omit<LiveActivityParams, 'orderId' | 'itemCount'>): Promise<void> {
    return LiveActivityNative?.updateActivity(activityId, params);
  },

  async end(activityId: string): Promise<void> {
    return LiveActivityNative?.endActivity(activityId);
  },
};
