import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import {
  getWeekStart,
  sessionDurationSeconds,
  filterSessionsInWindow,
  filterCompletionsInWindow,
  computeWeeklyStats,
  computeMonthlyStats,
  computeSuggestions,
  RawAnalyticsData,
} from '../../lib/analyticsService';
import { TimeSession, CompletionRecord, Task } from '../../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(startedAt: string, endedAt?: string, taskId = 'task-1'): TimeSession {
  return { id: 'sess-' + startedAt, task_id: taskId, started_at: startedAt, ended_at: endedAt };
}

function makeRecord(completedAt: string, outcome: 'ahead of time' | 'on time' | 'overdue', taskId = 'task-1'): CompletionRecord {
  return { id: 'rec-' + completedAt, task_id: taskId, completed_at: completedAt, due_date: '2026-12-01', outcome };
}

function makeTask(id: string, subject: string, sessions: TimeSession[] = [], records: CompletionRecord[] = []): Task {
  return {
    id, name: `Task ${id}`, subject,
    due_date: '2026-12-01', priority: 'Medium', status: 'Complete', created_at: '2026-01-01T00:00:00Z',
    time_sessions: sessions, completion_records: records,
  };
}

const WEEK_START = new Date('2026-12-07T00:00:00Z'); // Monday

// ─── getWeekStart ─────────────────────────────────────────────────────────────

