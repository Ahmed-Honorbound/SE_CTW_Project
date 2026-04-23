export function requestPushPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

export function dispatchPushNotification(title: string, body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: '/icons/notification-icon.png',
  });
}

export function computeUnreadCount(notifications: Array<{ read: boolean }>): number {
  return notifications.filter(notification => !notification.read).length;
}

export function sortNotificationsDesc<T extends { created_at: string }>(
  notifications: T[]
): T[] {
  return [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
