# Requirements Document

## Introduction

The Analytics Summaries feature provides users with weekly summaries, monthly summaries, and productivity suggestions derived from their existing task and time-tracking data. All computation is performed client-side by aggregating data from the `tasks`, `time_sessions`, and `completion_records` Supabase tables. A new `/analytics` route exposes three panels: a weekly summary, a monthly summary, and a suggestions panel. Period navigation (previous/next week or month) recomputes stats from cached data without additional network requests.

## Glossary

- **AnalyticsDashboard**: The top-level React component at `app/components/AnalyticsDashboard.tsx` that owns fetch state, period navigation state, and distributes computed props to child panels.
- **AnalyticsService**: The module at `lib/analyticsService.ts` containing all data-fetching and pure aggregation functions.
- **WeeklySummary**: The React component that displays weekly stats (outcome counts, total hours, busiest day, longest task).
- **MonthlySummary**: The React component that displays monthly stats including per-subject breakdowns.
- **SuggestionsPanel**: The React component that displays productivity suggestions derived from historical patterns.
- **WeeklyStats**: The aggregated data structure produced by `computeWeeklyStats`.
- **MonthlyStats**: The aggregated data structure produced by `computeMonthlyStats`, extending WeeklyStats with per-subject breakdowns.
- **Suggestions**: The aggregated data structure produced by `computeSuggestions`.
- **RawAnalyticsData**: The unprocessed data fetched from Supabase, containing tasks with nested time_sessions and completion_records.
- **OutcomeCounts**: A record of `{ completed, aheadOfTime, onTime, overdue }` counts for a given period or subject.
- **SubjectStats**: Per-subject aggregation of `totalSeconds` and `OutcomeCounts` for a given month.
- **Window**: A half-open time interval `[windowStart, windowEnd)` used to filter sessions and completion records.
- **BusiestDay**: The day name (e.g. `'Monday'`) with the highest total session seconds within a window.
- **LongestTask**: The task with the highest total session seconds within a window.

---

## Requirements

### Requirement 1: Fetch Analytics Data

**User Story:** As a student, I want the analytics page to load my task and time data automatically, so that I can see my productivity stats without manual input.

#### Acceptance Criteria

1. WHEN the AnalyticsDashboard mounts, THE AnalyticsService SHALL fetch all tasks with their nested time_sessions and completion_records from Supabase in a single query.
2. WHEN the AnalyticsDashboard mounts, THE AnalyticsDashboard SHALL call fetchAnalyticsData exactly once.
3. IF a Supabase error occurs during fetchAnalyticsData, THEN THE AnalyticsDashboard SHALL display an error message in place of all three panels.
4. WHEN fetchAnalyticsData succeeds, THE AnalyticsDashboard SHALL pass the RawAnalyticsData to the aggregation functions and distribute the resulting WeeklyStats, MonthlyStats, and Suggestions to the respective child components as props.

---

### Requirement 2: Compute Weekly Stats

**User Story:** As a student, I want to see a summary of my task outcomes and time spent for the current week, so that I can understand how productive I was.

#### Acceptance Criteria

1. WHEN computeWeeklyStats is called, THE AnalyticsService SHALL count only completion_records whose `completed_at` falls within `[weekStart, weekStart + 7 days)` toward OutcomeCounts.
2. WHEN computeWeeklyStats is called, THE AnalyticsService SHALL sum only time_sessions whose `started_at` falls within the same window and whose `ended_at` is non-null toward `totalSeconds`.
3. WHEN computeWeeklyStats is called, THE WeeklyStats `outcomes.completed` SHALL equal `outcomes.aheadOfTime + outcomes.onTime + outcomes.overdue`.
4. WHEN computeWeeklyStats is called, THE AnalyticsService SHALL set `busiestDay` to the day name with the highest total session seconds in the window, or `null` if no sessions exist in the window.
5. WHEN computeWeeklyStats is called, THE AnalyticsService SHALL set `longestTask` to the task with the highest total session seconds in the window, or `null` if no sessions exist in the window.
6. WHEN computeWeeklyStats is called with an empty tasks array, THE WeeklyStats SHALL have all numeric counts equal to `0` and all nullable fields equal to `null`.

---

### Requirement 3: Compute Monthly Stats

**User Story:** As a student, I want to see a monthly breakdown of my task outcomes and time per subject, so that I can identify which subjects need more attention.

#### Acceptance Criteria

1. WHEN computeMonthlyStats is called, THE AnalyticsService SHALL apply the same window-filtering and aggregation rules as computeWeeklyStats, scoped to the calendar month `[year, month]`.
2. WHEN computeMonthlyStats is called, THE MonthlyStats `subjectStats` SHALL contain exactly one entry per distinct subject that has at least one session or completion record in the month window.
3. WHEN computeMonthlyStats is called, THE sum of `subjectStats[i].outcomes.completed` across all subjects SHALL equal `MonthlyStats.outcomes.completed`, and similarly for `aheadOfTime`, `onTime`, and `overdue`.
4. WHEN computeMonthlyStats is called, THE AnalyticsService SHALL set `mostTimeSubject` to the subject with the highest `totalSeconds` in `subjectStats`, or `null` if no sessions exist.
5. WHEN computeMonthlyStats is called with at least two subjects having `totalSeconds > 0`, THE AnalyticsService SHALL set `leastTimeSubject` to the subject with the minimum `totalSeconds > 0`.
6. WHEN computeMonthlyStats is called with fewer than two subjects having `totalSeconds > 0`, THE AnalyticsService SHALL set `leastTimeSubject` to `null`.
7. WHEN computeMonthlyStats is called, THE AnalyticsService SHALL set `subjectMostCompleted`, `subjectMostOverdue`, and `subjectMostAheadOfTime` to the subjects with the highest count of each respective outcome, or `null` if no completion records exist in the window.
8. WHEN computeMonthlyStats is called with an empty tasks array, THE MonthlyStats SHALL have all numeric counts equal to `0`, all nullable fields equal to `null`, and `subjectStats` equal to `[]`.

