# Implementation Plan: Calendar Scheduler

## Overview

Implement the Calendar Scheduler feature by creating the `lib/calendarService.ts` module (pure computation functions + Supabase CRUD), the `app/calendar/page.tsx` client component (FullCalendar view, event form, available hours, weekly study progress, badge notifications), and the supporting CSS. All event data and the weekly goal are persisted in Supabase. FullCalendar (`@fullcalendar/react` + `@fullcalendar/daygrid`) must be installed before implementation begins.

## Tasks

- [x] 1. Install FullCalendar dependencies and create Supabase tables
  - Run `npm install @fullcalendar/react @fullcalendar/daygrid` in the `Study_Buddy` directory
  - Run the `calendar_events` DDL from the design in the Supabase dashboard (uuid pk, title, type, start, end nullable, color, created_at; index on start asc)
  - Run the `study_goals` DDL from the design in the Supabase dashboard (single-row table with id=1 constraint, weekly_goal integer >= 1, updated_at)
  - _Requirements: 3.1, 6.1_

- [x] 2. Define types and implement pure computation functions in `lib/calendarService.ts`
  - [x] 2.1 Define `EventType`, `CalendarEvent`, `CalendarEventFormValues`, `WeeklyGoal`, and `COLOR_MAP`
    - Export all types and the `COLOR_MAP` constant as specified in the design's public API
    - _Requirements: 1.3, 3.1, 3.3_

  - [x] 2.2 Implement `deriveColor` and `validateEventForm`
    - `deriveColor(type)`: return `COLOR_MAP[type]`
    - `validateEventForm(values)`: return `null` if valid; return an error string if title is empty/whitespace, start is empty, or end is non-empty and end ≤ start
    - _Requirements: 1.3, 2.3, 2.4, 3.3_

  - [ ]* 2.3 Write property test for `deriveColor` (Property 1)
    - **Property 1: Color derivation is consistent with Color_Map**
    - **Validates: Requirements 1.3, 3.3**

  - [ ]* 2.4 Write property test for `validateEventForm` — missing title or start (Property 2)
    - **Property 2: Event form validation rejects missing title or start**
    - **Validates: Requirements 2.3**

  - [ ]* 2.5 Write property test for `validateEventForm` — end ≤ start (Property 3)
    - **Property 3: Event form validation rejects end ≤ start**
    - **Validates: Requirements 2.4**

  - [x] 2.6 Implement `isValidWeeklyGoal`
    - Return `true` only when value is an integer >= 1; return `false` for any number < 1, non-integer, or non-numeric value
    - _Requirements: 6.5_

  - [ ]* 2.7 Write property test for `isValidWeeklyGoal` (Property 6)
    - **Property 6: Weekly goal validation rejects invalid inputs**
    - **Validates: Requirements 6.5**

  - [x] 2.8 Implement `getISOWeekBounds` and `computeAvailableHours`
    - `getISOWeekBounds(date)`: return `{ weekStart, weekEnd }` where weekStart is Monday 00:00:00.000 and weekEnd is Sunday 23:59:59.999 in local time for the ISO week containing `date`
    - `computeAvailableHours(events, dateStr)`: sum durations (hours) of events whose local start date matches `dateStr` and have a non-null end; return `max(0, 24 - 8 - total)`
    - _Requirements: 4.2, 4.3_

  - [ ]* 2.9 Write property test for `computeAvailableHours` (Property 4)
    - **Property 4: Available hours formula correctness**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 2.10 Implement `computeWeeklyStudyHours`
    - Sum durations (hours) of events where title contains "study" (case-insensitive), start falls within the ISO week of `referenceDate`, and end is non-null
    - _Requirements: 5.2, 5.3_

  - [ ]* 2.11 Write property test for `computeWeeklyStudyHours` (Property 5)
    - **Property 5: Weekly study hours computation correctness**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 2.12 Implement `shouldShowBadge`
    - Return `false` if `alreadyShown` is `true` (regardless of condition); return `true` only when `alreadyShown` is `false` and `condition` is `true`
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 2.13 Write property test for `shouldShowBadge` (Property 7)
    - **Property 7: Badge is shown exactly once per session**
    - **Validates: Requirements 7.1, 7.2, 7.5**

  - [ ]* 2.14 Write unit tests for pure functions in `tests/calendar/calendarService.unit.test.ts`
    - `deriveColor`: correct hex for each of the five event types
    - `validateEventForm`: accepts valid title + start; rejects empty title; rejects whitespace-only title; rejects missing start; rejects end ≤ start; accepts missing end
    - `isValidWeeklyGoal`: accepts 1, 5, 100; rejects 0, -1, 0.5, NaN, "abc", null, undefined
    - `computeAvailableHours`: returns 16 for empty list; returns 0 when events exceed 16 hours; ignores events on other dates; ignores events with null end
    - `computeWeeklyStudyHours`: returns 0 for empty list; counts only "study" events; ignores events outside ISO week; ignores events with null end; case-insensitive "study" matching
    - `getISOWeekBounds`: Monday is week start; Sunday is week end; handles week boundaries
    - `shouldShowBadge`: false when alreadyShown=true; true when alreadyShown=false and condition=true; false when alreadyShown=false and condition=false
    - _Requirements: 1.3, 2.3, 2.4, 4.2, 4.3, 5.2, 5.3, 6.5, 7.1, 7.2, 7.5_

