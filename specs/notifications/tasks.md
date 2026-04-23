# Implementation Plan: Notifications

## Overview

Implement the Notifications feature for Study Buddy by adding a `notificationService.ts` module with pure evaluation logic and Supabase I/O, a `NotificationBell` component for the in-app panel, and wiring everything into the existing `Taskboard` and `Navbar` components. Notifications are evaluated client-side on dashboard mount and persisted in a new Supabase `notifications` table.

## Tasks

- [x] 1. Add Notification types and create the Supabase table
  - Add `NotificationType`, `Notification` interface to `lib/types.ts`
  - Run the SQL DDL from the design to create the `notifications` table and indexes in Supabase
  - _Requirements: 3.1, 3.2_

- [x] 2. Implement pure evaluation functions in `lib/notificationService.ts`
  - [x] 2.1 Implement `isDueSoon`, `filterDueSoonTasks`, and `filterOverdueTasks`
    - `isDueSoon`: check status is `'Unstarted'` or `'In Progress'` and `due_date` falls within the next 24 hours using the formula in the design
    - `filterDueSoonTasks`: return all tasks where `isDueSoon` is true
    - `filterOverdueTasks`: return all tasks where `status === 'Overdue'`
    - _Requirements: 1.1, 2.1_

  - [ ]* 2.2 Write property test for `filterDueSoonTasks` (Property 1)
    - **Property 1: Due-soon filter correctness**
    - **Validates: Requirements 1.1**

  - [ ]* 2.3 Write property test for `filterOverdueTasks` (Property 2)
    - **Property 2: Overdue filter correctness**
    - **Validates: Requirements 2.1**

  - [x] 2.4 Implement `buildNotificationRecord` and `shouldCreateNotification`
    - `buildNotificationRecord`: construct an `Omit<Notification, 'id'>` from a task, type, and `now` date with `read: false`
    - `shouldCreateNotification`: return `false` if `existing` contains any unread notification matching `task_id` and `type`; otherwise `true`
    - _Requirements: 1.2, 1.3, 2.2, 2.3_

  - [ ]* 2.5 Write property test for `buildNotificationRecord` (Property 3)
    - **Property 3: Notification record completeness**
    - **Validates: Requirements 1.2, 2.2**

  - [ ]* 2.6 Write property test for `shouldCreateNotification` (Property 4)
    - **Property 4: Deduplication prevents duplicate unread notifications**
    - **Validates: Requirements 1.3, 2.3**

  - [x] 2.7 Implement `sortNotificationsDesc`, `computeUnreadCount`, `markNotificationsForTaskAsRead`, `removeNotificationsForTask`, and `formatPushBody`
    - `sortNotificationsDesc`: sort by `created_at` descending
    - `computeUnreadCount`: count notifications where `read === false`
    - `markNotificationsForTaskAsRead`: return new array with `read: true` for all notifications matching `taskId`
    - `removeNotificationsForTask`: return new array excluding all notifications matching `taskId`
    - `formatPushBody`: return a string containing `task_name`, `subject`, and `due_date`
    - _Requirements: 3.3, 4.2, 4.6, 4.7, 5.3, 5.4, 6.2, 6.3_

  - [ ]* 2.8 Write property test for `sortNotificationsDesc` (Property 5)
    - **Property 5: Notifications are sorted in descending order**
    - **Validates: Requirements 3.3**

  - [ ]* 2.9 Write property test for `computeUnreadCount` (Property 6)
    - **Property 6: Unread badge count reflects unread notifications**
    - **Validates: Requirements 4.2**

  - [ ]* 2.10 Write property test for `markNotificationsForTaskAsRead` — single task decrement (Property 7)
    - **Property 7: Marking one notification as read decrements unread count by one**
    - **Validates: Requirements 4.6**

  - [ ]* 2.11 Write property test for mark-all-as-read (Property 8)
    - **Property 8: Mark all as read sets unread count to zero**
    - **Validates: Requirements 4.7**

  - [ ]* 2.12 Write property test for `formatPushBody` (Property 9)
    - **Property 9: Push notification body contains required task information**
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 2.13 Write property test for `markNotificationsForTaskAsRead` — isolation (Property 10)
    - **Property 10: Marking notifications for a task as read does not affect other tasks**
    - **Validates: Requirements 6.2**

  - [ ]* 2.14 Write property test for `removeNotificationsForTask` (Property 11)
    - **Property 11: Removing notifications for a task leaves other tasks' notifications intact**
    - **Validates: Requirements 6.3**

