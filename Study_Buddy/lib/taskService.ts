import { supabase } from './supabase';
import {
  Task,
  TaskFormValues,
  TaskStatus,
  Subtask,
  TimeSession,
  CompletionRecord,
  CompletionOutcome,
} from './types';

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function fetchAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*), time_sessions(*), completion_records(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Task[];
}

export async function createTask(values: TaskFormValues): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...values, status: 'Unstarted' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(id: string, values: Partial<TaskFormValues>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(values)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function uncompleteTask(id: string): Promise<void> {
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'In Progress' })
    .eq('id', id);
  if (statusError) throw new Error(statusError.message);

  const { error: recordError } = await supabase
    .from('completion_records')
    .delete()
    .eq('task_id', id);
  if (recordError) throw new Error(recordError.message);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Completion ───────────────────────────────────────────────────────────────

export function computeOutcome(completedAt: Date, dueDate: string): CompletionOutcome {
  // Compare using UTC date strings to avoid timezone-induced day shifts
  const completedDay = completedAt.toISOString().split('T')[0];
  const dueDay = dueDate; // already YYYY-MM-DD

  if (completedDay < dueDay) return 'ahead of time';
  if (completedDay === dueDay) return 'on time';
  return 'overdue';
}

export async function recordCompletion(taskId: string, dueDate: string): Promise<CompletionRecord> {
  const completedAt = new Date();
  const outcome = computeOutcome(completedAt, dueDate);

  const { data, error } = await supabase
    .from('completion_records')
    .insert({
      task_id: taskId,
      completed_at: completedAt.toISOString(),
      due_date: dueDate,
      outcome,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CompletionRecord;
}

// ─── Time Sessions ────────────────────────────────────────────────────────────

export async function startTimeSession(taskId: string): Promise<TimeSession> {
  const { data, error } = await supabase
    .from('time_sessions')
    .insert({ task_id: taskId, started_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TimeSession;
}

export async function stopTimeSession(sessionId: string): Promise<TimeSession> {
  const { data, error } = await supabase
    .from('time_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TimeSession;
}

export function computeTotalSeconds(sessions: TimeSession[]): number {
  return sessions.reduce((total, session) => {
    if (!session.ended_at) return total;
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ended_at).getTime();
    return total + Math.floor((end - start) / 1000);
  }, 0);
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function addSubtask(taskId: string, name: string, description?: string): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, name, description })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subtask;
}

export async function toggleSubtask(subtaskId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .update({ completed })
    .eq('id', subtaskId);

  if (error) throw new Error(error.message);
}

export async function updateSubtask(subtaskId: string, name: string, description?: string): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .update({ name, description })
    .eq('id', subtaskId);

  if (error) throw new Error(error.message);
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) throw new Error(error.message);
}
