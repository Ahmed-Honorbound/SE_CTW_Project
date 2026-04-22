import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  filterDueSoonTasks,
  filterOverdueTasks,
  buildNotificationRecord,
  shouldCreateNotification,
  sortNotificationsDesc,
  computeUnreadCount,
  markNotificationsForTaskAsRead,
  removeNotificationsForTask,
  formatPushBody,
  isDueSoon,
} from '../../lib/notificationService';
import { Task, AppNotification as Notification, NotificationType, Priority, TaskStatus } from '../../lib/types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const arbNotificationType: fc.Arbitrary<NotificationType> = fc.constantFrom('due_soon', 'overdue');
const arbPriority: fc.Arbitrary<Priority> = fc.constantFrom('Low', 'Medium', 'High');
const arbTaskStatus: fc.Arbitrary<TaskStatus> = fc.constantFrom('Unstarted', 'In Progress', 'Complete', 'Overdue');

/** Produces a YYYY-MM-DD string from a random date */
const arbDateString: fc.Arbitrary<string> = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => d.toISOString().split('T')[0]);

/** Produces an ISO timestamp string */
const arbIsoTimestamp: fc.Arbitrary<string> = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => d.toISOString());

const arbTask: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  subject: fc.string({ minLength: 1, maxLength: 30 }),
  due_date: arbDateString,
  priority: arbPriority,
  status: arbTaskStatus,
  created_at: arbIsoTimestamp,
});

