import type { SupabaseClient } from '@supabase/supabase-js';
import { Task, AppNotification, NotificationType } from './types';

type Db = SupabaseClient;
type Notification = AppNotification;

export function isDueSoon(task: Task, now: Date): boolean {
  if (task.status !== 'Unstarted' && task.status !== 'In Progress') {
    return false;
  }
  const taskDueMs = Date.parse(task.due_date + 'T00:00:00Z');
  const nowMs = now.getTime();
  const dueSoonThresholdMs = 24 * 60 * 60 * 1000;
  return taskDueMs > nowMs && taskDueMs <= nowMs + dueSoonThresholdMs;
}

export function filterDueSoonTasks(tasks: Task[], now: Date): Task[] {
  return tasks.filter((task) => isDueSoon(task, now));
}

export function filterOverdueTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status === 'Overdue');
}

export function buildNotificationRecord(
  task: Task,
  type: NotificationType,
  now: Date
): Omit<Notification, 'id' | 'user_id'> {
  return {
    task_id: task.id,
    task_name: task.name,
    subject: task.subject,
    due_date: task.due_date,
    priority: task.priority,
    type,
    read: false,
    created_at: now.toISOString(),
  };
}

export function shouldCreateNotification(
  task: Task,
  type: NotificationType,
  existing: Notification[]
): boolean {
  return !existing.some(
    (n) => n.task_id === task.id && n.type === type && n.read === false
  );
}

export function sortNotificationsDesc(notifications: Notification[]): Notification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => n.read === false).length;
}

export function markNotificationsForTaskAsRead(
  notifications: Notification[],
  taskId: string
): Notification[] {
  return notifications.map((n) =>
    n.task_id === taskId ? { ...n, read: true } : n
  );
}

export function removeNotificationsForTask(
  notifications: Notification[],
  taskId: string
): Notification[] {
  return notifications.filter((n) => n.task_id !== taskId);
}

export function formatPushBody(notification: Notification): string {
  return `${notification.task_name} · ${notification.subject} · Due ${notification.due_date}`;
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

export async function fetchNotifications(supabase: Db, userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

export async function createNotification(
  supabase: Db,
  record: Omit<Notification, 'id' | 'user_id'>,
  userId: string
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...record, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Notification;
}

export async function markAsRead(supabase: Db, notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw new Error(error.message);
}

export async function markAllAsRead(supabase: Db, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function markNotificationsReadForTask(supabase: Db, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('task_id', taskId);

  if (error) throw new Error(error.message);
}

export async function deleteNotificationsForTask(supabase: Db, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('task_id', taskId);

  if (error) throw new Error(error.message);
}

// ─── Browser Push ─────────────────────────────────────────────────────────────

export async function requestPushPermission(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  await Notification.requestPermission();
}

export function dispatchPushNotification(notification: Notification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title =
    notification.type === 'due_soon' ? 'Task Due Soon' : 'Task Overdue';
  const body = formatPushBody(notification);
  new Notification(title, { body });
}
