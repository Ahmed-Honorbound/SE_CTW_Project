import { describe, it, expect } from 'vitest';

import {
  isDueSoon,
  buildNotificationRecord,
  shouldCreateNotification,
  formatPushBody,
} from '../../lib/notificationService';
import { Task, AppNotification as Notification } from '../../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Test Task',
    subject: 'Math',
    due_date: '2026-12-01',
    priority: 'Medium',
    status: 'Unstarted',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    task_id: 'task-1',
    task_name: 'Test Task',
    subject: 'Math',
    due_date: '2026-12-01',
    priority: 'Medium',
    type: 'due_soon',
    read: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── isDueSoon ────────────────────────────────────────────────────────────────

describe('isDueSoon', () => {
  it('returns true when task is due exactly at the 24-hour boundary (inclusive upper bound)', () => {
    // now = 2026-12-01T00:00:00Z
    // due_date = 2026-12-02 → taskDueMs = 2026-12-02T00:00:00Z = now + exactly 24h
    const now = new Date('2026-12-01T00:00:00Z');
    const task = makeTask({ due_date: '2026-12-02', status: 'Unstarted' });
    expect(isDueSoon(task, now)).toBe(true);
  });

  it('returns false when task is due 1ms past the 24-hour boundary', () => {
    // now = 2026-12-01T00:00:00.001Z → taskDueMs = 2026-12-02T00:00:00Z < now + 24h - 1ms
    // Actually: now + 24h = 2026-12-02T00:00:00.001Z, taskDueMs = 2026-12-02T00:00:00.000Z
    // taskDueMs <= now + 24h → true... so we need now to be 1ms AFTER midnight
    // now = 2026-12-01T00:00:00.001Z, due = 2026-12-02 → taskDueMs = 2026-12-02T00:00:00Z
    // now + 24h = 2026-12-02T00:00:00.001Z → taskDueMs (2026-12-02T00:00:00Z) <= that → still true
    // To get false: due_date must be > now + 24h
    // now = 2026-12-01T00:00:00Z, due = 2026-12-03 → taskDueMs = 2026-12-03T00:00:00Z > now + 24h
    // But the task says "1ms past boundary" — let's use a now that is 1ms after midnight so
    // taskDueMs (next day midnight) is no longer within the window.
    // now = 2026-12-01T00:00:00.001Z, due = 2026-12-02 → taskDueMs = 2026-12-02T00:00:00.000Z
    // now + 24h = 2026-12-02T00:00:00.001Z → taskDueMs <= now+24h → true (still in window)
    // The boundary is: taskDueMs <= now + 24h. "1ms past" means now is 1ms later than the exact boundary.
    // Exact boundary: now such that now + 24h = taskDueMs → now = taskDueMs - 24h
    // 1ms past: now = taskDueMs - 24h + 1ms → now + 24h = taskDueMs + 1ms → taskDueMs < now + 24h → still true
    // Actually "1ms past boundary" means the due date is 1ms beyond the 24h window:
    // taskDueMs = now + 24h + 1ms → taskDueMs > now + 24h → false
    // We can't represent sub-millisecond in due_date (YYYY-MM-DD), so we use a now that is
    // 1ms before midnight of the day after tomorrow, making due_date = day after tomorrow out of range.
    // Simplest: now = 2026-12-01T00:00:00.001Z, due_date = 2026-12-03 (48h away) → false
    // But the spec says "1ms past 24h boundary". Let's interpret: due is exactly 24h+1ms from now.
    // Use now = new Date(taskDueMs - 24*60*60*1000 - 1) where taskDueMs = Date.parse('2026-12-02T00:00:00Z')
    const taskDueMs = Date.parse('2026-12-02T00:00:00Z');
    const now = new Date(taskDueMs - 24 * 60 * 60 * 1000 - 1); // 1ms before the exact 24h window start
    // now + 24h = taskDueMs - 1ms → taskDueMs > now + 24h → false
    const task = makeTask({ due_date: '2026-12-02', status: 'Unstarted' });
    expect(isDueSoon(task, now)).toBe(false);
  });

  it('returns false when task due_date is in the past', () => {
    const now = new Date('2026-12-10T00:00:00Z');
    const task = makeTask({ due_date: '2026-12-01', status: 'Unstarted' });
    expect(isDueSoon(task, now)).toBe(false);
  });

  it('returns false when task status is Complete even if due_date is within 24h', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const task = makeTask({ due_date: '2026-12-02', status: 'Complete' });
    expect(isDueSoon(task, now)).toBe(false);
  });

  it('returns false when task status is Overdue', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const task = makeTask({ due_date: '2026-12-02', status: 'Overdue' });
    expect(isDueSoon(task, now)).toBe(false);
  });
});

