export type EventType = 'class' | 'task' | 'work' | 'personal' | 'appointment';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  start: string;
  end: string | null;
  color: string;
  created_at: string;
}

export interface CalendarEventFormValues {
  title: string;
  type: EventType;
  start: string;
  end: string;
}

export interface WeeklyGoal {
  id: number;
  weekly_goal: number;
  updated_at: string;
}

export const COLOR_MAP: Record<EventType, string> = {
  class:       '#4e73df',
  task:        '#e74a3b',
  work:        '#36b9cc',
  personal:    '#1cc88a',
  appointment: '#f6c23e',
};

export function deriveColor(type: EventType): string {
  return COLOR_MAP[type];
}

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

export function isValidWeeklyGoal(value: unknown): value is number {
  if (typeof value !== 'number') return false;
  if (!isFinite(value)) return false;
  if (value % 1 !== 0) return false;
  if (value < 1) return false;
  return true;
}

export function getISOWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export function computeAvailableHours(events: CalendarEvent[], dateStr: string): number {
  let totalHours = 0;
  for (const event of events) {
    if (event.end === null) continue;
    const localDate = new Date(event.start).toLocaleDateString('en-CA');
    if (localDate !== dateStr) continue;
    const durationHours =
      (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
    totalHours += durationHours;
  }
  return Math.max(0, 24 - 8 - totalHours);
}

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

export function shouldShowBadge(alreadyShown: boolean, condition: boolean): boolean {
  if (alreadyShown) return false;
  return condition;
}