describe('getWeekStart', () => {
  it('returns Monday when input is Monday', () => {
    const d = new Date('2026-12-07T12:00:00Z'); // Monday
    expect(getWeekStart(d).getUTCDay()).toBe(1);
    expect(getWeekStart(d).toISOString().split('T')[0]).toBe('2026-12-07');
  });

  it('returns Monday when input is Sunday', () => {
    const d = new Date('2026-12-13T12:00:00Z'); // Sunday
    expect(getWeekStart(d).toISOString().split('T')[0]).toBe('2026-12-07');
  });

  it('returns Monday when input is Wednesday', () => {
    const d = new Date('2026-12-09T12:00:00Z'); // Wednesday
    expect(getWeekStart(d).toISOString().split('T')[0]).toBe('2026-12-07');
  });

  it('returns Monday when input is Saturday', () => {
    const d = new Date('2026-12-12T12:00:00Z'); // Saturday
    expect(getWeekStart(d).toISOString().split('T')[0]).toBe('2026-12-07');
  });

  it('returns midnight UTC', () => {
    const d = new Date('2026-12-09T15:30:00Z');
    const result = getWeekStart(d);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it('does not mutate the input date', () => {
    const d = new Date('2026-12-09T12:00:00Z');
    const original = d.getTime();
    getWeekStart(d);
    expect(d.getTime()).toBe(original);
  });
});

// ─── sessionDurationSeconds ───────────────────────────────────────────────────

describe('sessionDurationSeconds', () => {
  it('returns correct seconds for a normal session', () => {
    const s = makeSession('2026-12-07T10:00:00Z', '2026-12-07T10:01:30Z');
    expect(sessionDurationSeconds(s)).toBe(90);
  });

  it('returns 0 when ended_at equals started_at', () => {
    const s = makeSession('2026-12-07T10:00:00Z', '2026-12-07T10:00:00Z');
    expect(sessionDurationSeconds(s)).toBe(0);
  });

  it('returns 0 when ended_at is before started_at', () => {
    const s = makeSession('2026-12-07T10:00:00Z', '2026-12-07T09:00:00Z');
    expect(sessionDurationSeconds(s)).toBe(0);
  });

  it('returns 0 when ended_at is undefined', () => {
    const s = makeSession('2026-12-07T10:00:00Z');
    expect(sessionDurationSeconds(s)).toBe(0);
  });

  it('floors fractional seconds', () => {
    const s = makeSession('2026-12-07T10:00:00.000Z', '2026-12-07T10:00:00.999Z');
    expect(sessionDurationSeconds(s)).toBe(0);
  });
});

// ─── filterSessionsInWindow ───────────────────────────────────────────────────

describe('filterSessionsInWindow', () => {
  const start = new Date('2026-12-07T00:00:00Z');
  const end = new Date('2026-12-14T00:00:00Z');

  it('includes session exactly at windowStart', () => {
    const s = makeSession('2026-12-07T00:00:00Z', '2026-12-07T01:00:00Z');
    expect(filterSessionsInWindow([s], start, end)).toHaveLength(1);
  });

  it('excludes session exactly at windowEnd', () => {
    const s = makeSession('2026-12-14T00:00:00Z', '2026-12-14T01:00:00Z');
    expect(filterSessionsInWindow([s], start, end)).toHaveLength(0);
  });

  it('includes session inside window', () => {
    const s = makeSession('2026-12-10T10:00:00Z', '2026-12-10T11:00:00Z');
    expect(filterSessionsInWindow([s], start, end)).toHaveLength(1);
  });

  it('excludes session before window', () => {
    const s = makeSession('2026-12-06T10:00:00Z', '2026-12-06T11:00:00Z');
    expect(filterSessionsInWindow([s], start, end)).toHaveLength(0);
  });

  it('excludes session after window', () => {
    const s = makeSession('2026-12-15T10:00:00Z', '2026-12-15T11:00:00Z');
    expect(filterSessionsInWindow([s], start, end)).toHaveLength(0);
  });

  it('excludes session with null ended_at', () => {
    const s = makeSession('2026-12-10T10:00:00Z');
    expect(filterSessionsInWindow([s], start, end)).toHaveLength(0);
  });
});

// ─── filterCompletionsInWindow ────────────────────────────────────────────────

describe('filterCompletionsInWindow', () => {
  const start = new Date('2026-12-07T00:00:00Z');
  const end = new Date('2026-12-14T00:00:00Z');

  it('includes record exactly at windowStart', () => {
    const r = makeRecord('2026-12-07T00:00:00Z', 'on time');
    expect(filterCompletionsInWindow([r], start, end)).toHaveLength(1);
  });

  it('excludes record exactly at windowEnd', () => {
    const r = makeRecord('2026-12-14T00:00:00Z', 'on time');
    expect(filterCompletionsInWindow([r], start, end)).toHaveLength(0);
  });

  it('includes record inside window', () => {
    const r = makeRecord('2026-12-10T10:00:00Z', 'overdue');
    expect(filterCompletionsInWindow([r], start, end)).toHaveLength(1);
  });

  it('excludes record outside window', () => {
    const r = makeRecord('2026-12-01T10:00:00Z', 'on time');
    expect(filterCompletionsInWindow([r], start, end)).toHaveLength(0);
  });
});

// ─── computeWeeklyStats ───────────────────────────────────────────────────────

describe('computeWeeklyStats', () => {
  it('returns zeroed stats for empty tasks', () => {
    const stats = computeWeeklyStats({ tasks: [] }, WEEK_START);
    expect(stats.outcomes).toEqual({ completed: 0, aheadOfTime: 0, onTime: 0, overdue: 0 });
    expect(stats.totalSeconds).toBe(0);
    expect(stats.busiestDay).toBeNull();
    expect(stats.longestTask).toBeNull();
  });

  it('outcome counts are internally consistent', () => {
    const task = makeTask('t1', 'Math',
      [makeSession('2026-12-08T10:00:00Z', '2026-12-08T11:00:00Z')],
      [makeRecord('2026-12-08T11:00:00Z', 'on time'), makeRecord('2026-12-09T11:00:00Z', 'overdue'), makeRecord('2026-12-10T11:00:00Z', 'ahead of time')]
    );
    const stats = computeWeeklyStats({ tasks: [task] }, WEEK_START);
    expect(stats.outcomes.completed).toBe(stats.outcomes.aheadOfTime + stats.outcomes.onTime + stats.outcomes.overdue);
  });

  it('busiestDay is null when no sessions in window', () => {
    const task = makeTask('t1', 'Math', [], [makeRecord('2026-12-08T11:00:00Z', 'on time')]);
    const stats = computeWeeklyStats({ tasks: [task] }, WEEK_START);
    expect(stats.busiestDay).toBeNull();
  });

  it('longestTask is null when no sessions in window', () => {
    const task = makeTask('t1', 'Math', [], [makeRecord('2026-12-08T11:00:00Z', 'on time')]);
    const stats = computeWeeklyStats({ tasks: [task] }, WEEK_START);
    expect(stats.longestTask).toBeNull();
  });

  it('excludes active sessions (null ended_at) from totalSeconds', () => {
    const task = makeTask('t1', 'Math',
      [makeSession('2026-12-08T10:00:00Z')], // active
      []
    );
    const stats = computeWeeklyStats({ tasks: [task] }, WEEK_START);
    expect(stats.totalSeconds).toBe(0);
  });

  it('counts task in outcomes even if it has no sessions', () => {
    const task = makeTask('t1', 'Math', [], [makeRecord('2026-12-08T11:00:00Z', 'on time')]);
    const stats = computeWeeklyStats({ tasks: [task] }, WEEK_START);
    expect(stats.outcomes.completed).toBe(1);
    expect(stats.totalSeconds).toBe(0);
  });

  it('counts task in time stats even if it has no completion records', () => {
    const task = makeTask('t1', 'Math',
      [makeSession('2026-12-08T10:00:00Z', '2026-12-08T11:00:00Z')],
      []
    );
    const stats = computeWeeklyStats({ tasks: [task] }, WEEK_START);
    expect(stats.totalSeconds).toBe(3600);
    expect(stats.outcomes.completed).toBe(0);
  });
});

// ─── computeMonthlyStats ──────────────────────────────────────────────────────

describe('computeMonthlyStats', () => {
  it('returns zeroed stats for empty tasks', () => {
    const stats = computeMonthlyStats({ tasks: [] }, 11, 2026);
    expect(stats.outcomes).toEqual({ completed: 0, aheadOfTime: 0, onTime: 0, overdue: 0 });
    expect(stats.totalSeconds).toBe(0);
    expect(stats.subjectStats).toEqual([]);
    expect(stats.mostTimeSubject).toBeNull();
    expect(stats.leastTimeSubject).toBeNull();
  });

  it('subjectStats has exactly one entry per active subject', () => {
    const tasks = [
      makeTask('t1', 'Math', [makeSession('2026-12-08T10:00:00Z', '2026-12-08T11:00:00Z')], []),
      makeTask('t2', 'Math', [makeSession('2026-12-09T10:00:00Z', '2026-12-09T11:00:00Z')], []),
      makeTask('t3', 'English', [makeSession('2026-12-10T10:00:00Z', '2026-12-10T11:00:00Z')], []),
    ];
    const stats = computeMonthlyStats({ tasks }, 11, 2026);
    expect(stats.subjectStats).toHaveLength(2);
    expect(stats.subjectStats.map(s => s.subject).sort()).toEqual(['English', 'Math']);
  });

  it('subject outcome counts sum to total outcome counts', () => {
    const tasks = [
      makeTask('t1', 'Math', [], [makeRecord('2026-12-08T11:00:00Z', 'on time', 't1')]),
      makeTask('t2', 'English', [], [makeRecord('2026-12-09T11:00:00Z', 'overdue', 't2')]),
    ];
    const stats = computeMonthlyStats({ tasks }, 11, 2026);
    const sumCompleted = stats.subjectStats.reduce((s, x) => s + x.outcomes.completed, 0);
    expect(sumCompleted).toBe(stats.outcomes.completed);
  });

  it('leastTimeSubject is null when fewer than 2 subjects have time', () => {
    const task = makeTask('t1', 'Math', [makeSession('2026-12-08T10:00:00Z', '2026-12-08T11:00:00Z')], []);
    const stats = computeMonthlyStats({ tasks: [task] }, 11, 2026);
    expect(stats.leastTimeSubject).toBeNull();
  });

  it('leastTimeSubject is set when 2+ subjects have time', () => {
    const tasks = [
      makeTask('t1', 'Math', [makeSession('2026-12-08T10:00:00Z', '2026-12-08T12:00:00Z')], []),
      makeTask('t2', 'English', [makeSession('2026-12-09T10:00:00Z', '2026-12-09T10:30:00Z')], []),
    ];
    const stats = computeMonthlyStats({ tasks }, 11, 2026);
    expect(stats.leastTimeSubject).toBe('English');
    expect(stats.mostTimeSubject).toBe('Math');
  });
});

// ─── computeSuggestions ───────────────────────────────────────────────────────

describe('computeSuggestions', () => {
  it('returns all empty arrays for empty tasks', () => {
    const s = computeSuggestions({ tasks: [] });
    expect(s.focusSubjects).toEqual([]);
    expect(s.avoidSubjects).toEqual([]);
    expect(s.mostProductiveDays).toEqual([]);
    expect(s.mostProductiveHours).toEqual([]);
  });

  it('does not include subject in focusSubjects with exactly 50% overdue rate', () => {
    // 2 completed, 1 overdue = 50% — should NOT qualify (must be > 0.5)
    const task = makeTask('t1', 'Math', [],
      [makeRecord('2026-12-08T11:00:00Z', 'overdue'), makeRecord('2026-12-09T11:00:00Z', 'on time')]
    );
    const s = computeSuggestions({ tasks: [task] });
    expect(s.focusSubjects).not.toContain('Math');
  });

  it('includes subject in focusSubjects when overdue rate > 50% and completed >= 2', () => {
    const task = makeTask('t1', 'Math', [],
      [makeRecord('2026-12-08T11:00:00Z', 'overdue'), makeRecord('2026-12-09T11:00:00Z', 'overdue'), makeRecord('2026-12-10T11:00:00Z', 'on time')]
    );
    const s = computeSuggestions({ tasks: [task] });
    expect(s.focusSubjects).toContain('Math');
  });

  it('does not include subject in focusSubjects when completed < 2', () => {
    const task = makeTask('t1', 'Math', [], [makeRecord('2026-12-08T11:00:00Z', 'overdue')]);
    const s = computeSuggestions({ tasks: [task] });
    expect(s.focusSubjects).not.toContain('Math');
  });

  it('a subject with >70% overdue and completed >= 3 appears in focusSubjects (not avoidSubjects) since focusSubjects takes priority', () => {
    // avoidSubjects excludes subjects already in focusSubjects per the design spec
    // A subject with >70% overdue also satisfies >50% overdue, so it lands in focusSubjects first
    const task = makeTask('t1', 'Chemistry', [],
      [makeRecord('2026-12-08T11:00:00Z', 'overdue'), makeRecord('2026-12-09T11:00:00Z', 'overdue'), makeRecord('2026-12-10T11:00:00Z', 'overdue'), makeRecord('2026-12-11T11:00:00Z', 'on time')]
    );
    const s = computeSuggestions({ tasks: [task] });
    expect(s.focusSubjects).toContain('Chemistry');
    expect(s.avoidSubjects).not.toContain('Chemistry');
  });

  it('no subject appears in both focusSubjects and avoidSubjects', () => {
    const task = makeTask('t1', 'Math', [],
      [makeRecord('2026-12-08T11:00:00Z', 'overdue'), makeRecord('2026-12-09T11:00:00Z', 'overdue'), makeRecord('2026-12-10T11:00:00Z', 'overdue'), makeRecord('2026-12-11T11:00:00Z', 'on time')]
    );
    const s = computeSuggestions({ tasks: [task] });
    const intersection = s.focusSubjects.filter(x => s.avoidSubjects.includes(x));
    expect(intersection).toHaveLength(0);
  });

  it('mostProductiveHours has at most 3 elements, all in [0, 23]', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(`2026-12-08T${String(i % 24).padStart(2, '0')}:00:00Z`, `2026-12-08T${String(i % 24).padStart(2, '0')}:30:00Z`)
    );
    const task = makeTask('t1', 'Math', sessions, []);
    const s = computeSuggestions({ tasks: [task] });
    expect(s.mostProductiveHours.length).toBeLessThanOrEqual(3);
    s.mostProductiveHours.forEach(h => {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(23);
    });
  });
});
