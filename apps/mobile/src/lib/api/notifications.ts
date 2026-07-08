import { apiClient } from './client';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationsPage = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
};

export async function listNotifications(params?: { is_read?: boolean; limit?: number; offset?: number }): Promise<NotificationsPage> {
  const res = await apiClient.get<NotificationsPage>('/notifications', { params });
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return res.data.count;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const res = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllRead(): Promise<number> {
  const res = await apiClient.patch<{ count: number }>('/notifications/read-all');
  return res.data.count;
}