- [x] 3. Checkpoint — Ensure all pure-function tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement I/O functions in `lib/notificationService.ts`
  - [x] 4.1 Implement `fetchNotifications`, `createNotification`, `markAsRead`, `markAllAsRead`, `markNotificationsReadForTask`, and `deleteNotificationsForTask`
    - Follow the same Supabase error-handling pattern as `taskService.ts` (check `error`, throw `new Error(error.message)`)
    - `fetchNotifications`: select all from `notifications` ordered by `created_at` descending
    - `createNotification`: insert record and return the created row
    - `markAsRead`: update `read = true` for a single notification id
    - `markAllAsRead`: update `read = true` for all rows
    - `markNotificationsReadForTask`: update `read = true` where `task_id` matches
    - `deleteNotificationsForTask`: delete all rows where `task_id` matches
    - _Requirements: 3.1, 3.2, 3.3, 4.6, 4.7, 6.2, 6.3_

  - [x] 4.2 Implement `requestPushPermission` and `dispatchPushNotification`
    - Guard both functions with `typeof window !== 'undefined' && 'Notification' in window`; return silently if unsupported
    - `requestPushPermission`: call `Notification.requestPermission()` and return
    - `dispatchPushNotification`: only fire if `Notification.permission === 'granted'`; use `formatPushBody` for the body; set title to `"Task Due Soon"` or `"Task Overdue"` based on `notification.type`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 Implement `evaluateNotifications`
    - Fetch existing notifications once, then for each due-soon and overdue task call `shouldCreateNotification`; if true, call `createNotification` then `dispatchPushNotification`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.1_

  - [ ]* 4.4 Write unit tests for `isDueSoon` edge cases
    - Task due exactly at the 24-hour boundary (inclusive/exclusive)
    - Task with `due_date` in the past returns `false`
    - _Requirements: 1.1_

  - [ ]* 4.5 Write unit tests for `shouldCreateNotification`, `evaluateNotifications`, `dispatchPushNotification`, and `requestPushPermission`
    - `shouldCreateNotification`: returns `false` when unread notification exists; `true` when only read notifications exist
    - `evaluateNotifications`: calls `dispatchPushNotification` only when permission is `'granted'`
    - `dispatchPushNotification`: does not throw when `window.Notification` is undefined
    - `requestPushPermission`: does not throw when `window.Notification` is undefined
    - _Requirements: 1.3, 2.3, 5.1, 5.2, 5.5_

- [x] 5. Build the `NotificationBell` component
  - [x] 5.1 Create `app/components/NotificationBell.tsx`
    - `'use client'` component with internal state: `notifications`, `isOpen`, `loading`
    - On mount: call `requestPushPermission` then `fetchNotifications`; derive unread count via `computeUnreadCount`
    - Render a bell icon button; show a badge with the unread count when count > 0
    - Toggle `isOpen` on bell click
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Implement the notification panel inside `NotificationBell`
    - When `isOpen` is true, render a panel listing all notifications ordered by `created_at` desc (use `sortNotificationsDesc`)
    - Each item shows: task name, subject, due date, priority, notification type, and relative time since creation
    - Show "No notifications yet." when the list is empty
    - Clicking an item calls `markAsRead` and updates local state
    - "Mark all as read" button calls `markAllAsRead` and updates local state
    - Catch errors from `fetchNotifications` and render a silent fallback (no panel, no badge)
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [ ]* 5.3 Write component tests for `NotificationBell` in `tests/notifications/NotificationBell.test.tsx`
    - Bell icon renders
    - Badge visible when unread count > 0; hidden when count is 0
    - Panel toggles open/closed on click
    - "No notifications yet." shown when list is empty
    - `markAsRead` called when a notification item is clicked
    - `markAllAsRead` called when "Mark all as read" is clicked
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 6. Wire `NotificationBell` into `Navbar` and integrate `evaluateNotifications` into `Taskboard`
  - [x] 6.1 Update `app/components/Navbar.tsx`
    - Add `'use client'` directive
    - Import and render `<NotificationBell />` inside the navbar items
    - _Requirements: 4.1_

  - [x] 6.2 Update `app/components/Taskboard.tsx`
    - After `detectAndMarkOverdue` resolves and the updated task list is available, call `evaluateNotifications(updated)`
    - _Requirements: 6.1_

  - [x] 6.3 Update `deleteTask` call sites in `Taskboard` to also call `deleteNotificationsForTask(task.id)` before or after deleting the task
    - Locate the delete handler in `TaskCard` or `Taskboard` and add the cleanup call
    - _Requirements: 6.3_

  - [x] 6.4 Update `updateTaskStatus` call sites to call `markNotificationsReadForTask(task.id)` when the new status is `'Complete'`
    - _Requirements: 6.2_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already a project dependency) with a minimum of 100 runs each
- Component tests use `@testing-library/react` (already a project dependency)
- All property tests live in `tests/notifications/notificationService.property.test.ts`
- All unit tests live in `tests/notifications/notificationService.unit.test.ts`
- The Supabase `notifications` table DDL must be run manually in the Supabase dashboard before testing I/O functions
