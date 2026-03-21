# Requirements Document

## Introduction

The Task Creation feature gives the Smart Study Planner's existing task form real functionality. Users can create tasks with details (name, subject, due date, priority), manage their lifecycle (Unstarted → In Progress → Complete / Overdue), track time spent per session, and break work down into subtasks. All data is persisted in Supabase and reflected on the Taskboard in real time.

## Glossary

- **Task_Form**: The UI form at `/tasks` where users enter task details
- **Task**: A study task record with fields: name, subject, due date, priority, status, and optional description
- **Subtask**: A child task record linked to a parent Task, with its own name, description, and completion state
- **Taskboard**: The dashboard component that displays tasks grouped by status section
- **Supabase_Client**: The initialized Supabase JS client used to read and write all application data
- **Priority**: A categorical value representing task urgency — one of: Low, Medium, High
- **Due_Date**: A calendar date representing when the task must be completed
- **Status**: The current lifecycle state of a Task — one of: Unstarted, In Progress, Complete, Overdue
- **Tag**: A subject/category label attached to a Task (e.g., "Math", "History")
- **Time_Session**: A recorded interval of time spent actively working on a Task, with a start timestamp and an end timestamp
- **Completion_Record**: Metadata stored when a Task is marked complete, capturing whether it was completed ahead of time, on time, or overdue
- **Task_Timer**: The UI control that starts and stops a Time_Session for a given Task

## Requirements

### Requirement 1: Task Form Input

**User Story:** As a student, I want to fill in a structured form with my task details, so that I can capture all the information needed to plan my study session.

#### Acceptance Criteria

1. THE Task_Form SHALL include a text input for task name (required, max 100 characters)
2. THE Task_Form SHALL include a text input for subject/tag (required, max 50 characters)
3. THE Task_Form SHALL include a date input for due date (required)
4. THE Task_Form SHALL include a dropdown selector for priority with options: Low, Medium, High (required)
5. THE Task_Form SHALL include an optional text area for task description (max 500 characters)
6. WHEN the Task_Form is first rendered, THE Task_Form SHALL display all fields in an empty/default state

### Requirement 2: Task Form Validation

**User Story:** As a student, I want the form to catch missing or invalid input before saving, so that I don't accidentally create incomplete tasks.

#### Acceptance Criteria

1. WHEN the user submits the Task_Form with one or more empty required fields, THE Task_Form SHALL display an inline error message identifying each missing field
2. WHEN the user enters a task name exceeding 100 characters, THE Task_Form SHALL display an error message stating the character limit
3. WHEN the user enters a description exceeding 500 characters, THE Task_Form SHALL display an error message stating the character limit
4. IF validation fails, THEN THE Task_Form SHALL prevent submission and SHALL NOT send data to the Supabase_Client

### Requirement 3: Task Persistence

**User Story:** As a student, I want my task to be saved to the database when I click Save, so that my tasks persist across sessions.

#### Acceptance Criteria

1. WHEN the user submits a valid Task_Form, THE Supabase_Client SHALL insert a new Task record with status set to Unstarted
2. WHEN the Supabase_Client successfully inserts a Task, THE Task_Form SHALL display a success confirmation message
3. WHEN the Supabase_Client successfully inserts a Task, THE Task_Form SHALL reset all fields to their default empty state
4. IF the Supabase_Client returns an error during insertion, THEN THE Task_Form SHALL display an error message and SHALL retain the user's entered values

### Requirement 4: Task Display on Taskboard

**User Story:** As a student, I want to see my saved tasks grouped by status on the Taskboard, so that I can quickly understand what needs attention.

#### Acceptance Criteria

1. WHEN the Taskboard is rendered, THE Taskboard SHALL fetch all Task records from the Supabase_Client
2. THE Taskboard SHALL display tasks in four labeled sections: Unstarted, In Progress, Complete, and Overdue
3. THE Taskboard SHALL display each Task's name, subject tag, due date, priority, and status within its corresponding section
4. WHEN no Task records exist in a section, THE Taskboard SHALL display a message indicating that section is empty
5. IF the Supabase_Client returns an error during fetch, THEN THE Taskboard SHALL display an error message in place of the task list

### Requirement 5: Loading States

**User Story:** As a student, I want visual feedback while my task is being saved or loaded, so that I know the app is working and haven't accidentally submitted twice.

#### Acceptance Criteria

1. WHILE a form submission is in progress, THE Task_Form SHALL disable the submit button and display a loading indicator
2. WHILE the Taskboard is fetching tasks, THE Taskboard SHALL display a loading indicator in place of the task list