// ─── buildNotificationRecord ──────────────────────────────────────────────────

describe('buildNotificationRecord', () => {
  it('read is always false', () => {
    const task = makeTask();
    const now = new Date('2026-12-01T00:00:00Z');
    const record = buildNotificationRecord(task, 'due_soon', now);
    expect(record.read).toBe(false);
  });

  it('read is false for overdue type as well', () => {
    const task = makeTask({ status: 'Overdue' });
    const now = new Date('2026-12-01T00:00:00Z');
    const record = buildNotificationRecord(task, 'overdue', now);
    expect(record.read).toBe(false);
  });
});

// ─── shouldCreateNotification ─────────────────────────────────────────────────

describe('shouldCreateNotification', () => {
  it('returns false when an unread notification exists for the same task and type', () => {
    const task = makeTask({ id: 'task-1' });
    const existing = [makeNotification({ task_id: 'task-1', type: 'due_soon', read: false })];
    expect(shouldCreateNotification(task, 'due_soon', existing)).toBe(false);
  });

  it('returns true when only read notifications exist for the same task and type', () => {
    const task = makeTask({ id: 'task-1' });
    const existing = [makeNotification({ task_id: 'task-1', type: 'due_soon', read: true })];
    expect(shouldCreateNotification(task, 'due_soon', existing)).toBe(true);
  });

  it('returns true when no notifications exist for that task', () => {
    const task = makeTask({ id: 'task-1' });
    const existing: Notification[] = [];
    expect(shouldCreateNotification(task, 'due_soon', existing)).toBe(true);
  });

  it('returns true when unread notification exists for same task but different type', () => {
    const task = makeTask({ id: 'task-1' });
    const existing = [makeNotification({ task_id: 'task-1', type: 'overdue', read: false })];
    expect(shouldCreateNotification(task, 'due_soon', existing)).toBe(true);
  });

  it('returns true when unread notification exists for different task but same type', () => {
    const task = makeTask({ id: 'task-1' });
    const existing = [makeNotification({ task_id: 'task-2', type: 'due_soon', read: false })];
    expect(shouldCreateNotification(task, 'due_soon', existing)).toBe(true);
  });
});

// ─── formatPushBody ───────────────────────────────────────────────────────────

describe('formatPushBody', () => {
  it('output contains task_name, subject, and due_date', () => {
    const notification = makeNotification({
      task_name: 'Finish Essay',
      subject: 'English',
      due_date: '2026-12-15',
    });
    const body = formatPushBody(notification);
    expect(body).toContain('Finish Essay');
    expect(body).toContain('English');
    expect(body).toContain('2026-12-15');
  });

  it('output contains all three fields for overdue type', () => {
    const notification = makeNotification({
      task_name: 'Lab Report',
      subject: 'Chemistry',
      due_date: '2026-11-30',
      type: 'overdue',
    });
    const body = formatPushBody(notification);
    expect(body).toContain('Lab Report');
    expect(body).toContain('Chemistry');
    expect(body).toContain('2026-11-30');
  });
});
