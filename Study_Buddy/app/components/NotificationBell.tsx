'use client';

import React, { useEffect, useState } from 'react';
import { Notification as AppNotification } from '../../lib/types';
import {
  fetchNotifications,
  requestPushPermission,
  markAsRead,
  markAllAsRead,
  computeUnreadCount,
  sortNotificationsDesc,
} from '../../lib/notificationService';
import '../styles/NotificationBell.css';

type Notification = AppNotification;

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell(): JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function init() {
      try {
        await requestPushPermission();
        const data = await fetchNotifications();
        setNotifications(data);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const unreadCount = computeUnreadCount(notifications);
  const sorted = sortNotificationsDesc(notifications);

  function handleBellClick() {
    setIsOpen((prev) => !prev);
  }

  async function handleNotificationClick(notification: Notification) {
    if (notification.read) return;
    try {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    } catch {
      // silent failure
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent failure
    }
  }

  if (loading) {
    return (
      <div className="notification-bell">
        <button className="bell-button" aria-label="Notifications" aria-expanded={false} disabled>
          🔔
        </button>
      </div>
    );
  }

  return (
    <div className="notification-bell">
      <button
        className="bell-button"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={handleBellClick}
      >
        🔔
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-panel"
          role="region"
          aria-label="Notifications panel"
        >
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>

          {sorted.length === 0 ? (
            <p className="no-notifications">No notifications yet.</p>
          ) : (
            sorted.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-item-header">
                  <span className="notification-task-name">{notification.task_name}</span>
                  <span className="notification-relative-time">
                    {relativeTime(notification.created_at)}
                  </span>
                </div>
                <div className="notification-details">
                  <span
                    className={`notification-type-badge ${
                      notification.type === 'due_soon' ? 'due-soon' : 'overdue'
                    }`}
                  >
                    {notification.type === 'due_soon' ? 'Due Soon' : 'Overdue'}
                  </span>
                  {notification.subject} · Due {notification.due_date} · {notification.priority}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
