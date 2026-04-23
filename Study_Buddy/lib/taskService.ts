import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Task,
  TaskFormValues,
  TaskStatus,
  Subtask,
  TimeSession,
  CompletionRecord,
  CompletionOutcome,
} from './types';

type Db = SupabaseClient;

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function fetchAllTasks(supabase: Db, userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*), time_sessions(*), completion_records(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

export async function fetchTask(supabase: Db, id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*), time_sessions(*), completion_records(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function createTask(supabase: Db, values: TaskFormValues, userId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...values, status: 'Unstarted', user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(supabase: Db, id: string, values: Partial<TaskFormValues>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(values)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTaskStatus(supabase: Db, id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function uncompleteTask(supabase: Db, id: string): Promise<void> {
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

export async function deleteTask(supabase: Db, id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Completion ───────────────────────────────────────────────────────────────

export function computeOutcome(completedAt: Date, dueDate: string): CompletionOutcome {
  const completedDay = completedAt.toISOString().split('T')[0];
  const dueDay = dueDate;

  if (completedDay < dueDay) return 'ahead of time';
  if (completedDay === dueDay) return 'on time';
  return 'overdue';
}

export async function recordCompletion(supabase: Db, taskId: string, dueDate: string): Promise<CompletionRecord> {
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

export async function startTimeSession(supabase: Db, taskId: string): Promise<TimeSession> {
  const { data, error } = await supabase
    .from('time_sessions')
    .insert({ task_id: taskId, started_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TimeSession;
}

export async function stopTimeSession(supabase: Db, sessionId: string): Promise<TimeSession> {
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

export async function addSubtask(supabase: Db, taskId: string, name: string, description?: string): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, name, description })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subtask;
}

export async function toggleSubtask(supabase: Db, subtaskId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .update({ completed })
    .eq('id', subtaskId);

  if (error) throw new Error(error.message);
}

export async function updateSubtask(supabase: Db, subtaskId: string, name: string, description?: string): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .update({ name, description })
    .eq('id', subtaskId);

  if (error) throw new Error(error.message);
}

export async function deleteSubtask(supabase: Db, subtaskId: string): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) throw new Error(error.message);
}
