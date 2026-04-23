import type { SupabaseClient } from '@supabase/supabase-js';
import { Task, TimeSession, CompletionRecord } from './types';

type Db = SupabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawAnalyticsData {
  tasks: Task[];
}

export interface OutcomeCounts {
  completed: number;
  aheadOfTime: number;
  onTime: number;
  overdue: number;
}

export interface SubjectStats {
  subject: string;
  totalSeconds: number;
  outcomes: OutcomeCounts;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  outcomes: OutcomeCounts;
  totalSeconds: number;
  busiestDay: string | null;
  longestTask: { name: string; subject: string; totalSeconds: number } | null;
}

export interface MonthlyStats extends Omit<WeeklyStats, 'weekStart' | 'weekEnd'> {
  month: number;
  year: number;
  subjectStats: SubjectStats[];
  mostTimeSubject: string | null;
  leastTimeSubject: string | null;
  subjectMostCompleted: string | null;
  subjectMostOverdue: string | null;
  subjectMostAheadOfTime: string | null;
}

export interface Suggestions {
  focusSubjects: string[];
  mostProductiveDays: string[];
  mostProductiveHours: number[];
  avoidSubjects: string[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function zeroOutcomes(): OutcomeCounts {
  return { completed: 0, aheadOfTime: 0, onTime: 0, overdue: 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sessionDurationSeconds(session: TimeSession): number {
  if (!session.ended_at) return 0;
  const start = new Date(session.started_at).getTime();
  const end = new Date(session.ended_at).getTime();
  if (end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

export function filterSessionsInWindow(
  sessions: TimeSession[],
  windowStart: Date,
  windowEnd: Date
): TimeSession[] {
  const start = windowStart.getTime();
  const end = windowEnd.getTime();
  return sessions.filter(s => {
    if (!s.ended_at) return false;
    const t = new Date(s.started_at).getTime();
    return t >= start && t < end;
  });
}

export function filterCompletionsInWindow(
  records: CompletionRecord[],
  windowStart: Date,
  windowEnd: Date
): CompletionRecord[] {
  const start = windowStart.getTime();
  const end = windowEnd.getTime();
  return records.filter(r => {
    const t = new Date(r.completed_at).getTime();
    return t >= start && t < end;
  });
}

// ─── Weekly Stats ─────────────────────────────────────────────────────────────

export function computeWeeklyStats(data: RawAnalyticsData, weekStart: Date): WeeklyStats {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const outcomes = zeroOutcomes();
  let totalSeconds = 0;
  const dayBuckets: Record<string, number> = {};
  const taskSeconds: Record<string, number> = {};

  for (const task of data.tasks) {
    const sessions = filterSessionsInWindow(task.time_sessions ?? [], weekStart, weekEnd);
    for (const session of sessions) {
      const secs = sessionDurationSeconds(session);
      totalSeconds += secs;
      const day = DAY_NAMES[new Date(session.started_at).getDay()];
      dayBuckets[day] = (dayBuckets[day] ?? 0) + secs;
      taskSeconds[task.id] = (taskSeconds[task.id] ?? 0) + secs;
    }

    const completions = filterCompletionsInWindow(task.completion_records ?? [], weekStart, weekEnd);
    for (const record of completions) {
      outcomes.completed++;
      if (record.outcome === 'ahead of time') outcomes.aheadOfTime++;
      else if (record.outcome === 'on time') outcomes.onTime++;
      else outcomes.overdue++;
    }
  }

  const busiestDay = Object.keys(dayBuckets).length > 0
    ? Object.entries(dayBuckets).reduce((a, b) => b[1] > a[1] ? b : a)[0]
    : null;

  let longestTask: WeeklyStats['longestTask'] = null;
  if (Object.keys(taskSeconds).length > 0) {
    const [topId, topSecs] = Object.entries(taskSeconds).reduce((a, b) => b[1] > a[1] ? b : a);
    const task = data.tasks.find(t => t.id === topId);
    if (task) longestTask = { name: task.name, subject: task.subject, totalSeconds: topSecs };
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    outcomes,
    totalSeconds,
    busiestDay,
    longestTask,
  };
}

// ─── Monthly Stats ────────────────────────────────────────────────────────────

export function computeMonthlyStats(data: RawAnalyticsData, month: number, year: number): MonthlyStats {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const outcomes = zeroOutcomes();
  let totalSeconds = 0;
  const dayBuckets: Record<string, number> = {};
  const taskSeconds: Record<string, number> = {};
  const subjectMap: Record<string, SubjectStats> = {};

  for (const task of data.tasks) {
    const sessions = filterSessionsInWindow(task.time_sessions ?? [], monthStart, monthEnd);
    const completions = filterCompletionsInWindow(task.completion_records ?? [], monthStart, monthEnd);

    if (sessions.length === 0 && completions.length === 0) continue;

    if (!subjectMap[task.subject]) {
      subjectMap[task.subject] = { subject: task.subject, totalSeconds: 0, outcomes: zeroOutcomes() };
    }

    for (const session of sessions) {
      const secs = sessionDurationSeconds(session);
      totalSeconds += secs;
      const day = DAY_NAMES[new Date(session.started_at).getDay()];
      dayBuckets[day] = (dayBuckets[day] ?? 0) + secs;
      taskSeconds[task.id] = (taskSeconds[task.id] ?? 0) + secs;
      subjectMap[task.subject].totalSeconds += secs;
    }

    for (const record of completions) {
      outcomes.completed++;
      subjectMap[task.subject].outcomes.completed++;
      if (record.outcome === 'ahead of time') {
        outcomes.aheadOfTime++;
        subjectMap[task.subject].outcomes.aheadOfTime++;
      } else if (record.outcome === 'on time') {
        outcomes.onTime++;
        subjectMap[task.subject].outcomes.onTime++;
      } else {
        outcomes.overdue++;
        subjectMap[task.subject].outcomes.overdue++;
      }
    }
  }

  const busiestDay = Object.keys(dayBuckets).length > 0
    ? Object.entries(dayBuckets).reduce((a, b) => b[1] > a[1] ? b : a)[0]
    : null;

  let longestTask: WeeklyStats['longestTask'] = null;
  if (Object.keys(taskSeconds).length > 0) {
    const [topId, topSecs] = Object.entries(taskSeconds).reduce((a, b) => b[1] > a[1] ? b : a);
    const task = data.tasks.find(t => t.id === topId);
    if (task) longestTask = { name: task.name, subject: task.subject, totalSeconds: topSecs };
  }

  const subjectStats = Object.values(subjectMap).sort((a, b) => b.totalSeconds - a.totalSeconds);

  const withTime = subjectStats.filter(s => s.totalSeconds > 0);
  const mostTimeSubject = withTime.length > 0 ? withTime[0].subject : null;
  const leastTimeSubject = withTime.length >= 2 ? withTime[withTime.length - 1].subject : null;

  const withCompletions = subjectStats.filter(s => s.outcomes.completed > 0);
  const subjectMostCompleted = withCompletions.length > 0
    ? withCompletions.reduce((a, b) => b.outcomes.completed > a.outcomes.completed ? b : a).subject
    : null;
  const subjectMostOverdue = withCompletions.length > 0
    ? withCompletions.reduce((a, b) => b.outcomes.overdue > a.outcomes.overdue ? b : a).subject
    : null;
  const subjectMostAheadOfTime = withCompletions.length > 0
    ? withCompletions.reduce((a, b) => b.outcomes.aheadOfTime > a.outcomes.aheadOfTime ? b : a).subject
    : null;

  return {
    month, year, outcomes, totalSeconds, busiestDay, longestTask,
    subjectStats, mostTimeSubject, leastTimeSubject,
    subjectMostCompleted, subjectMostOverdue, subjectMostAheadOfTime,
  };
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

export function computeSuggestions(data: RawAnalyticsData): Suggestions {
  const subjectOutcomes: Record<string, OutcomeCounts> = {};
  const dayCompletions: Record<string, { completed: number; onTimeOrAhead: number }> = {};
  const hourCounts: Record<number, number> = {};

  for (const task of data.tasks) {
    for (const record of task.completion_records ?? []) {
      if (!subjectOutcomes[task.subject]) subjectOutcomes[task.subject] = zeroOutcomes();
      subjectOutcomes[task.subject].completed++;
      if (record.outcome === 'ahead of time') subjectOutcomes[task.subject].aheadOfTime++;
      else if (record.outcome === 'on time') subjectOutcomes[task.subject].onTime++;
      else subjectOutcomes[task.subject].overdue++;

      const day = DAY_NAMES[new Date(record.completed_at).getDay()];
      if (!dayCompletions[day]) dayCompletions[day] = { completed: 0, onTimeOrAhead: 0 };
      dayCompletions[day].completed++;
      if (record.outcome !== 'overdue') dayCompletions[day].onTimeOrAhead++;
    }

    for (const session of task.time_sessions ?? []) {
      const hour = new Date(session.started_at).getHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    }
  }

  const focusSubjects = Object.entries(subjectOutcomes)
    .filter(([, o]) => o.completed >= 2 && o.overdue / o.completed > 0.5)
    .sort((a, b) => (b[1].overdue / b[1].completed) - (a[1].overdue / a[1].completed))
    .map(([s]) => s);

  const focusSet = new Set(focusSubjects);

  const avoidSubjects = Object.entries(subjectOutcomes)
    .filter(([s, o]) => !focusSet.has(s) && o.completed >= 3 && o.overdue / o.completed > 0.7)
    .sort((a, b) => (b[1].overdue / b[1].completed) - (a[1].overdue / a[1].completed))
    .map(([s]) => s);

  const mostProductiveDays = Object.entries(dayCompletions)
    .filter(([, d]) => d.completed >= 2)
    .sort((a, b) => (b[1].onTimeOrAhead / b[1].completed) - (a[1].onTimeOrAhead / a[1].completed))
    .slice(0, 3)
    .map(([day]) => day);

  const mostProductiveHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => Number(h));

  return { focusSubjects, mostProductiveDays, mostProductiveHours, avoidSubjects };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchAnalyticsData(supabase: Db, userId: string): Promise<RawAnalyticsData> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, name, subject, status, due_date, created_at,
      time_sessions ( id, task_id, started_at, ended_at ),
      completion_records ( id, task_id, completed_at, due_date, outcome )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return { tasks: (data ?? []) as Task[] };
}
