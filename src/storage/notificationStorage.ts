import { AppNotification, NotificationType, NotificationStatus, NotificationStage, ScreenId } from "../types";

export const NOTIFICATIONS_STORAGE_KEY = "keylink360_notifications";
export const DISMISSED_STORAGE_KEY = "keylink360_dismissed_notifications";
const MAX_NOTIFICATIONS = 60;

export function getDismissedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function addDismissedNotificationId(id: string): void {
  try {
    const set = getDismissedNotificationIds();
    set.add(id);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearDismissedNotificationIds(): void {
  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY);
  } catch {}
}

function readNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || localStorage.getItem("keyslink_notifications");
    if (!raw) return [];
    const list = JSON.parse(raw) as AppNotification[];
    const dismissed = getDismissedNotificationIds();

    // Filter out dismissed notifications and legacy robotic noise
    return list.filter((n) => {
      if (!n || !n.id) return false;
      if (dismissed.has(n.id)) return false;
      // Filter out legacy robotic auditor strings
      if (
        n.id.startsWith("truth_missing_") ||
        n.message?.includes("Responsive layout active") ||
        n.message?.includes("76.76.21.21") ||
        n.message?.includes("Total delivered views: 0")
      ) {
        return false;
      }
      return true;
    });
  } catch {
    return [];
  }
}

export function writeNotifications(notifications: AppNotification[]): void {
  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS))
  );
}

export function getAllNotifications(): AppNotification[] {
  return readNotifications();
}

export function getUnreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}

export interface CreateNotificationInput {
  id?: string;
  type: NotificationType;
  status?: NotificationStatus;
  stage?: NotificationStage;
  title: string;
  message: string;
  targetScreen?: ScreenId;
  actionLabel?: string;
  meta?: Record<string, string>;
  createdAt?: string;
}

export function createNotification(input: CreateNotificationInput): AppNotification {
  return {
    id: input.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    status: input.status || "completed",
    stage: input.stage || "workspace_activity",
    title: input.title,
    message: input.message,
    read: false,
    createdAt: input.createdAt || new Date().toISOString(),
    targetScreen: input.targetScreen,
    actionLabel: input.actionLabel,
    meta: input.meta
  };
}

export function prependNotification(
  notifications: AppNotification[],
  input: CreateNotificationInput
): AppNotification[] {
  // If notification with exact same ID exists, update it rather than duplicating
  const filtered = input.id ? notifications.filter((n) => n.id !== input.id) : notifications;
  const next = [createNotification(input), ...filtered];
  writeNotifications(next);
  return next.slice(0, MAX_NOTIFICATIONS);
}

export function markNotificationRead(
  notifications: AppNotification[],
  id: string
): AppNotification[] {
  const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  writeNotifications(next);
  return next;
}

export function markAllNotificationsRead(notifications: AppNotification[]): AppNotification[] {
  const next = notifications.map((n) => ({ ...n, read: true }));
  writeNotifications(next);
  return next;
}

export function deleteNotification(
  notifications: AppNotification[],
  id: string
): AppNotification[] {
  addDismissedNotificationId(id);
  const next = notifications.filter((n) => n.id !== id);
  writeNotifications(next);
  return next;
}

export function clearAllNotifications(notifications: AppNotification[] = []): AppNotification[] {
  for (const n of notifications) {
    if (n.id) addDismissedNotificationId(n.id);
  }
  writeNotifications([]);
  return [];
}
