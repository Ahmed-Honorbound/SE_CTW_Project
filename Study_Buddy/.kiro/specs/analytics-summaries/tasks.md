# Implementation Plan: Analytics Summaries

## Overview

Implement the analytics summaries feature in four phases: (1) pure service functions in `lib/analyticsService.ts`, (2) unit tests for all pure functions, (3) property-based tests for all 16 correctness properties using fast-check, and (4) UI components and the `/analytics` route.

## Tasks

- [x] 1. Implement `lib/analyticsService.ts` — helper and filter functions
  - [x] 1.1 Create `lib/analyticsService.ts` with type definitions and helper functions
    - Define `RawAnalyticsData`, `OutcomeCounts`, `SubjectStats`, `WeeklyStats`, `MonthlyStats`, `Suggestions` interfaces
    - Implement `getWeekStart(date: Date): Date` — returns Monday of the week at midnight UTC without mutating input
    - Implement `sessionDurationSeconds(session: TimeSession): number` — returns `Math.floor((ended_at_ms - started_at_ms) / 1000)`, returns `0` if `ended_at <= started_at`
    - _Requirements: 4.5, 4.6, 4.7_

  - [x] 1.2 Implement `filterSessionsInWindow` and `filterCompletionsInWindow`
    - `filterSessionsInWindow(sessions, windowStart, windowEnd)` — includes `started_at >= windowStart && started_at < windowEnd`, excludes null `ended_at`
    - `filterCompletionsInWindow(records, windowStart, windowEnd)` — includes `completed_at >= windowStart && completed_at < windowEnd`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.3 Implement `computeWeeklyStats(data, weekStart)`
    - Iterate tasks, apply `filterSessionsInWindow` and `filterCompletionsInWindow` for `[weekStart, weekStart + 7 days)`
    - Accumulate `totalSeconds`, `dayBuckets`, `taskSeconds`, and `outcomes` per the pseudocode in the design
    - Derive `busiestDay` (max day bucket or null) and `longestTask` (max task seconds or null)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.4 Implement `computeMonthlyStats(data, month, year)`
    - Compute `monthStart` and `monthEnd` from `month` (0-indexed) and `year`
    - Reuse session/completion filtering logic scoped to the month window
    - Build `subjectMap` accumulating `totalSeconds` and `OutcomeCounts` per subject
    - Derive `mostTimeSubject`, `leastTimeSubject`, `subjectMostCompleted`, `subjectMostOverdue`, `subjectMostAheadOfTime`
    - Sort `subjectStats` by `totalSeconds` descending
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 1.5 Implement `computeSuggestions(data)`
    - Accumulate `subjectOutcomes`, `dayCompletions`, and `hourCounts` across all tasks
    - Derive `focusSubjects` (completed >= 2, overdue/completed > 0.5), `avoidSubjects` (completed >= 3, overdue/completed > 0.7, disjoint from focusSubjects)
    - Derive `mostProductiveDays` (top 3 by onTimeOrAhead/completed, completed >= 2) and `mostProductiveHours` (top 3 by session count)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 1.6 Implement `fetchAnalyticsData(): Promise<RawAnalyticsData>`
    - Issue single Supabase query selecting tasks with nested `time_sessions` and `completion_records` as shown in the design
    - Throw on Supabase error
    - _Requirements: 1.1_

- [ ] 2. Checkpoint — verify service compiles
  - Ensure all types are consistent and `lib/analyticsService.ts` has no TypeScript errors. Ask the user if questions arise.