---

### Requirement 4: Window Filtering and Duration Helpers

**User Story:** As a developer, I want accurate window-filtering and duration utilities, so that all aggregation functions produce correct results.

#### Acceptance Criteria

1. WHEN filterSessionsInWindow is called, THE AnalyticsService SHALL include sessions where `started_at >= windowStart` and `started_at < windowEnd`.
2. WHEN filterSessionsInWindow is called, THE AnalyticsService SHALL exclude sessions where `started_at === windowEnd`.
3. WHEN filterSessionsInWindow is called, THE AnalyticsService SHALL exclude sessions where `ended_at` is `null`.
4. WHEN filterCompletionsInWindow is called, THE AnalyticsService SHALL include records where `completed_at >= windowStart` and `completed_at < windowEnd`.
5. WHEN sessionDurationSeconds is called with a valid TimeSession where `ended_at > started_at`, THE AnalyticsService SHALL return `Math.floor((ended_at_ms - started_at_ms) / 1000)`.
6. WHEN sessionDurationSeconds is called with a TimeSession where `ended_at <= started_at`, THE AnalyticsService SHALL return `0`.
7. WHEN getWeekStart is called with any Date, THE AnalyticsService SHALL return a new Date set to the Monday of the week containing that date at midnight UTC, without mutating the input.

---

### Requirement 5: Compute Suggestions

**User Story:** As a student, I want personalized productivity suggestions based on my historical data, so that I can improve my study habits.

#### Acceptance Criteria

1. WHEN computeSuggestions is called, THE AnalyticsService SHALL include a subject in `focusSubjects` only if that subject has `completed >= 2` and `overdue / completed > 0.5`.
2. WHEN computeSuggestions is called, THE AnalyticsService SHALL include a subject in `avoidSubjects` only if that subject has `completed >= 3` and `overdue / completed > 0.7`.
3. WHEN computeSuggestions is called, THE AnalyticsService SHALL ensure no subject appears in both `focusSubjects` and `avoidSubjects`.
4. WHEN computeSuggestions is called, THE AnalyticsService SHALL set `mostProductiveDays` to up to 3 day names ranked by `(aheadOfTime + onTime) / completed` ratio, considering only days with `completed >= 2`.
5. WHEN computeSuggestions is called, THE AnalyticsService SHALL set `mostProductiveHours` to up to 3 hour values in `[0, 23]` ranked by count of sessions started in that hour.
6. WHEN computeSuggestions is called, THE `mostProductiveHours` array SHALL contain at most 3 elements and each element SHALL be an integer in `[0, 23]`.
7. WHEN computeSuggestions is called with an empty tasks array, THE Suggestions SHALL have `focusSubjects`, `mostProductiveDays`, `mostProductiveHours`, and `avoidSubjects` all equal to `[]`.

---

### Requirement 6: Period Navigation

**User Story:** As a student, I want to navigate to previous and next weeks or months, so that I can review my historical productivity without waiting for data to reload.

#### Acceptance Criteria

1. WHEN the user clicks the previous or next week control, THE AnalyticsDashboard SHALL recompute WeeklyStats by calling computeWeeklyStats with the updated weekStart against the cached RawAnalyticsData.
2. WHEN the user clicks the previous or next month control, THE AnalyticsDashboard SHALL recompute MonthlyStats by calling computeMonthlyStats with the updated month and year against the cached RawAnalyticsData.
3. WHEN any period navigation action occurs, THE AnalyticsDashboard SHALL NOT call fetchAnalyticsData again.
4. WHEN the displayed week matches the current calendar week, THE WeeklySummary SHALL indicate that the current week is being viewed.
5. WHEN the displayed month matches the current calendar month, THE MonthlySummary SHALL indicate that the current month is being viewed.

---

### Requirement 7: Empty State and Error Handling

**User Story:** As a student, I want clear feedback when there is no data or something goes wrong, so that I understand the state of the application.

#### Acceptance Criteria

1. WHEN no tasks have activity in the selected week, THE WeeklySummary SHALL render an empty-state message.
2. WHEN no tasks have activity in the selected month, THE MonthlySummary SHALL render an empty-state message.
3. WHEN insufficient historical data exists to generate suggestions, THE SuggestionsPanel SHALL display a message indicating that not enough data is available yet.
4. IF a Supabase fetch error occurs, THEN THE AnalyticsDashboard SHALL render an error message in place of the WeeklySummary, MonthlySummary, and SuggestionsPanel.
5. WHEN a task has no time_sessions, THE AnalyticsService SHALL exclude that task from all time-based stats while still counting it in outcome stats if a completion record exists in the window.
6. WHEN a task has no completion_records, THE AnalyticsService SHALL exclude that task from all outcome stats while still counting it in time-based stats if sessions exist in the window.
7. WHEN a time_session has a null `ended_at`, THE AnalyticsService SHALL exclude that session from all duration calculations.
