# Implementation Plan: Task Creation

## Overview

Implement a fully functional Supabase-backed task management system for the Smart Study Planner. The implementation proceeds from infrastructure setup through service layer, UI components, and finally test coverage.

## Tasks

- [x] 1. Supabase setup — environment, client, and TypeScript types
  - [x] 1.1 Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` (already partially present — verify both keys exist)
    - _Requirements: 3.1, 4.1_
  - [x] 1.2 Create `lib/supabase.ts` exporting the Supabase client singleton using `createClient`
    - _Requirements: 3.1, 4.1_
  - [x] 1.3 Create `lib/types.ts` with all TypeScript interfaces and union types: `Priority`, `TaskStatus`, `CompletionOutcome`, `Task`, `Subtask`, `TimeSession`, `CompletionRecord`, `TaskFormValues`, `ValidationErrors`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Validation logic
  - [x] 2.1 Create `lib/validation.ts` implementing `validateTaskForm(values: TaskFormValues): ValidationErrors`
    - Return errors for: empty name, empty subject, empty due_date, empty priority, name > 100 chars, description > 500 chars
    - Return empty object `{}` when all fields are valid
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 2.2 Write property test for `validateTaskForm` — Property 1: Invalid form inputs are rejected
    - **Property 1: Invalid form inputs are rejected**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 3. Task service layer
  - [x] 3.1 Create `lib/taskService.ts` and implement `fetchAllTasks(): Promise<Task[]>` — select all tasks with nested subtasks, time_sessions, and completion_records
    - _Requirements: 4.1_
  - [x] 3.2 Implement `createTask(values: TaskFormValues): Promise<Task>` — insert with `status: 'Unstarted'`
    - _Requirements: 3.1_
  - [ ]* 3.3 Write property test for create → fetch round trip — Property 2: Task creation round trip
    - **Property 2: Task creation round trip**
    - **Validates: Requirements 3.1, 4.1**
  - [x] 3.4 Implement `updateTask(id: string, values: Partial<TaskFormValues>): Promise<Task>` and `updateTaskStatus(id: string, status: TaskStatus): Promise<void>`
    - _Requirements: 7.2, 6.2, 6.3, 6.4_
  - [ ]* 3.5 Write property test for edit round trip — Property 9: Edit round trip preserves all fields
    - **Property 9: Edit round trip preserves all fields**
    - **Validates: Requirements 7.1, 7.2**
  - [ ]* 3.6 Write property test for status update — Property 8: Status transitions are persisted and reflected
    - **Property 8: Status transitions are persisted and reflected**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  - [x] 3.7 Implement `deleteTask(id: string): Promise<void>`
    - _Requirements: 7.4_
  - [ ]* 3.8 Write property test for delete cascade — Property 10: Delete cascades to all associated records
    - **Property 10: Delete cascades to all associated records**
    - **Validates: Requirements 7.4**
  - [x] 3.9 Implement `computeOutcome(completedAt: Date, dueDate: string): CompletionOutcome` and `recordCompletion(taskId: string, dueDate: string): Promise<CompletionRecord>`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 3.10 Write property test for outcome computation — Property 11: Completion outcome is computed correctly
    - **Property 11: Completion outcome is computed correctly**
    - **Validates: Requirements 8.2, 8.3, 8.4**
  - [ ]* 3.11 Write property test for completion record insertion — Property 12: Completion record is created on task completion
    - **Property 12: Completion record is created on task completion**
    - **Validates: Requirements 8.1, 8.5**
  - [x] 3.12 Implement `startTimeSession(taskId: string): Promise<TimeSession>`, `stopTimeSession(sessionId: string): Promise<TimeSession>`, and `computeTotalSeconds(sessions: TimeSession[]): number`
    - _Requirements: 9.1, 9.2, 9.4, 9.5_
  - [ ]* 3.13 Write property test for timer session round trip — Property 13: Timer session round trip
    - **Property 13: Timer session round trip**
    - **Validates: Requirements 9.1, 9.2**
  - [ ]* 3.14 Write property test for total accumulated time — Property 14: Total accumulated time is sum of completed sessions
    - **Property 14: Total accumulated time is sum of completed sessions**
    - **Validates: Requirements 9.4, 9.5**
  - [x] 3.15 Implement subtask service functions: `addSubtask`, `toggleSubtask`, `updateSubtask`, `deleteSubtask`
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  - [ ]* 3.16 Write property test for subtask mutations — Property 16: Subtask mutations round trip
    - **Property 16: Subtask mutations round trip**
    - **Validates: Requirements 10.1, 10.3, 10.4, 10.5**
  - [ ]* 3.17 Write property test for subtask field constraints — Property 17: Subtask field constraints are enforced
    - **Property 17: Subtask field constraints are enforced**
    - **Validates: Requirements 10.2**

- [ ] 4. Checkpoint — Ensure all service layer tests pass, ask the user if questions arise.

- [x] 5. TaskForm component
  - [x] 5.1 Create `app/components/TaskForm.tsx` as a `'use client'` component with controlled inputs for name, subject, due_date, priority (dropdown), and description (textarea)
    - Render all fields empty on first mount
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 5.2 Wire `validateTaskForm` into the form's submit handler — display inline errors per field, block submission when errors exist
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 5.3 Write property test for submit button disabled state — Property 6: Submit button is disabled while submitting
    - **Property 6: Submit button is disabled while submitting**
    - **Validates: Requirements 5.1**
  - [x] 5.4 Implement create mode: call `createTask`, show loading state on submit button, show success message and reset fields on success, show error banner and retain values on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1_
  - [ ]* 5.5 Write property test for form reset after successful submission — Property 3: Form resets after successful submission
    - **Property 3: Form resets after successful submission**
    - **Validates: Requirements 3.3**
  - [x] 5.6 Implement edit mode: accept optional `taskId` prop, fetch existing task on mount, populate fields, call `updateTask` on submit
    - _Requirements: 7.1, 7.2_

- [x] 6. Rewrite Taskboard component
  - [x] 6.1 Rewrite `app/components/Taskboard.tsx` as a `'use client'` component — fetch all tasks via `fetchAllTasks` on mount, show loading indicator while fetching, show error message on fetch failure
    - _Requirements: 4.1, 4.5, 5.2_
  - [x] 6.2 Implement `detectAndMarkOverdue` inside Taskboard — filter tasks where `due_date < today` and status is `'Unstarted'` or `'In Progress'`, batch update to `'Overdue'` via `updateTaskStatus`
    - _Requirements: 6.1_
  - [ ]* 6.3 Write property test for overdue detection — Property 7: Overdue detection is correct and idempotent
    - **Property 7: Overdue detection is correct and idempotent**
    - **Validates: Requirements 6.1**
  - [x] 6.4 Group fetched tasks by status into four labeled sections: Unstarted, In Progress, Complete, Overdue — show empty-section message when a section has no tasks
    - _Requirements: 4.2, 4.4_
  - [ ]* 6.5 Write property test for task grouping — Property 4: Tasks are grouped by status
    - **Property 4: Tasks are grouped by status**
    - **Validates: Requirements 4.2**

- [x] 7. TaskCard component
  - [x] 7.1 Create `app/components/TaskCard.tsx` — display task name, subject, due date, priority, and status; render completion outcome badge for tasks in Complete section
    - _Requirements: 4.3, 8.5_
  - [ ]* 7.2 Write property test for TaskCard display — Property 5: Task card displays required fields
    - **Property 5: Task card displays required fields**
    - **Validates: Requirements 4.3**
  - [x] 7.3 Add "Start" action button — calls `updateTaskStatus(id, 'In Progress')` with optimistic local state update; revert on error
    - _Requirements: 6.4, 6.5_
  - [x] 7.4 Add "Complete" action button — calls `updateTaskStatus(id, 'Complete')`, stops active timer session, calls `recordCompletion`; optimistic update with revert on error
    - _Requirements: 6.2, 6.3, 8.1, 9.6_
  - [x] 7.5 Add "Edit" action button — navigates to `/tasks?taskId=<id>` or opens TaskForm in edit mode
    - _Requirements: 7.1_
  - [x] 7.6 Add "Delete" action button — shows confirmation prompt, calls `deleteTask` on confirm, removes card from local state; shows error and retains card on failure
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 8. SubtaskList component
  - [x] 8.1 Create `app/components/SubtaskList.tsx` — render subtasks nested under their parent TaskCard, showing name and completion checkbox
    - _Requirements: 10.6_
  - [ ]* 8.2 Write property test for subtask nesting — Property 18: Subtasks are nested under correct parent
    - **Property 18: Subtasks are nested under correct parent**
    - **Validates: Requirements 10.6**
  - [x] 8.3 Implement add subtask inline form — calls `addSubtask`, optimistic update with revert on error
    - _Requirements: 10.1, 10.2_
  - [x] 8.4 Implement toggle, edit, and delete subtask actions — each calls the corresponding service function with optimistic update and error revert
    - _Requirements: 10.3, 10.4, 10.5, 10.8_
  - [x] 8.5 Show "all subtasks done" visual indicator when every subtask under a task has `completed = true`, without changing the parent task's status
    - _Requirements: 10.7_
  - [ ]* 8.6 Write property test for all-subtasks-complete indicator — Property 19: All-subtasks-complete indicator does not auto-complete parent
    - **Property 19: All-subtasks-complete indicator does not auto-complete parent**
    - **Validates: Requirements 10.7**

- [x] 9. TaskTimer component
  - [x] 9.1 Create `app/components/TaskTimer.tsx` — render start/stop button and elapsed time display; initialize `totalSeconds` from sum of existing completed sessions via `computeTotalSeconds`
    - _Requirements: 9.3, 9.4, 9.5_
  - [x] 9.2 Implement start timer: call `startTimeSession`, store returned session id, start `setInterval` updating elapsed display every second; show error and do not start on Supabase failure
    - _Requirements: 9.1, 9.7_
  - [x] 9.3 Implement stop timer: call `stopTimeSession`, clear interval, recompute total from all sessions; show error and do not stop on Supabase failure
    - _Requirements: 9.2, 9.7_
  - [ ]* 9.4 Write property test for timer stop-on-complete — Property 15: Completing a task stops the active timer
    - **Property 15: Completing a task stops the active timer**
    - **Validates: Requirements 9.6**

- [ ] 10. Checkpoint — Ensure all component tests pass, ask the user if questions arise.

- [-] 11. Wire up pages
  - [x] 11.1 Rewrite `app/tasks/page.tsx` as a `'use client'` page — read optional `taskId` from search params, render `<TaskForm taskId={taskId} />` with Navbar
    - _Requirements: 1.6, 7.1_
  - [x] 11.2 Verify `app/dashboard/page.tsx` renders `<Taskboard />` — update import if the component path changed; no structural changes needed unless Taskboard import is broken
    - _Requirements: 4.1, 4.2_

- [x] 12. Install fast-check and configure test infrastructure
  - [x] 12.1 Run `npm install --save-dev fast-check vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` and add a `vitest.config.ts` with jsdom environment
    - _Requirements: (test infrastructure)_
  - [x] 12.2 Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: (test infrastructure)_

- [x] 13. Write unit tests for concrete scenarios and error conditions
  - [x]* 13.1 Write unit tests for `validateTaskForm` — test each required field individually, boundary values (100 chars, 101 chars, 500 chars, 501 chars), and a fully valid input
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x]* 13.2 Write unit tests for `computeOutcome` — test same-day boundary, one day before due, one day after due, and far future/past dates
    - _Requirements: 8.2, 8.3, 8.4_
  - [x]* 13.3 Write unit tests for `computeTotalSeconds` — test empty array, single session, multiple sessions, and sessions with null `ended_at` (should be excluded)
    - _Requirements: 9.4, 9.5_
  - [ ]* 13.4 Write unit tests for TaskForm rendering — form renders all required fields, empty section shows placeholder message, delete action shows confirmation prompt
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.3_
  - [ ]* 13.5 Write unit tests for Supabase error paths — mock Supabase to return errors for insert, fetch, update, delete, timer start/stop, and subtask operations; assert correct error messages and state retention
    - _Requirements: 3.4, 4.5, 7.5, 9.7, 10.8_

- [ ] 14. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 4, 10, and 14 ensure incremental validation
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Each property test must include the comment tag: `// Feature: task-creation, Property {N}: {property_text}`
- Unit tests and property tests are complementary — unit tests cover concrete examples and error paths, property tests verify universal correctness