### Requirement 6: Task Status Management

**User Story:** As a student, I want my tasks to move between status sections automatically and manually, so that my Taskboard always reflects the real state of my work.

#### Acceptance Criteria

1. WHEN a Task's Due_Date passes and the Task status is Unstarted or In Progress, THE Supabase_Client SHALL update the Task status to Overdue
2. WHEN the user marks a Task as complete, THE Taskboard SHALL move the Task to the Complete section
3. WHEN the user marks a Task as complete, THE Supabase_Client SHALL update the Task status to Complete
4. WHEN the user initiates work on a Task with status Unstarted, THE Supabase_Client SHALL update the Task status to In Progress
5. THE Taskboard SHALL reflect status changes without requiring a full page reload

### Requirement 7: Task Editing and Deletion

**User Story:** As a student, I want to edit or delete tasks, so that I can keep my task list accurate as my schedule changes.

#### Acceptance Criteria

1. WHEN the user selects the edit action on a Task, THE Task_Form SHALL populate with the Task's existing values
2. WHEN the user submits an edited Task_Form, THE Supabase_Client SHALL update the existing Task record with the new values
3. WHEN the user selects the delete action on a Task, THE Taskboard SHALL display a confirmation prompt before deletion
4. WHEN the user confirms deletion, THE Supabase_Client SHALL delete the Task record and all associated Subtask and Time_Session records
5. IF the Supabase_Client returns an error during update or deletion, THEN THE Taskboard SHALL display an error message and retain the Task in its current state

### Requirement 8: Completion Metadata Recording

**User Story:** As a student, I want the app to record whether I finished tasks on time, so that I can review my study habits over time.

#### Acceptance Criteria

1. WHEN the user marks a Task as complete, THE Supabase_Client SHALL create a Completion_Record storing the completion timestamp and the Task's Due_Date
2. WHEN the completion timestamp is before the Due_Date, THE Completion_Record SHALL store the outcome as "ahead of time"
3. WHEN the completion timestamp is on the same calendar day as the Due_Date, THE Completion_Record SHALL store the outcome as "on time"
4. WHEN the completion timestamp is after the Due_Date, THE Completion_Record SHALL store the outcome as "overdue"
5. THE Taskboard SHALL display the completion outcome on each Task in the Complete section

### Requirement 9: Time Tracking Sessions

**User Story:** As a student, I want to start and stop a timer while working on a task, so that I can see how much time I've spent on each assignment.

#### Acceptance Criteria

1. WHEN the user starts the Task_Timer on a Task, THE Supabase_Client SHALL create a new Time_Session record with the current timestamp as the start time
2. WHEN the user stops the Task_Timer on a Task, THE Supabase_Client SHALL update the active Time_Session record with the current timestamp as the end time
3. WHILE a Task_Timer is running, THE Taskboard SHALL display an elapsed time counter on the active Task
4. WHEN a Task has one or more completed Time_Session records, THE Taskboard SHALL display the total accumulated time for that Task
5. THE Task_Timer SHALL support multiple Time_Session records per Task, allowing work to be paused and resumed across separate sessions
6. WHEN the user marks a Task as complete, THE Task_Timer SHALL stop any active Time_Session for that Task
7. IF the Supabase_Client returns an error when creating or updating a Time_Session, THEN THE Task_Timer SHALL display an error message and SHALL NOT start or stop the timer

### Requirement 10: Subtasks

**User Story:** As a student, I want to break a large task into subtasks, so that I can track smaller steps toward completing an assignment.

#### Acceptance Criteria

1. WHEN the user adds a subtask to a Task, THE Supabase_Client SHALL insert a new Subtask record linked to the parent Task
2. THE Subtask SHALL include a name (required, max 100 characters) and an optional description (max 500 characters)
3. WHEN the user marks a Subtask as complete, THE Supabase_Client SHALL update the Subtask record's completion state to true
4. WHEN the user edits a Subtask, THE Supabase_Client SHALL update the Subtask record with the new values
5. WHEN the user deletes a Subtask, THE Supabase_Client SHALL delete the Subtask record
6. THE Taskboard SHALL display all Subtasks nested under their parent Task, showing each Subtask's name and completion state
7. WHEN all Subtasks under a Task are marked complete, THE Taskboard SHALL visually indicate that all subtasks are done without automatically completing the parent Task
8. IF the Supabase_Client returns an error during any Subtask operation, THEN THE Taskboard SHALL display an error message and retain the Subtask in its previous state