const arbNotification: fc.Arbitrary<Notification> = fc.record({
  id: fc.uuid(),
  task_id: fc.uuid(),
  task_name: fc.string({ minLength: 1, maxLength: 50 }),
  subject: fc.string({ minLength: 1, maxLength: 30 }),
  due_date: arbDateString,
  priority: arbPriority,
  type: arbNotificationType,
  read: fc.boolean(),
  created_at: arbIsoTimestamp,
});

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('Property-based tests: notificationService', () => {

  it('Property 1: filterDueSoonTasks — every returned task is due-soon and no qualifying task is omitted', () => {
    // Feature: notifications, Property 1: Due-soon filter correctness
    // Validates: Requirements 1.1
    fc.assert(fc.property(
      fc.array(arbTask, { maxLength: 20 }),
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
      (tasks, now) => {
        const result = filterDueSoonTasks(tasks, now);
        const dueSoonThresholdMs = 24 * 60 * 60 * 1000;
        const nowMs = now.getTime();

        // Every returned task must have correct status and due_date within next 24h
        for (const task of result) {
          expect(task.status === 'Unstarted' || task.status === 'In Progress').toBe(true);
          const taskDueMs = Date.parse(task.due_date + 'T00:00:00Z');
          expect(taskDueMs).toBeGreaterThan(nowMs);
          expect(taskDueMs).toBeLessThanOrEqual(nowMs + dueSoonThresholdMs);
        }

        // No qualifying task is omitted
        for (const task of tasks) {
          const taskDueMs = Date.parse(task.due_date + 'T00:00:00Z');
          const qualifies =
            (task.status === 'Unstarted' || task.status === 'In Progress') &&
            taskDueMs > nowMs &&
            taskDueMs <= nowMs + dueSoonThresholdMs;
          if (qualifies) {
            expect(result).toContain(task);
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('Property 2: filterOverdueTasks — every returned task has status Overdue and no Overdue task is omitted', () => {
    // Feature: notifications, Property 2: Overdue filter correctness
    // Validates: Requirements 2.1
    fc.assert(fc.property(
      fc.array(arbTask, { maxLength: 20 }),
      (tasks) => {
        const result = filterOverdueTasks(tasks);

        // Every returned task must have status 'Overdue'
        for (const task of result) {
          expect(task.status).toBe('Overdue');
        }

        // No task with status 'Overdue' is omitted
        for (const task of tasks) {
          if (task.status === 'Overdue') {
            expect(result).toContain(task);
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('Property 3: buildNotificationRecord — produces a complete record with correct fields', () => {
    // Feature: notifications, Property 3: Notification record completeness
    // Validates: Requirements 1.2, 2.2
    fc.assert(fc.property(
      arbTask,
      arbNotificationType,
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
      (task, type, now) => {
        const record = buildNotificationRecord(task, type, now);

        // All required fields present
        expect(record).toHaveProperty('task_id');
        expect(record).toHaveProperty('task_name');
        expect(record).toHaveProperty('subject');
        expect(record).toHaveProperty('due_date');
        expect(record).toHaveProperty('priority');
        expect(record).toHaveProperty('type');
        expect(record).toHaveProperty('read');
        expect(record).toHaveProperty('created_at');

        // read is always false
        expect(record.read).toBe(false);

        // type matches input
        expect(record.type).toBe(type);

        // task fields copied correctly
        expect(record.task_id).toBe(task.id);
        expect(record.task_name).toBe(task.name);
        expect(record.subject).toBe(task.subject);
        expect(record.due_date).toBe(task.due_date);
        expect(record.priority).toBe(task.priority);

        // created_at matches now
        expect(record.created_at).toBe(now.toISOString());
      }
    ), { numRuns: 100 });
  });

  it('Property 4: shouldCreateNotification — returns false when unread notification exists, true otherwise', () => {
    // Feature: notifications, Property 4: Deduplication prevents duplicate unread notifications
    // Validates: Requirements 1.3, 2.3
    fc.assert(fc.property(
      arbTask,
      arbNotificationType,
      fc.array(arbNotification, { maxLength: 10 }),
      (task, type, baseNotifications) => {
        // Case A: existing list contains at least one unread notification for this task+type
        const unreadMatch: Notification = {
          id: 'match-id',
          task_id: task.id,
          task_name: task.name,
          subject: task.subject,
          due_date: task.due_date,
          priority: task.priority,
          type,
          read: false,
          created_at: new Date().toISOString(),
        };
        const withUnread = [...baseNotifications, unreadMatch];
        expect(shouldCreateNotification(task, type, withUnread)).toBe(false);

        // Case B: no unread notification of that type for that task
        const withoutUnread = baseNotifications.map(n => {
          if (n.task_id === task.id && n.type === type) {
            return { ...n, read: true };
          }
          return n;
        });
        // Also ensure no accidental match from baseNotifications
        const noMatchAtAll = withoutUnread.filter(n => !(n.task_id === task.id && n.type === type && !n.read));
        expect(shouldCreateNotification(task, type, noMatchAtAll)).toBe(true);
      }
    ), { numRuns: 100 });
  });

  it('Property 5: sortNotificationsDesc — each notification created_at >= next one', () => {
    // Feature: notifications, Property 5: Notifications are sorted in descending order
    // Validates: Requirements 3.3
    fc.assert(fc.property(
      fc.array(arbNotification, { maxLength: 20 }),
      (notifications) => {
        const sorted = sortNotificationsDesc(notifications);
        for (let i = 0; i < sorted.length - 1; i++) {
          const curr = new Date(sorted[i].created_at).getTime();
          const next = new Date(sorted[i + 1].created_at).getTime();
          expect(curr).toBeGreaterThanOrEqual(next);
        }
      }
    ), { numRuns: 100 });
  });

  it('Property 6: computeUnreadCount — returns exactly the count of notifications where read === false', () => {
    // Feature: notifications, Property 6: Unread badge count reflects unread notifications
    // Validates: Requirements 4.2
    fc.assert(fc.property(
      fc.array(arbNotification, { maxLength: 20 }),
      (notifications) => {
        const count = computeUnreadCount(notifications);
        const expected = notifications.filter(n => n.read === false).length;
        expect(count).toBe(expected);
      }
    ), { numRuns: 100 });
  });

  it('Property 7: markNotificationsForTaskAsRead — unread count decreases by exactly one when task has exactly one unread', () => {
    // Feature: notifications, Property 7: Marking one notification as read decrements unread count by one
    // Validates: Requirements 4.6
    fc.assert(fc.property(
      fc.array(arbNotification, { maxLength: 20 }),
      fc.uuid(),
      (baseNotifications, taskId) => {
        // Build a list where taskId has exactly one unread notification
        const otherNotifications = baseNotifications.map(n =>
          n.task_id === taskId ? { ...n, read: true } : n
        );
        const singleUnread: Notification = {
          id: 'single-unread',
          task_id: taskId,
          task_name: 'Test Task',
          subject: 'Math',
          due_date: '2026-12-01',
          priority: 'Medium',
          type: 'due_soon',
          read: false,
          created_at: new Date().toISOString(),
        };
        const notifications = [...otherNotifications, singleUnread];

        const beforeCount = computeUnreadCount(notifications);
        const after = markNotificationsForTaskAsRead(notifications, taskId);
        const afterCount = computeUnreadCount(after);

        expect(afterCount).toBe(beforeCount - 1);
      }
    ), { numRuns: 100 });
  });

  it('Property 8: mark all as read — computeUnreadCount returns zero', () => {
    // Feature: notifications, Property 8: Mark all as read sets unread count to zero
    // Validates: Requirements 4.7
    fc.assert(fc.property(
      fc.array(arbNotification, { maxLength: 20 }),
      (notifications) => {
        const allRead = notifications.map(n => ({ ...n, read: true }));
        expect(computeUnreadCount(allRead)).toBe(0);
      }
    ), { numRuns: 100 });
  });

  it('Property 9: formatPushBody — output contains task_name, subject, and due_date', () => {
    // Feature: notifications, Property 9: Push notification body contains required task information
    // Validates: Requirements 5.3, 5.4
    fc.assert(fc.property(
      arbNotification,
      (notification) => {
        const body = formatPushBody(notification);
        expect(body).toContain(notification.task_name);
        expect(body).toContain(notification.subject);
        expect(body).toContain(notification.due_date);
      }
    ), { numRuns: 100 });
  });

  it('Property 10: markNotificationsForTaskAsRead — notifications for other tasks retain original read value', () => {
    // Feature: notifications, Property 10: Marking notifications for a task as read does not affect other tasks
    // Validates: Requirements 6.2
    fc.assert(fc.property(
      fc.uuid(),
      fc.array(arbNotification, { maxLength: 20 }),
      (taskId, notifications) => {
        const after = markNotificationsForTaskAsRead(notifications, taskId);

        for (let i = 0; i < notifications.length; i++) {
          if (notifications[i].task_id !== taskId) {
            expect(after[i].read).toBe(notifications[i].read);
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('Property 11: removeNotificationsForTask — no notification with taskId remains; all others are present and unchanged', () => {
    // Feature: notifications, Property 11: Removing notifications for a task leaves other tasks' notifications intact
    // Validates: Requirements 6.3
    fc.assert(fc.property(
      fc.uuid(),
      fc.array(arbNotification, { maxLength: 20 }),
      (taskId, notifications) => {
        const result = removeNotificationsForTask(notifications, taskId);

        // No notification with taskId remains
        for (const n of result) {
          expect(n.task_id).not.toBe(taskId);
        }

        // All notifications with a different task_id are present and unchanged
        const others = notifications.filter(n => n.task_id !== taskId);
        expect(result).toHaveLength(others.length);
        for (const original of others) {
          const found = result.find(n => n.id === original.id);
          expect(found).toBeDefined();
          expect(found).toEqual(original);
        }
      }
    ), { numRuns: 100 });
  });

});
