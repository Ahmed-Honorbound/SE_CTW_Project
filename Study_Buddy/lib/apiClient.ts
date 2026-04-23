import type { Task, TaskFormValues, Subtask, TimeSession, CompletionRecord, AppNotification } from './types';
import type { CalendarEvent, CalendarEventFormValues } from './calendarUtils';
import type { RawAnalyticsData, Suggestions } from './analyticsUtils';
import { dispatchPushNotification } from './notificationUtils';
import { createBrowserClient } from "@supabase/ssr";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (payload as any)?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return payload as T;
}

// ─── Calendar API client ────────────────────────────────────────────────────

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>('/api/calendar/events');
}

export async function createCalendarEvent(values: CalendarEventFormValues): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/api/calendar/events', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export async function updateCalendarEvent(id: string, values: CalendarEventFormValues): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/calendar/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiFetch<void>(`/api/calendar/events/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchWeeklyGoal(): Promise<number | null> {
  return apiFetch<number | null>('/api/calendar/weekly-goal');
}

export async function upsertWeeklyGoal(goal: number): Promise<void> {
  await apiFetch<void>('/api/calendar/weekly-goal', {
    method: 'PUT',
    body: JSON.stringify({ goal }),
  });
}

// ─── Task API client ───────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  return apiFetch<Task[]>('/api/tasks');
}

export async function fetchTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${id}`);
}

export async function createTask(values: TaskFormValues): Promise<Task> {
  return apiFetch<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export async function updateTask(id: string, values: Partial<TaskFormValues>): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch<void>(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function recordCompletion(taskId: string, dueDate: string): Promise<CompletionRecord> {
  return apiFetch<CompletionRecord>(`/api/tasks/${taskId}/completion`, {
    method: 'POST',
    body: JSON.stringify({ dueDate }),
  });
}

export async function uncompleteTask(taskId: string): Promise<void> {
  await apiFetch<void>(`/api/tasks/${taskId}/uncomplete`, {
    method: 'POST',
  });
}

export async function startTimeSession(taskId: string): Promise<TimeSession> {
  return apiFetch<TimeSession>(`/api/tasks/${taskId}/timer/start`, {
    method: 'POST',
  });
}

export async function stopTimeSession(sessionId: string): Promise<TimeSession> {
  return apiFetch<TimeSession>(`/api/tasks/timer/stop`, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export async function addSubtask(taskId: string, name: string, description?: string): Promise<Subtask> {
  return apiFetch<Subtask>(`/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function toggleSubtask(subtaskId: string, completed: boolean): Promise<void> {
  await apiFetch<void>(`/api/tasks/subtasks/${subtaskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export async function updateSubtask(subtaskId: string, name: string, description?: string): Promise<void> {
  await apiFetch<void>(`/api/tasks/subtasks/${subtaskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, description }),
  });
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  await apiFetch<void>(`/api/tasks/subtasks/${subtaskId}`, {
    method: 'DELETE',
  });
}

// ─── Notification API client ───────────────────────────────────────────────

export async function fetchNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>('/api/notifications');
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiFetch<void>(`/api/notifications/${id}`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiFetch<void>('/api/notifications', {
    method: 'PATCH',
  });
}

export async function deleteNotificationsForTask(taskId: string): Promise<void> {
  await apiFetch<void>(`/api/notifications/task/${taskId}`, {
    method: 'DELETE',
  });
}

export async function markNotificationsReadForTask(taskId: string): Promise<void> {
  await apiFetch<void>(`/api/notifications/task/${taskId}`, {
    method: 'PATCH',
  });
}

export async function evaluateNotifications(tasks: Task[]): Promise<void> {
  const createdNotifications = await apiFetch<AppNotification[]>('/api/notifications/evaluate', {
    method: 'POST',
    body: JSON.stringify({ tasks }),
  });

  createdNotifications.forEach((notification) => {
    dispatchPushNotification(
      notification.task_name,
      `Due ${notification.due_date} • ${notification.subject}`
    );
  });
}

// ─── Analytics API client ──────────────────────────────────────────────────

export async function fetchAnalyticsData(): Promise<RawAnalyticsData> {
  return apiFetch<RawAnalyticsData>('/api/analytics');
}
// --- Sign in ----

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type { RawAnalyticsData, Suggestions };
