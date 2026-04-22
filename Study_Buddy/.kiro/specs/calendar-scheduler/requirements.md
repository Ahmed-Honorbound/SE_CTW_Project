# Requirements Document

## Introduction

The Calendar Scheduler is a new `/calendar` page in the Study Buddy Next.js application. It gives students a visual monthly calendar where they can create and manage scheduled events (classes, tasks, work shifts, personal commitments, and appointments). The page also surfaces two study-focused metrics — available hours remaining today and weekly study progress toward a user-set goal — and awards badge notifications when study milestones are reached. All event data and the weekly goal are persisted in Supabase rather than localStorage.

## Glossary

- **Calendar_Page**: The Next.js page rendered at the `/calendar` route.
- **Calendar_View**: The FullCalendar `dayGridMonth` component that renders events on a monthly grid.
- **Event**: A scheduled item with a title, type, start datetime, optional end datetime, and a derived display color, stored in the `calendar_events` Supabase table.
- **Event_Type**: One of five categories — `class`, `task`, `work`, `personal`, `appointment` — that determines an event's color.
- **Event_Form**: The form on the Calendar_Page used to create new Events.
- **Calendar_Service**: The TypeScript module (`lib/calendarService.ts`) that encapsulates all Supabase operations for Events and the Weekly_Goal.
- **Available_Hours**: The number of non-sleep, unscheduled hours remaining in the current calendar day, calculated as `24 − 8 − total_event_hours_today`.
- **Study_Event**: Any Event whose title contains the substring "study" (case-insensitive).
- **Weekly_Study_Hours**: The sum of durations (in hours) of all Study_Events whose start datetime falls within the current ISO week (Monday–Sunday).
- **Weekly_Goal**: A positive integer representing the student's target study hours for the current week, stored persistently in Supabase.
- **Badge**: A transient in-page notification displayed when a study milestone is reached.
- **Color_Map**: The fixed mapping of Event_Type to hex color: `class=#4e73df`, `task=#e74a3b`, `work=#36b9cc`, `personal=#1cc88a`, `appointment=#f6c23e`.

---

## Requirements

### Requirement 1: Display Monthly Calendar

**User Story:** As a student, I want to see all my scheduled events on a monthly calendar, so that I can visualize my commitments at a glance.

#### Acceptance Criteria

1. THE Calendar_Page SHALL render the Calendar_View in `dayGridMonth` mode on initial load.
2. WHEN the Calendar_Page loads, THE Calendar_Service SHALL fetch all Events from Supabase and supply them to the Calendar_View.
3. WHEN an Event is displayed in the Calendar_View, THE Calendar_View SHALL render the Event using the color defined in the Color_Map for that Event's Event_Type.
4. IF the Calendar_Service fails to fetch Events from Supabase, THEN THE Calendar_Page SHALL display an error message describing the failure without crashing.

---

### Requirement 2: Create a New Event

**User Story:** As a student, I want to add a new event with a title, type, start time, and optional end time, so that I can schedule my activities.

#### Acceptance Criteria

1. THE Event_Form SHALL provide a text input for the event title, a dropdown for Event_Type, a datetime-local input for start time, and a datetime-local input for end time.
2. WHEN the student submits the Event_Form with a valid title and start datetime, THE Calendar_Service SHALL insert the new Event into Supabase and THE Calendar_View SHALL display the new Event immediately.
3. IF the student submits the Event_Form without a title or without a start datetime, THEN THE Event_Form SHALL display a validation error and SHALL NOT submit the Event to Supabase.
4. IF the student provides an end datetime that is earlier than or equal to the start datetime, THEN THE Event_Form SHALL display a validation error and SHALL NOT submit the Event to Supabase.
5. WHEN an Event is successfully created, THE Event_Form SHALL reset all fields to their default values.
6. IF the Calendar_Service fails to insert an Event into Supabase, THEN THE Calendar_Page SHALL display an error message and the Event_Form SHALL retain the entered values.

---

### Requirement 3: Persist Events in Supabase

**User Story:** As a student, I want my calendar events saved to the database, so that they are available across sessions and devices.

#### Acceptance Criteria