- [x] 3. Unit tests for pure functions in `tests/analytics/analyticsService.unit.test.ts`
  - [ ] 3.1 Create `tests/analytics/analyticsService.unit.test.ts` with `vi.mock('../lib/supabase')` at the top
    - Import all pure functions from `lib/analyticsService`
    - _Requirements: 4.5, 4.6, 4.7_

  - [ ] 3.2 Write unit tests for `getWeekStart`
    - Test all 7 input days of the week return the correct Monday
    - Test that the input date is not mutated
    - Test that the returned date is at midnight UTC
    - _Requirements: 4.7_

  - [ ] 3.3 Write unit tests for `sessionDurationSeconds`
    - Test normal case: `ended_at > started_at` returns correct floored seconds
    - Test zero-duration: `ended_at === started_at` returns `0`
    - Test negative guard: `ended_at < started_at` returns `0`
    - _Requirements: 4.5, 4.6_

  - [ ] 3.4 Write unit tests for `filterSessionsInWindow`
    - Test session exactly at `windowStart` is included
    - Test session exactly at `windowEnd` is excluded
    - Test session with null `ended_at` is excluded
    - Test session inside window is included; outside is excluded
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 3.5 Write unit tests for `filterCompletionsInWindow`
    - Test record exactly at `windowStart` is included
    - Test record exactly at `windowEnd` is excluded
    - Test record inside window is included; outside is excluded
    - _Requirements: 4.4_

  - [ ] 3.6 Write unit tests for `computeWeeklyStats`
    - Test empty tasks array produces zeroed/null stats
    - Test outcome counts: `completed === aheadOfTime + onTime + overdue`
    - Test `busiestDay` is null when no sessions in window
    - Test `longestTask` is null when no sessions in window
    - Test task with no sessions is excluded from time stats but counted in outcomes
    - Test task with no completion records is excluded from outcomes but counted in time stats
    - Test active session (null `ended_at`) is excluded from `totalSeconds`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.5, 7.6, 7.7_

  - [ ] 3.7 Write unit tests for `computeMonthlyStats`
    - Test empty tasks array produces zeroed/null stats with `subjectStats = []`
    - Test `subjectStats` contains exactly one entry per active subject
    - Test subject outcome counts sum to total outcome counts
    - Test `leastTimeSubject` is null when fewer than 2 subjects have time
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.8_

  - [ ] 3.8 Write unit tests for `computeSuggestions`
    - Test empty tasks array returns all empty arrays
    - Test `focusSubjects` threshold boundary: exactly 2 completions, exactly 50% overdue rate (should NOT qualify)
    - Test `focusSubjects` threshold boundary: 2 completions, >50% overdue (should qualify)
    - Test `avoidSubjects` threshold: 3 completions, >70% overdue
    - Test no subject appears in both `focusSubjects` and `avoidSubjects`
    - Test `mostProductiveHours` contains at most 3 elements, all in [0, 23]
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

- [ ] 4. Checkpoint — ensure all unit tests pass
  - Run `vitest --run tests/analytics/analyticsService.unit.test.ts`. Ensure all tests pass. Ask the user if questions arise.

- [ ] 5. Property-based tests in `tests/analytics/analyticsService.property.test.ts`
  - [ ] 5.1 Create `tests/analytics/analyticsService.property.test.ts` with `vi.mock('../lib/supabase')` and fast-check imports
    - Import `fc` from `fast-check` and all pure functions from `lib/analyticsService`
    - Define shared arbitraries: `arbTimeSession`, `arbCompletionRecord`, `arbTask`, `arbRawAnalyticsData`
    - Each property test must run a minimum of 100 iterations (`{ numRuns: 100 }`)
    - Each test must include the comment tag `// Feature: analytics-summaries, Property {N}: {property_text}`

  - [ ]* 5.2 Write property test for Property 1: Outcome counts are internally consistent
    - **Property 1: `outcomes.completed === outcomes.aheadOfTime + outcomes.onTime + outcomes.overdue`**
    - Test for both `computeWeeklyStats` and `computeMonthlyStats` with arbitrary data and arbitrary windows
    - **Validates: Requirement 2.3**

  - [ ]* 5.3 Write property test for Property 2: Only completed sessions contribute to totalSeconds
    - **Property 2: `totalSeconds` equals sum of `sessionDurationSeconds(s)` for sessions with non-null `ended_at` in window**
    - Verify sessions with `ended_at === null` never contribute to `totalSeconds`
    - **Validates: Requirements 2.2, 7.7**

  - [ ]* 5.4 Write property test for Property 3: Window filtering is exclusive of windowEnd
    - **Property 3: session with `started_at === windowEnd` is excluded; session with `started_at === windowStart` is included**
    - Use `fc.date()` for window boundaries and verify boundary behavior of `filterSessionsInWindow`
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 5.5 Write property test for Property 4: busiestDay is the day with the highest session seconds
    - **Property 4: `busiestDay` is the day name `d` with the maximum sum of session seconds, or null if all zero**
    - Generate arbitrary sessions distributed across days and verify `busiestDay` selection
    - **Validates: Requirement 2.4**

  - [ ]* 5.6 Write property test for Property 5: longestTask is the task with the highest total session seconds
    - **Property 5: `longestTask` is the task whose total session seconds >= all other tasks' totals, or null if no sessions**
    - **Validates: Requirement 2.5**

  - [ ]* 5.7 Write property test for Property 6: subjectStats covers all active subjects exactly once
    - **Property 6: every subject with activity in the month window appears in `subjectStats` exactly once; no inactive subject appears**
    - **Validates: Requirement 3.2**

  - [ ]* 5.8 Write property test for Property 7: Subject outcome counts sum to total outcome counts
    - **Property 7: sum of `subjectStats[i].outcomes.completed` equals `outcomes.completed`, and similarly for other outcome fields**
    - **Validates: Requirement 3.3**

  - [ ]* 5.9 Write property test for Property 8: mostTimeSubject has the highest totalSeconds
    - **Property 8: `mostTimeSubject` is the subject `s` where `s.totalSeconds >= all other subjects' totalSeconds`**
    - **Validates: Requirement 3.4**

  - [ ]* 5.10 Write property test for Property 9: leastTimeSubject has the lowest non-zero totalSeconds
    - **Property 9: when >= 2 subjects have `totalSeconds > 0`, `leastTimeSubject` has the minimum `totalSeconds > 0`**
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 5.11 Write property test for Property 10: focusSubjects threshold is respected
    - **Property 10: every subject in `focusSubjects` has `completed >= 2` and `overdue / completed > 0.5`; no subject failing these conditions appears**
    - **Validates: Requirement 5.1**

  - [ ]* 5.12 Write property test for Property 11: avoidSubjects threshold is respected and disjoint from focusSubjects
    - **Property 11: every subject in `avoidSubjects` has `completed >= 3` and `overdue / completed > 0.7`; no subject appears in both arrays**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 5.13 Write property test for Property 12: mostProductiveHours contains valid hour values
    - **Property 12: every value in `mostProductiveHours` is an integer in `[0, 23]` and the array has at most 3 elements**
    - **Validates: Requirement 5.6**

  - [ ]* 5.14 Write property test for Property 13: Empty data produces zeroed/null stats
    - **Property 13: `computeWeeklyStats`, `computeMonthlyStats`, and `computeSuggestions` with `data.tasks = []` produce all-zero counts, null nullable fields, and empty arrays**
    - Use arbitrary week/month/year values to confirm this holds for any period
    - **Validates: Requirements 2.6, 3.8, 5.7**

  - [ ]* 5.15 Write property test for Property 14: Period navigation does not re-fetch data
    - **Property 14: `fetchAnalyticsData` is called exactly once on mount; subsequent period changes only invoke pure aggregation functions**
    - Mock `fetchAnalyticsData` with `vi.fn()` and simulate multiple period navigation calls, asserting call count === 1
    - **Validates: Requirement 6.3**

  - [ ]* 5.16 Write property test for Property 15: sessionDurationSeconds is non-negative
    - **Property 15: for any `TimeSession` with non-null `ended_at`, `sessionDurationSeconds(session) >= 0`**
    - Generate arbitrary `started_at` and `ended_at` pairs including cases where `ended_at <= started_at`
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 5.17 Write property test for Property 16: getWeekStart always returns a Monday
    - **Property 16: for any input `Date`, `getWeekStart(date).getDay() === 1`**
    - Use `fc.date()` to generate arbitrary dates and verify the invariant
    - **Validates: Requirement 4.7**

