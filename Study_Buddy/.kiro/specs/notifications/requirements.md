# Requirements Document

## Introduction

The Notifications feature adds proactive, student-focused alerts to Study Buddy. When a task is approaching its due date or has become overdue, the system surfaces a notification both inside the app (via a persistent notification panel accessible from the navbar) and as a browser push notification. All notifications are stored so students can review them at any time. This feature builds on the existing task data model — specifically `due_date`, `status`, and `priority` — without requiring changes to the Supabase schema beyond a new `notifications` table.

---

## Glossary

- **Notification_Service**: The client-side module responsible for evaluating tasks, generating notification records, and dispatching browser push notifications.
- **Notification_Store**: The Supabase `notifications` table that persists notification records.
- **Notification_Panel**: The in-app UI component (accessible via a bell icon in the Navbar) that displays stored notifications.
- **Push_Manager**: The browser's Web Push API used to deliver browser-level push notifications.
- **Due-Soon Threshold**: A configurable window of time before a task's `due_date` within which a "due soon" notification is triggered. Default: 24 hours.
- **Task**: An existing entity with fields `id`, `name`, `subject`, `due_date` (YYYY-MM-DD), `priority`, and `status`.
- **Unread Count**: The number of notifications whose `read` field is `false`.

---

## Requirements

### Requirement 1: Detect Due-Soon Tasks

**User Story:** As a student, I want to be notified when a task is due within 24 hours, so that I have enough time to complete it before the deadline.

#### Acceptance Criteria

1. WHEN the Notification_Service evaluates tasks, THE Notification_Service SHALL identify all tasks whose `due_date` falls within the next 24 hours and whose `status` is `Unstarted` or `In Progress`.
2. WHEN a due-soon task is identified and no unread due-soon notification already exists for that task, THE Notification_Service SHALL create a notification record in the Notification_Store with `type` set to `"due_soon"`, `task_id`, `task_name`, `subject`, `due_date`, `priority`, `read` set to `false`, and `created_at` set to the current timestamp.
3. IF a due-soon notification already exists in the Notification_Store for a given `task_id` with `read` set to `false`, THEN THE Notification_Service SHALL NOT create a duplicate notification for that task.

---

### Requirement 2: Detect Overdue Tasks

**User Story:** As a student, I want to be notified when a task becomes overdue, so that I am aware of missed deadlines and can take action.

#### Acceptance Criteria

1. WHEN the Notification_Service evaluates tasks, THE Notification_Service SHALL identify all tasks whose `status` is `Overdue`.
2. WHEN an overdue task is identified and no unread overdue notification already exists for that task, THE Notification_Service SHALL create a notification record in the Notification_Store with `type` set to `"overdue"`, `task_id`, `task_name`, `subject`, `due_date`, `priority`, `read` set to `false`, and `created_at` set to the current timestamp.
3. IF an overdue notification already exists in the Notification_Store for a given `task_id` with `read` set to `false`, THEN THE Notification_Service SHALL NOT create a duplicate notification for that task.

---

### Requirement 3: Persist Notifications

**User Story:** As a student, I want my notifications to be saved, so that I can review past alerts even after dismissing them or reloading the page.

#### Acceptance Criteria

1. THE Notification_Store SHALL persist each notification record with the fields: `id` (UUID), `task_id`, `task_name`, `subject`, `due_date`, `priority`, `type` (`"due_soon"` or `"overdue"`), `read` (boolean), and `created_at` (ISO timestamp).
2. WHEN a notification record is created, THE Notification_Store SHALL assign a unique `id` to the record.
3. THE Notification_Service SHALL retrieve all notification records from the Notification_Store ordered by `created_at` descending.

---

### Requirement 4: Display In-App Notification Panel

**User Story:** As a student, I want to see my notifications inside the app, so that I can review alerts without leaving the page.

#### Acceptance Criteria

1. THE Notification_Panel SHALL display a bell icon in the Navbar that is visible on all pages.
2. WHEN the Unread Count is greater than zero, THE Notification_Panel SHALL display the Unread Count as a badge on the bell icon.
3. WHEN the student clicks the bell icon, THE Notification_Panel SHALL toggle open or closed.
4. WHILE the Notification_Panel is open, THE Notification_Panel SHALL display all stored notifications ordered by `created_at` descending, showing for each: task name, subject, due date, priority, notification type, and relative time since creation.
5. WHILE the Notification_Panel is open and there are no stored notifications, THE Notification_Panel SHALL display the message "No notifications yet."
6. WHEN the student clicks a notification item, THE Notification_Panel SHALL mark that notification as `read` in the Notification_Store and update the Unread Count badge.
7. WHEN the student clicks "Mark all as read", THE Notification_Panel SHALL mark all notifications as `read` in the Notification_Store and set the Unread Count badge to zero.

---

### Requirement 5: Deliver Browser Push Notifications

**User Story:** As a student, I want to receive browser push notifications for due-soon and overdue tasks, so that I am alerted even when I am not actively looking at the app.

#### Acceptance Criteria

1. WHEN the app loads for the first time and the browser supports push notifications, THE Notification_Service SHALL request permission from the student to display browser push notifications.
2. IF the student denies push notification permission, THEN THE Notification_Service SHALL continue to create in-app notification records without delivering browser push notifications.
3. WHEN a new due-soon notification record is created and push permission is `"granted"`, THE Push_Manager SHALL display a browser push notification with the title "Task Due Soon" and a body containing the task name, subject, and due date.
4. WHEN a new overdue notification record is created and push permission is `"granted"`, THE Push_Manager SHALL display a browser push notification with the title "Task Overdue" and a body containing the task name, subject, and due date.
5. IF the browser does not support the Push_Manager API, THEN THE Notification_Service SHALL deliver in-app notifications only and SHALL NOT throw an error.

---

### Requirement 6: Evaluate Notifications on App Load and Task Changes

**User Story:** As a student, I want notifications to be checked automatically, so that I do not have to manually trigger a refresh to see new alerts.

#### Acceptance Criteria

1. WHEN the dashboard page mounts, THE Notification_Service SHALL evaluate all tasks and generate any missing due-soon or overdue notifications.
2. WHEN a task's `status` changes to `Complete`, THE Notification_Service SHALL mark any existing unread notifications for that `task_id` as `read` in the Notification_Store.
3. WHEN a task is deleted, THE Notification_Service SHALL delete all notification records associated with that `task_id` from the Notification_Store.