1. THE Calendar_Service SHALL store each Event in a `calendar_events` Supabase table with columns: `id` (UUID, primary key), `title` (text), `type` (text), `start` (timestamptz), `end` (timestamptz, nullable), `color` (text), `created_at` (timestamptz).
2. WHEN the Calendar_Page loads, THE Calendar_Service SHALL retrieve all rows from `calendar_events` ordered by `start` ascending.
3. THE Calendar_Service SHALL derive and store the `color` value from the Color_Map at the time of Event creation.
4. FOR ALL Events inserted and then retrieved from Supabase, THE Calendar_Service SHALL return an Event object whose `title`, `type`, `start`, `end`, and `color` fields are equal to the values that were inserted (round-trip property).

---

### Requirement 4: Calculate Available Hours Today

**User Story:** As a student, I want to see how many unscheduled hours I have left today, so that I can plan my study time effectively.

#### Acceptance Criteria

1. THE Calendar_Page SHALL display the Available_Hours value, updated whenever Events are loaded or a new Event is created.
2. WHEN calculating Available_Hours, THE Calendar_Page SHALL sum the durations (in hours) of all Events whose start date matches the current local calendar date and that have a non-null end datetime.
3. WHEN calculating Available_Hours, THE Calendar_Page SHALL subtract 8 hours for sleep and the total event hours from 24, with a minimum result of 0.
4. THE Calendar_Page SHALL display Available_Hours rounded to two decimal places.

---

### Requirement 5: Track Weekly Study Progress

**User Story:** As a student, I want to see how many study hours I have logged this week compared to my goal, so that I can stay on track.

#### Acceptance Criteria

1. THE Calendar_Page SHALL display Weekly_Study_Hours and Weekly_Goal in the format `{Weekly_Study_Hours} / {Weekly_Goal} hrs`.
2. WHEN calculating Weekly_Study_Hours, THE Calendar_Page SHALL include only Study_Events whose start datetime falls within the current ISO week (Monday 00:00 through Sunday 23:59 local time).
3. WHEN calculating Weekly_Study_Hours, THE Calendar_Page SHALL include only Study_Events that have a non-null end datetime, and SHALL compute each event's duration as `(end − start)` in hours.
4. THE Calendar_Page SHALL display Weekly_Study_Hours rounded to two decimal places.
5. WHEN a new Event is created or Events are reloaded, THE Calendar_Page SHALL recalculate and redisplay Weekly_Study_Hours.

---

### Requirement 6: Set and Persist Weekly Study Goal

**User Story:** As a student, I want to set a weekly study goal in hours and have it remembered, so that I do not have to re-enter it every session.

#### Acceptance Criteria

1. THE Calendar_Page SHALL provide a numeric input for the student to enter the Weekly_Goal.
2. WHEN the student changes the Weekly_Goal input, THE Calendar_Service SHALL upsert the new value into Supabase and THE Calendar_Page SHALL recalculate and redisplay the weekly study progress.
3. WHEN the Calendar_Page loads, THE Calendar_Service SHALL fetch the stored Weekly_Goal from Supabase and populate the Weekly_Goal input with that value.
4. IF no Weekly_Goal has been stored, THEN THE Calendar_Page SHALL display `0` as the default Weekly_Goal.
5. IF the student enters a Weekly_Goal less than 1 or a non-numeric value, THEN THE Calendar_Page SHALL reject the input and retain the previous valid Weekly_Goal.

---

### Requirement 7: Display Study Milestone Badges

**User Story:** As a student, I want to receive a badge notification when I hit a study milestone, so that I feel motivated to keep studying.

#### Acceptance Criteria

1. WHEN Weekly_Study_Hours reaches or exceeds 10 for the first time in a session, THE Calendar_Page SHALL display a "10 Hour Study Streak" Badge.
2. WHEN Weekly_Study_Hours reaches or exceeds Weekly_Goal (and Weekly_Goal is greater than 0) for the first time in a session, THE Calendar_Page SHALL display a "Weekly Goal Achieved" Badge.
3. THE Calendar_Page SHALL display each Badge as an in-page notification element rather than a browser `alert()` dialog.
4. WHEN a Badge is displayed, THE Calendar_Page SHALL allow the student to dismiss it.
5. THE Calendar_Page SHALL NOT display the same Badge more than once per page session.
