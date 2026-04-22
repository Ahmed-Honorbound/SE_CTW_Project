import { Task, AppNotification, NotificationType } from './types';
import { supabase } from './supabase';

type Notification = AppNotification;

/**
 * Returns true if the task is due within the next 24 hours from `now`
 * and has a status of 'Unstarted' or 'In Progress'.
 *
 * Formula:
 *   taskDueMs = Date.parse(task.due_date + 'T00:00:00Z')
 *   isDueSoon = taskDueMs > now.getTime() && taskDueMs <= now.getTime() + 24*60*60*1000
 */
export function isDueSoon(task: Task, now: Date): boolean {
  if (task.status !== 'Unstarted' && task.status !== 'In Progress') {
    return false;
  }
  const taskDueMs = Date.parse(task.due_date + 'T00:00:00Z');
  const nowMs = now.getTime();
  const dueSoonThresholdMs = 24 * 60 * 60 * 1000;
  return taskDueMs > nowMs && taskDueMs <= nowMs + dueSoonThresholdMs;
}

/**
 * Returns all tasks where isDueSoon is true.
 */
export function filterDueSoonTasks(tasks: Task[], now: Date): Task[] {
  return tasks.filter((task) => isDueSoon(task, now));
}

/**
 * Returns all tasks where status === 'Overdue'.
 */
export function filterOverdueTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status === 'Overdue');
}

/**
 * Constructs a notification record (without an id) from a task, type, and timestamp.
 * The `read` field is always false for newly created notifications.
 */
export function buildNotificationRecord(
  task: Task,
  type: NotificationType,
  now: Date
): Omit<Notification, 'id'> {
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

/**
 * Returns false if `existing` already contains an unread notification
 * for the same task and type (deduplication check).
 * Returns true if it is safe to create a new notification.
 */
export function shouldCreateNotification(
  task: Task,
  type: NotificationType,
  existing: Notification[]
): boolean {
  return !existing.some(
    (n) => n.task_id === task.id && n.type === type && n.read === false
  );
}

/**
 * Returns a new array of notifications sorted by `created_at` descending (newest first).
 * Does not mutate the input array.
 */
export function sortNotificationsDesc(notifications: Notification[]): Notification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Returns the count of notifications where `read === false`.
 */
export function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => n.read === false).length;
}

/**
 * Returns a new array where all notifications with `task_id === taskId`
 * have `read: true`. Notifications for other tasks are unchanged.
 */
export function markNotificationsForTaskAsRead(
  notifications: Notification[],
  taskId: string
): Notification[] {
  return notifications.map((n) =>
    n.task_id === taskId ? { ...n, read: true } : n
  );
}

/**
 * Returns a new array excluding all notifications where `task_id === taskId`.
 */
export function removeNotificationsForTask(
  notifications: Notification[],
  taskId: string
): Notification[] {
  return notifications.filter((n) => n.task_id !== taskId);
}

/**
 * Returns a formatted string containing the notification's task_name, subject, and due_date.
 * Format: "<task_name> · <subject> · Due <due_date>"
 */
export function formatPushBody(notification: Notification): string {
  return `${notification.task_name} · ${notification.subject} · Due ${notification.due_date}`;
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

/**
 * Fetches all notifications ordered by created_at descending.
 */
export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Notification[];
}

/**
 * Inserts a new notification record and returns the created row.
 */
export async function createNotification(
  record: Omit<Notification, 'id'>
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Notification;
}

/**
 * Marks a single notification as read by id.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw new Error(error.message);
}

/**
 * Marks all notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .not('id', 'is', null);

  if (error) throw new Error(error.message);
}

/**
 * Marks all notifications for a given task as read.
 */
export async function markNotificationsReadForTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('task_id', taskId);

  if (error) throw new Error(error.message);
}

/**
 * Deletes all notifications for a given task.
 */
export async function deleteNotificationsForTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('task_id', taskId);

  if (error) throw new Error(error.message);
}

// ─── Browser Push ─────────────────────────────────────────────────────────────

/**
 * Requests browser push notification permission.
 * No-ops in non-browser environments or when the Notification API is unavailable.
 */
export async function requestPushPermission(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  await Notification.requestPermission();
}

/**
 * Dispatches a browser push notification for the given notification record.
 * No-ops if permission is not granted or the Notification API is unavailable.
 */
export function dispatchPushNotification(notification: Notification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title =
    notification.type === 'due_soon' ? 'Task Due Soon' : 'Task Overdue';
  const body = formatPushBody(notification);
  new Notification(title, { body });
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Evaluates the current task list and creates notifications for due-soon and
 * overdue tasks that don't already have an unread notification.
 * Errors are caught and logged silently so the dashboard is never broken.
 */
export async function evaluateNotifications(tasks: Task[]): Promise<void> {
  try {
    const now = new Date();
    const existing = await fetchNotifications();
    const dueSoon = filterDueSoonTasks(tasks, now);
    const overdue = filterOverdueTasks(tasks);

    for (const task of dueSoon) {
      if (shouldCreateNotification(task, 'due_soon', existing)) {
        const created = await createNotification(
          buildNotificationRecord(task, 'due_soon', now)
        );
        dispatchPushNotification(created);
      }
    }

    for (const task of overdue) {
      if (shouldCreateNotification(task, 'overdue', existing)) {
        const created = await createNotification(
          buildNotificationRecord(task, 'overdue', now)
        );
        dispatchPushNotification(created);
      }
    }
  } catch (err) {
    console.error('[evaluateNotifications]', err);
  }
}
