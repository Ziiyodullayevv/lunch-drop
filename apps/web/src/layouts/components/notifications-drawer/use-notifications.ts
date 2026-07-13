'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { rejectKitchenConnection, approveKitchenConnection, fetchKitchenConnectionRequests } from 'src/lib/api/kitchen-connections';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export type NotificationData = {
  id: string;
  type: string;
  title: string;
  subject: string;
  body: string | null;
  entity_id: string;
  is_read: boolean;
  created_at: string;
  action_status: 'pending' | 'approved' | 'rejected';
  // Admin arizasi uchun
  phone?: string;
  full_name?: string | null;
  entity_name?: string | null;
  role?: string;
  // Xodim arizasi uchun
  branch_id?: string | null;
};

const POLL_INTERVAL = 30_000;

// ----------------------------------------------------------------------

type PendingAdminRaw = {
  id: string;
  full_name: string | null;
  phone: string;
  role: 'kitchen_admin' | 'company_admin';
  account_status: string | null;
  entity_name?: string | null;
  created_at: string;
};

type PendingEmployeeRaw = {
  id: string;
  phone: string;
  name: string | null;
  branch_id: string | null;
  account_status: string | null;
  created_at: string;
};

// ----------------------------------------------------------------------

export function useNotifications() {
  const { user } = useAuthContext();
  const isSuperAdmin   = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const isKitchenAdmin = user?.role === 'kitchen_admin';

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);

  const readIds = useRef<Set<string>>(new Set());
  const actedNotifications = useRef<Map<string, NotificationData>>(new Map());

  // ── super_admin: admin arizalari ──────────────────────────────────────

  const buildAdminNotifications = useCallback(
    (pending: PendingAdminRaw[]): NotificationData[] =>
      pending.map((p) => {
        const type      = p.role === 'kitchen_admin' ? 'kitchen_pending' : 'company_pending';
        const roleLabel = p.role === 'kitchen_admin' ? 'oshxona admini' : 'kompaniya admini';
        const entityPart = p.entity_name ? ` — ${p.entity_name}` : '';
        return {
          id:         p.id,
          type,
          title:      `${p.full_name ?? p.phone}${entityPart} (${roleLabel}) tasdiqlash kutilmoqda`,
          subject:    p.entity_name ?? p.full_name ?? p.phone,
          body:       p.phone,
          entity_id:  p.id,
          is_read:    readIds.current.has(p.id),
          created_at: p.created_at,
          action_status: 'pending',
          phone:      p.phone,
          full_name:  p.full_name,
          entity_name: p.entity_name ?? null,
          role:       p.role,
        };
      }),
    []
  );

  // ── company_admin: xodim arizalari ────────────────────────────────────

  const buildEmployeeNotifications = useCallback(
    (pending: PendingEmployeeRaw[]): NotificationData[] =>
      pending.map((e) => ({
        id:         e.id,
        type:       'employee_pending',
        title:      `${e.name ?? e.phone} filialga qo'shilish so'rovi yubordi`,
        subject:    e.name ?? e.phone,
        body:       e.phone,
        entity_id:  e.id,
        is_read:    readIds.current.has(e.id),
        created_at: e.created_at,
        action_status: 'pending',
        phone:      e.phone,
        full_name:  e.name,
        branch_id:  e.branch_id,
      })),
    []
  );

  // ── fetch ─────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!isSuperAdmin && !isCompanyAdmin && !isKitchenAdmin) {
      setLoading(false);
      return;
    }

    try {
      if (isSuperAdmin) {
        const res  = await axiosInstance.get<PendingAdminRaw[]>(endpoints.superAdmin.pendingAdmins);
        const built = buildAdminNotifications(res.data ?? []);
        const merged = [
          ...built.map((item) => actedNotifications.current.get(item.id) ?? item),
          ...Array.from(actedNotifications.current.values()).filter(
            (acted) => !built.some((item) => item.id === acted.id)
          ),
        ];
        setNotifications(merged);
        setUnreadCount(merged.filter((n) => !n.is_read).length);
      } else if (isCompanyAdmin) {
        const res  = await axiosInstance.get<PendingEmployeeRaw[]>(endpoints.company.pendingEmployees);
        const built = buildEmployeeNotifications(res.data ?? []);
        const merged = [
          ...built.map((item) => actedNotifications.current.get(item.id) ?? item),
          ...Array.from(actedNotifications.current.values()).filter(
            (acted) => !built.some((item) => item.id === acted.id)
          ),
        ];
        setNotifications(merged);
        setUnreadCount(merged.filter((n) => !n.is_read).length);
      } else {
        const requests = await fetchKitchenConnectionRequests();
        const built = requests.filter((r) => r.status === 'pending').map((r) => ({
          id: r.id, type: 'kitchen_connection_pending',
          title: `${r.company_name} — ${r.branch_name}`, subject: r.company_name,
          body: r.branch_name, entity_id: r.id, is_read: readIds.current.has(r.id),
          created_at: r.created_at, action_status: 'pending' as const,
          entity_name: r.company_name,
        }));
        setNotifications(built);
        setUnreadCount(built.filter((n) => !n.is_read).length);
      }
    } catch {
      // jim turish
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isCompanyAdmin, isKitchenAdmin, buildAdminNotifications, buildEmployeeNotifications]);

  // ── markRead ──────────────────────────────────────────────────────────

  const markAsRead = useCallback((id: string) => {
    readIds.current.add(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      prev.forEach((n) => readIds.current.add(n.id));
      return prev.map((n) => ({ ...n, is_read: true }));
    });
    setUnreadCount(0);
  }, []);

  // ── super_admin: admin approve/decline ────────────────────────────────

  const approve = useCallback(async (id: string) => {
    try {
      await axiosInstance.patch(endpoints.superAdmin.approveAdmin(id));
      readIds.current.add(id);
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, is_read: true, action_status: 'approved' as const };
          actedNotifications.current.set(id, updated);
          return updated;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Admin tasdiqlandi');
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  }, []);

  const decline = useCallback(async (id: string) => {
    try {
      await axiosInstance.patch(endpoints.superAdmin.rejectAdmin(id));
      readIds.current.add(id);
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, is_read: true, action_status: 'rejected' as const };
          actedNotifications.current.set(id, updated);
          return updated;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Admin rad etildi');
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  }, []);

  // ── company_admin: xodim approve/decline ──────────────────────────────

  const approveEmployee = useCallback(async (id: string) => {
    try {
      await axiosInstance.patch(endpoints.company.employeeStatus(id), { status: 'approved' });
      readIds.current.add(id);
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, is_read: true, action_status: 'approved' as const };
          actedNotifications.current.set(id, updated);
          return updated;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Xodim tasdiqlandi');
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  }, []);

  const declineEmployee = useCallback(async (id: string) => {
    try {
      await axiosInstance.patch(endpoints.company.employeeStatus(id), { status: 'rejected' });
      readIds.current.add(id);
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, is_read: true, action_status: 'rejected' as const };
          actedNotifications.current.set(id, updated);
          return updated;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Xodim rad etildi');
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  }, []);

  // ── polling ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchNotifications();
    if (!isSuperAdmin && !isCompanyAdmin && !isKitchenAdmin) return undefined;
    const timer = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNotifications, isSuperAdmin, isCompanyAdmin]);

  // ── unified approve/decline (caller'ga roli yashirilgan) ──────────────

  const handleApprove = useCallback(
    (id: string) => (isSuperAdmin ? approve(id) : isKitchenAdmin ? approveKitchenConnection(id).then(() => markAsRead(id)) : approveEmployee(id)),
    [isSuperAdmin, isKitchenAdmin, approve, approveEmployee, markAsRead]
  );

  const handleDecline = useCallback(
    (id: string) => (isSuperAdmin ? decline(id) : isKitchenAdmin ? rejectKitchenConnection(id).then(() => markAsRead(id)) : declineEmployee(id)),
    [isSuperAdmin, isKitchenAdmin, decline, declineEmployee, markAsRead]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
    approve: handleApprove,
    decline: handleDecline,
    refetch: fetchNotifications,
  };
}