- [ ] 6. Checkpoint — ensure all property tests pass
  - Run `vitest --run tests/analytics/analyticsService.property.test.ts`. Ensure all tests pass. Ask the user if questions arise.

- [x] 7. Implement UI components
  - [x] 7.1 Implement `app/components/WeeklySummary.tsx`
    - Accept `WeeklySummaryProps` (stats, weekStart, onPrevWeek, onNextWeek, isCurrentWeek)
    - Display outcome counts, total hours, busiest day, longest task
    - Render empty-state message when no activity in the week
    - Show current-week indicator when `isCurrentWeek` is true
    - _Requirements: 2.1–2.6, 6.4, 7.1_

  - [x] 7.2 Implement `app/components/MonthlySummary.tsx`
    - Accept `MonthlySummaryProps` (stats, month, year, onPrevMonth, onNextMonth, isCurrentMonth)
    - Display outcome counts, total hours, busiest day, longest task, and per-subject breakdown
    - Render empty-state message when no activity in the month
    - Show current-month indicator when `isCurrentMonth` is true
    - _Requirements: 3.1–3.8, 6.5, 7.2_

  - [x] 7.3 Implement `app/components/SuggestionsPanel.tsx`
    - Accept `SuggestionsPanelProps` (suggestions)
    - Display `focusSubjects`, `avoidSubjects`, `mostProductiveDays`, `mostProductiveHours`
    - Show "not enough data yet" message when all suggestion arrays are empty
    - _Requirements: 5.1–5.7, 7.3_

  - [x] 7.4 Implement `app/components/AnalyticsDashboard.tsx`
    - Own fetch state, error state, period navigation state (weekStart, month, year)
    - Call `fetchAnalyticsData()` exactly once on mount via `useEffect`
    - On error, render error message in place of all three panels
    - Compute `weeklyStats`, `monthlyStats`, `suggestions` from cached `rawData` on each render
    - Pass computed props to `WeeklySummary`, `MonthlySummary`, `SuggestionsPanel`
    - Implement `onPrevWeek`, `onNextWeek`, `onPrevMonth`, `onNextMonth` handlers that update state without re-fetching
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 7.4_

  - [x] 7.5 Create `app/analytics/page.tsx`
    - Simple route entry point that renders `<AnalyticsDashboard />`
    - _Requirements: 1.1_

- [ ] 8. Final checkpoint — ensure all tests pass
  - Run `vitest --run`. Ensure all tests pass. Ask the user if questions arise.