- [x] 3. Checkpoint — Ensure all pure-function tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Supabase I/O functions in `lib/calendarService.ts`
  - [x] 4.1 Implement `fetchEvents`
    - Select all rows from `calendar_events` ordered by `start` ascending
    - Follow the same error-handling pattern as `taskService.ts` (check `error`, throw `new Error(error.message)`)
    - _Requirements: 1.2, 3.2_

  - [x] 4.2 Implement `createEvent`
    - Derive `color` from `COLOR_MAP` using `deriveColor(values.type)` before inserting
    - Insert into `calendar_events` and return the created row
    - _Requirements: 2.2, 3.3_

  - [x] 4.3 Implement `fetchWeeklyGoal` and `upsertWeeklyGoal`
    - `fetchWeeklyGoal`: select the single row from `study_goals`; return `null` if no row exists
    - `upsertWeeklyGoal(goal)`: upsert with `on conflict (id) do update`, setting `weekly_goal` and `updated_at`
    - _Requirements: 6.2, 6.3_

- [x] 5. Build the `app/calendar/page.tsx` client component — data loading and event display
  - [x] 5.1 Create `app/calendar/page.tsx` with `'use client'` directive and initial state
    - Declare state: `events`, `weeklyGoal`, `goalInput`, `formValues`, `formError`, `loading`, `pageError`, `activeBadges`
    - Declare refs: `streakBadgeShown`, `goalBadgeShown`
    - On mount: call `fetchEvents` and `fetchWeeklyGoal`; populate state; catch errors and set `pageError`; default `weeklyGoal` to 0 if `fetchWeeklyGoal` returns null
    - _Requirements: 1.1, 1.2, 1.4, 6.3, 6.4_

  - [x] 5.2 Render the FullCalendar component
    - Import `FullCalendar` from `@fullcalendar/react` and `dayGridPlugin` from `@fullcalendar/daygrid`
    - Pass `events` (mapped to `{ id, title, start, end, color }`) as the `events` prop; set `initialView="dayGridMonth"`
    - Display `pageError` as an error message when set; render the calendar empty on error (do not crash)
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 5.3 Render the Available Hours and Weekly Study Progress panels
    - Compute `availableHours` via `computeAvailableHours(events, todayDateStr)` and display rounded to 2 decimal places
    - Compute `weeklyStudyHours` via `computeWeeklyStudyHours(events, new Date())` and display as `{weeklyStudyHours} / {weeklyGoal} hrs` rounded to 2 decimal places
    - Recalculate both values whenever `events` or `weeklyGoal` changes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.4 Implement the Weekly Goal input
    - Render a numeric input bound to `goalInput`; on change, validate with `isValidWeeklyGoal`; if valid, call `upsertWeeklyGoal` and update `weeklyGoal` state; if invalid, retain the previous valid value
    - On mount, populate `goalInput` from the fetched `weeklyGoal`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Build the Event Form and badge notifications in `app/calendar/page.tsx`
  - [x] 6.1 Implement the Event Form
    - Render a text input for title, a dropdown for `EventType` (class, task, work, personal, appointment), a datetime-local input for start, and a datetime-local input for end
    - On submit: call `validateEventForm`; if invalid, set `formError` and do not submit; if valid, call `createEvent`, append the returned event to `events` state, and reset `formValues` to defaults
    - On `createEvent` failure: set `formError` and retain form values
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.2 Implement badge notifications
    - After each recalculation of `weeklyStudyHours`, call `shouldShowBadge` for the "10 Hour Study Streak" condition (`weeklyStudyHours >= 10`) and the "Weekly Goal Achieved" condition (`weeklyGoal > 0 && weeklyStudyHours >= weeklyGoal`)
    - When `shouldShowBadge` returns `true`, add the badge key to `activeBadges` and set the corresponding ref to `true`
    - Render each active badge as a dismissible in-page notification element (not a browser `alert()`); clicking dismiss removes it from `activeBadges`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Create `app/styles/Calendar.css` and wire the calendar route into the Navbar
  - Create `app/styles/Calendar.css` with styles for the calendar page layout, event form, available hours panel, weekly progress panel, and badge notification elements
  - Import `Calendar.css` in `app/calendar/page.tsx`
  - Verify the existing `/calendar` link in `app/components/Navbar.tsx` routes correctly to the new page (link already present — no change needed unless missing)
  - _Requirements: 1.1, 7.3, 7.4_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already a project dependency) with a minimum of 100 runs each; place them in `tests/calendar/calendarService.property.test.ts`
- Unit tests live in `tests/calendar/calendarService.unit.test.ts`
- The Supabase DDL for `calendar_events` and `study_goals` must be run manually in the Supabase dashboard before testing I/O functions
- FullCalendar requires `'use client'` — the entire `app/calendar/page.tsx` is a client component, consistent with `Taskboard.tsx` and `NotificationBell.tsx`
- Badge "already shown" state is held in `useRef` (not persisted), so badges can reappear on a fresh page load
