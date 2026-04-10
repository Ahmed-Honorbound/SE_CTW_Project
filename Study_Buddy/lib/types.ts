export type Priority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Unstarted' | 'In Progress' | 'Complete' | 'Overdue';
export type CompletionOutcome = 'ahead of time' | 'on time' | 'overdue';

export interface Task {
  id: string;
  name: string;
  subject: string;
  due_date: string; // ISO date string YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
  description?: string;
  created_at: string;
  subtasks?: Subtask[];
  time_sessions?: TimeSession[];
  completion_records?: CompletionRecord[];
}

export interface Subtask {
  id: string;
  task_id: string;
  name: string;
  description?: string;
  completed: boolean;
  created_at: string;
}

export interface TimeSession {
  id: string;
  task_id: string;
  started_at: string; // ISO timestamp
  ended_at?: string;  // null if active
}

export interface CompletionRecord {
  id: string;
  task_id: string;
  completed_at: string;
  due_date: string;
  outcome: CompletionOutcome;
}

export interface TaskFormValues {
  name: string;
  subject: string;
  due_date: string;
  priority: Priority;
  description: string;
}

export interface ValidationErrors {
  name?: string;
  subject?: string;
  due_date?: string;
  priority?: string;
  description?: string;
}
