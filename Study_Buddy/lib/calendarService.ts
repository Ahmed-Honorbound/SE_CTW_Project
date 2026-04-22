// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType = 'class' | 'task' | 'work' | 'personal' | 'appointment';

export interface CalendarEvent {
  id: string;           // UUID, assigned by Supabase
  title: string;
  type: EventType;
  start: string;        // ISO timestamptz
  end: string | null;   // ISO timestamptz, nullable
  color: string;        // hex color derived from COLOR_MAP
  created_at: string;   // ISO timestamptz
}

export interface CalendarEventFormValues {
  title: string;
  type: EventType;
  start: string;        // datetime-local value (ISO-compatible)
  end: string;          // datetime-local value, may be empty string
}

export interface WeeklyGoal {
  id: number;           // always 1 (single-row pattern)
  weekly_goal: number;
  updated_at: string;
}

// ─── Color Map (pure constant) ────────────────────────────────────────────────

export const COLOR_MAP: Record<EventType, string> = {
  class:       '#4e73df',
  task:        '#e74a3b',
  work:        '#36b9cc',
  personal:    '#1cc88a',
  appointment: '#f6c23e',
};

// ─── Pure computation functions ───────────────────────────────────────────────

/** Returns the hex color for a given event type from COLOR_MAP. */
export function deriveColor(type: EventType): string {
  return COLOR_MAP[type];
}

/**
 * Validates a CalendarEventFormValues object.
 * Returns null if valid, or an error message string if invalid.
 * Rules:
 *   - title must be non-empty (not purely whitespace)
 *   - start must be non-empty
 *   - if end is non-empty, end must be strictly after start
 */
export function validateEventForm(values: CalendarEventFormValues): string | null {
  if (!values.title || values.title.trim() === '') {
    return 'Title is required.';
  }
  if (!values.start) {
    return 'Start time is required.';
  }
  if (values.end !== '' && values.end <= values.start) {
    return 'End time must be after start time.';
  }
  return null;
}

/** Returns true if goal is a finite integer >= 1. */
export function isValidWeeklyGoal(value: unknown): value is number {
  if (typeof value !== 'number') return false;
  if (!isFinite(value)) return false;
  if (value % 1 !== 0) return false;
  if (value < 1) return false;
  return true;
}

/**
 * Returns the ISO week bounds (Monday 00:00:00.000 and Sunday 23:59:59.999)
 * for the ISO week containing the given date, in local time.
 */
export function getISOWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Computes available hours for a given local date.
 * Formula: max(0, 24 - 8 - totalEventHoursOnDate)
 * Only counts events whose start date (local) matches dateStr (YYYY-MM-DD)
 * and that have a non-null end.
 */
export function computeAvailableHours(events: CalendarEvent[], dateStr: string): number {
  let totalHours = 0;
  for (const event of events) {
    if (event.end === null) continue;
    const localDate = new Date(event.start).toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (localDate !== dateStr) continue;
    const durationHours =
      (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
    totalHours += durationHours;
  }
  return Math.max(0, 24 - 8 - totalHours);
}

/**
 * Computes total study hours for the ISO week containing referenceDate.
 * Only counts events whose title contains "study" (case-insensitive),
 * whose start falls within Monday 00:00–Sunday 23:59:59.999 local time of that week,
 * and that have a non-null end.
 * Duration = (end - start) in hours.
 */
export function computeWeeklyStudyHours(events: CalendarEvent[], referenceDate: Date): number {
  const { weekStart, weekEnd } = getISOWeekBounds(referenceDate);
  let totalHours = 0;
  for (const event of events) {
    if (event.end === null) continue;
    if (!event.title.toLowerCase().includes('study')) continue;
    const eventStart = new Date(event.start);
    if (eventStart < weekStart || eventStart > weekEnd) continue;
    const durationHours =
      (new Date(event.end).getTime() - eventStart.getTime()) / (1000 * 60 * 60);
    totalHours += durationHours;
  }
  return totalHours;
}

/**
 * Returns true if the badge should be shown.
 * alreadyShown: whether this badge has already been displayed this session.
 * condition: whether the trigger condition is currently met.
 */
export function shouldShowBadge(alreadyShown: boolean, condition: boolean): boolean {
  if (alreadyShown) return false;
  return condition;
}

import { supabase } from './supabase';

// ─── Supabase I/O ─────────────────────────────────────────────────────────────

/** Fetches all calendar events ordered by start ascending. */
export async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start', { ascending: true });

  if (error) throw new Error(error.message);
  return data as CalendarEvent[];
}

/** Inserts a new calendar event and returns the created row. */
export async function createEvent(values: CalendarEventFormValues): Promise<CalendarEvent> {
  const color = deriveColor(values.type);
  const startUTC = new Date(values.start).toISOString();
  const endUTC = values.end !== '' ? new Date(values.end).toISOString() : null;
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      title: values.title.trim(),
      type: values.type,
      start: startUTC,
      end: endUTC,
      color,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

/** Fetches the stored weekly goal. Returns null if no row exists. */
export async function fetchWeeklyGoal(): Promise<number | null> {
  const { data, error } = await supabase
    .from('study_goals')
    .select('weekly_goal')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? data.weekly_goal : null;
}

/** Upserts the weekly goal (single-row, id=1). */
export async function upsertWeeklyGoal(goal: number): Promise<void> {
  const { error } = await supabase
    .from('study_goals')
    .upsert({ id: 1, weekly_goal: goal, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}

/** Deletes a calendar event by id. */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** Updates an existing calendar event's title, type, start, end, and color. */
export async function updateEvent(id: string, values: CalendarEventFormValues): Promise<CalendarEvent> {
  const color = deriveColor(values.type);
  const startUTC = new Date(values.start).toISOString();
  const endUTC = values.end !== '' ? new Date(values.end).toISOString() : null;
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      title: values.title.trim(),
      type: values.type,
      start: startUTC,
      end: endUTC,
      color,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}
