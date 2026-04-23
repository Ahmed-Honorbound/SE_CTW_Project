import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

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

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const arbOutcome = fc.constantFrom('ahead of time', 'on time', 'overdue') as fc.Arbitrary<'ahead of time' | 'on time' | 'overdue'>;

const arbIsoDate = (min = new Date('2026-01-01'), max = new Date('2026-12-31')) =>
  fc.date({ min, max }).filter(d => !isNaN(d.getTime())).map(d => d.toISOString());

const arbTimeSession = fc.record({
  id: fc.uuid(),
  task_id: fc.uuid(),
  started_at: arbIsoDate(),
  ended_at: fc.option(arbIsoDate(), { nil: undefined }),
}).map(s => s as TimeSession);

const arbCompletedSession = fc.record({
  id: fc.uuid(),
  task_id: fc.uuid(),
  started_at: arbIsoDate(),
  ended_at: arbIsoDate(),
}).map(s => s as TimeSession);

const arbCompletionRecord = (taskId?: string) => fc.record({
  id: fc.uuid(),
  task_id: taskId ? fc.constant(taskId) : fc.uuid(),
  completed_at: arbIsoDate(),
  due_date: fc.constant('2026-12-01'),
  outcome: arbOutcome,
}).map(r => r as CompletionRecord);

const arbTask = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  subject: fc.constantFrom('Math', 'English', 'Science', 'History', 'Art'),
  due_date: fc.constant('2026-12-01'),
  priority: fc.constantFrom('Low', 'Medium', 'High') as fc.Arbitrary<'Low' | 'Medium' | 'High'>,
  status: fc.constantFrom('Unstarted', 'In Progress', 'Complete', 'Overdue') as fc.Arbitrary<any>,
  created_at: fc.constant('2026-01-01T00:00:00Z'),
  time_sessions: fc.array(arbTimeSession, { maxLength: 5 }),
  completion_records: fc.array(arbCompletionRecord(), { maxLength: 3 }),
}).map(t => t as Task);

const arbRawData: fc.Arbitrary<RawAnalyticsData> = fc.record({
  tasks: fc.array(arbTask, { maxLength: 10 }),
});

const arbWeekStart = fc.date({ min: new Date('2026-01-05'), max: new Date('2026-12-28') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => getWeekStart(d));

const arbMonthYear = fc.record({
  month: fc.integer({ min: 0, max: 11 }),
  year: fc.constant(2026),
});

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('Property-based tests: analyticsService', () => {

  it('Property 1: outcome counts are internally consistent (weekly)', () => {
    // Feature: analytics-summaries, Property 1: outcomes.completed === aheadOfTime + onTime + overdue
    fc.assert(fc.property(arbRawData, arbWeekStart, (data, weekStart) => {
      const stats = computeWeeklyStats(data, weekStart);
      expect(stats.outcomes.completed).toBe(
        stats.outcomes.aheadOfTime + stats.outcomes.onTime + stats.outcomes.overdue
      );
    }), { numRuns: 100 });
  });

  it('Property 1 (monthly): outcome counts are internally consistent', () => {
    // Feature: analytics-summaries, Property 1: outcomes.completed === aheadOfTime + onTime + overdue
    fc.assert(fc.property(arbRawData, arbMonthYear, (data, { month, year }) => {
      const stats = computeMonthlyStats(data, month, year);
      expect(stats.outcomes.completed).toBe(
        stats.outcomes.aheadOfTime + stats.outcomes.onTime + stats.outcomes.overdue
      );
    }), { numRuns: 100 });
  });

  it('Property 2: only completed sessions contribute to totalSeconds', () => {
    // Feature: analytics-summaries, Property 2: totalSeconds excludes sessions with null ended_at
    fc.assert(fc.property(arbRawData, arbWeekStart, (data, weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      const stats = computeWeeklyStats(data, weekStart);

      // Manually compute expected total
      let expected = 0;
      for (const task of data.tasks) {
        for (const s of task.time_sessions ?? []) {
          if (!s.ended_at) continue;
          const t = new Date(s.started_at).getTime();
          if (t >= weekStart.getTime() && t < weekEnd.getTime()) {
            expected += sessionDurationSeconds(s);
          }
        }
      }
      expect(stats.totalSeconds).toBe(expected);
    }), { numRuns: 100 });
  });

  it('Property 3: window filtering is exclusive of windowEnd', () => {
    // Feature: analytics-summaries, Property 3: session at windowEnd is excluded; at windowStart is included
    fc.assert(fc.property(
      fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-01') }).filter(d => !isNaN(d.getTime())),
      (d) => {
      const windowStart = new Date(d);
      const windowEnd = new Date(d.getTime() + 7 * 24 * 3600 * 1000);

      const atStart: TimeSession = { id: '1', task_id: 't', started_at: windowStart.toISOString(), ended_at: new Date(windowStart.getTime() + 3600000).toISOString() };
      const atEnd: TimeSession = { id: '2', task_id: 't', started_at: windowEnd.toISOString(), ended_at: new Date(windowEnd.getTime() + 3600000).toISOString() };

      const included = filterSessionsInWindow([atStart], windowStart, windowEnd);
      const excluded = filterSessionsInWindow([atEnd], windowStart, windowEnd);

      expect(included).toHaveLength(1);
      expect(excluded).toHaveLength(0);
    }), { numRuns: 100 });
  });

  it('Property 4: busiestDay is the day with the highest session seconds', () => {
    // Feature: analytics-summaries, Property 4: busiestDay has max session seconds or is null
    fc.assert(fc.property(arbRawData, arbWeekStart, (data, weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const stats = computeWeeklyStats(data, weekStart);

      if (stats.busiestDay === null) {
        // All sessions in window must have 0 total seconds
        const dayBuckets: Record<string, number> = {};
        for (const task of data.tasks) {
          for (const s of filterSessionsInWindow(task.time_sessions ?? [], weekStart, weekEnd)) {
            const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(s.started_at).getDay()];
            dayBuckets[day] = (dayBuckets[day] ?? 0) + sessionDurationSeconds(s);
          }
        }
        const maxSecs = Math.max(0, ...Object.values(dayBuckets));
        expect(maxSecs).toBe(0);
      } else {
        // busiestDay must have >= seconds than all other days
        const dayBuckets: Record<string, number> = {};
        for (const task of data.tasks) {
          for (const s of filterSessionsInWindow(task.time_sessions ?? [], weekStart, weekEnd)) {
            const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(s.started_at).getDay()];
            dayBuckets[day] = (dayBuckets[day] ?? 0) + sessionDurationSeconds(s);
          }
        }
        const busiestSecs = dayBuckets[stats.busiestDay] ?? 0;
        for (const secs of Object.values(dayBuckets)) {
          expect(busiestSecs).toBeGreaterThanOrEqual(secs);
        }
      }
    }), { numRuns: 100 });
  });

  it('Property 5: longestTask has the highest total session seconds', () => {
    // Feature: analytics-summaries, Property 5: longestTask has max session seconds or is null
    fc.assert(fc.property(arbRawData, arbWeekStart, (data, weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      const stats = computeWeeklyStats(data, weekStart);

      const taskSeconds: Record<string, number> = {};
      for (const task of data.tasks) {
        for (const s of filterSessionsInWindow(task.time_sessions ?? [], weekStart, weekEnd)) {
          taskSeconds[task.id] = (taskSeconds[task.id] ?? 0) + sessionDurationSeconds(s);
        }
      }

      if (stats.longestTask === null) {
        expect(Object.values(taskSeconds).every(v => v === 0)).toBe(true);
      } else {
        const longestSecs = stats.longestTask.totalSeconds;
        for (const secs of Object.values(taskSeconds)) {
          expect(longestSecs).toBeGreaterThanOrEqual(secs);
        }
      }
    }), { numRuns: 100 });
  });

  it('Property 6: subjectStats covers all active subjects exactly once', () => {
    // Feature: analytics-summaries, Property 6: each active subject appears exactly once in subjectStats
    fc.assert(fc.property(arbRawData, arbMonthYear, (data, { month, year }) => {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 1);
      const stats = computeMonthlyStats(data, month, year);

      const activeSubjects = new Set<string>();
      for (const task of data.tasks) {
        const hasSessions = filterSessionsInWindow(task.time_sessions ?? [], monthStart, monthEnd).length > 0;
        const hasCompletions = filterCompletionsInWindow(task.completion_records ?? [], monthStart, monthEnd).length > 0;
        if (hasSessions || hasCompletions) activeSubjects.add(task.subject);
      }

      const statSubjects = stats.subjectStats.map(s => s.subject);
      expect(new Set(statSubjects).size).toBe(statSubjects.length); // no duplicates
      for (const subject of activeSubjects) {
        expect(statSubjects).toContain(subject);
      }
      for (const subject of statSubjects) {
        expect(activeSubjects.has(subject)).toBe(true);
      }
    }), { numRuns: 100 });
  });

  it('Property 7: subject outcome counts sum to total outcome counts', () => {
    // Feature: analytics-summaries, Property 7: sum of subject outcomes equals total outcomes
    fc.assert(fc.property(arbRawData, arbMonthYear, (data, { month, year }) => {
      const stats = computeMonthlyStats(data, month, year);
      const sumCompleted = stats.subjectStats.reduce((s, x) => s + x.outcomes.completed, 0);
      const sumAhead = stats.subjectStats.reduce((s, x) => s + x.outcomes.aheadOfTime, 0);
      const sumOnTime = stats.subjectStats.reduce((s, x) => s + x.outcomes.onTime, 0);
      const sumOverdue = stats.subjectStats.reduce((s, x) => s + x.outcomes.overdue, 0);
      expect(sumCompleted).toBe(stats.outcomes.completed);
      expect(sumAhead).toBe(stats.outcomes.aheadOfTime);
      expect(sumOnTime).toBe(stats.outcomes.onTime);
      expect(sumOverdue).toBe(stats.outcomes.overdue);
    }), { numRuns: 100 });
  });

  it('Property 8: mostTimeSubject has the highest totalSeconds', () => {
    // Feature: analytics-summaries, Property 8: mostTimeSubject has max totalSeconds
    fc.assert(fc.property(arbRawData, arbMonthYear, (data, { month, year }) => {
      const stats = computeMonthlyStats(data, month, year);
      if (stats.mostTimeSubject === null) return;
      const mostSecs = stats.subjectStats.find(s => s.subject === stats.mostTimeSubject)?.totalSeconds ?? 0;
      for (const s of stats.subjectStats) {
        expect(mostSecs).toBeGreaterThanOrEqual(s.totalSeconds);
      }
    }), { numRuns: 100 });
  });

  it('Property 9: leastTimeSubject has the lowest non-zero totalSeconds', () => {
    // Feature: analytics-summaries, Property 9: leastTimeSubject has min totalSeconds > 0
    fc.assert(fc.property(arbRawData, arbMonthYear, (data, { month, year }) => {
      const stats = computeMonthlyStats(data, month, year);
      if (stats.leastTimeSubject === null) return;
      const leastSecs = stats.subjectStats.find(s => s.subject === stats.leastTimeSubject)?.totalSeconds ?? 0;
      expect(leastSecs).toBeGreaterThan(0);
      for (const s of stats.subjectStats.filter(x => x.totalSeconds > 0)) {
        expect(leastSecs).toBeLessThanOrEqual(s.totalSeconds);
      }
    }), { numRuns: 100 });
  });

  it('Property 10: focusSubjects threshold is respected', () => {
    // Feature: analytics-summaries, Property 10: focusSubjects only contains qualifying subjects
    fc.assert(fc.property(arbRawData, (data) => {
      const suggestions = computeSuggestions(data);

      // Build subject outcome map manually
      const subjectOutcomes: Record<string, { completed: number; overdue: number }> = {};
      for (const task of data.tasks) {
        for (const r of task.completion_records ?? []) {
          if (!subjectOutcomes[task.subject]) subjectOutcomes[task.subject] = { completed: 0, overdue: 0 };
          subjectOutcomes[task.subject].completed++;
          if (r.outcome === 'overdue') subjectOutcomes[task.subject].overdue++;
        }
      }

      for (const subject of suggestions.focusSubjects) {
        const o = subjectOutcomes[subject];
        expect(o).toBeDefined();
        expect(o.completed).toBeGreaterThanOrEqual(2);
        expect(o.overdue / o.completed).toBeGreaterThan(0.5);
      }
    }), { numRuns: 100 });
  });

  it('Property 11: avoidSubjects threshold is respected and disjoint from focusSubjects', () => {
    // Feature: analytics-summaries, Property 11: avoidSubjects threshold and disjoint from focusSubjects
    fc.assert(fc.property(arbRawData, (data) => {
      const suggestions = computeSuggestions(data);

      const subjectOutcomes: Record<string, { completed: number; overdue: number }> = {};
      for (const task of data.tasks) {
        for (const r of task.completion_records ?? []) {
          if (!subjectOutcomes[task.subject]) subjectOutcomes[task.subject] = { completed: 0, overdue: 0 };
          subjectOutcomes[task.subject].completed++;
          if (r.outcome === 'overdue') subjectOutcomes[task.subject].overdue++;
        }
      }

      for (const subject of suggestions.avoidSubjects) {
        const o = subjectOutcomes[subject];
        expect(o).toBeDefined();
        expect(o.completed).toBeGreaterThanOrEqual(3);
        expect(o.overdue / o.completed).toBeGreaterThan(0.7);
        expect(suggestions.focusSubjects).not.toContain(subject);
      }
    }), { numRuns: 100 });
  });

  it('Property 12: mostProductiveHours contains valid hour values', () => {
    // Feature: analytics-summaries, Property 12: mostProductiveHours values in [0,23], at most 3 elements
    fc.assert(fc.property(arbRawData, (data) => {
      const suggestions = computeSuggestions(data);
      expect(suggestions.mostProductiveHours.length).toBeLessThanOrEqual(3);
      for (const h of suggestions.mostProductiveHours) {
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(23);
      }
    }), { numRuns: 100 });
  });

  it('Property 13: empty data produces zeroed/null stats for any period', () => {
    // Feature: analytics-summaries, Property 13: empty tasks produce all-zero/null/empty results
    fc.assert(fc.property(arbWeekStart, arbMonthYear, (weekStart, { month, year }) => {
      const empty: RawAnalyticsData = { tasks: [] };

      const weekly = computeWeeklyStats(empty, weekStart);
      expect(weekly.outcomes).toEqual({ completed: 0, aheadOfTime: 0, onTime: 0, overdue: 0 });
      expect(weekly.totalSeconds).toBe(0);
      expect(weekly.busiestDay).toBeNull();
      expect(weekly.longestTask).toBeNull();

      const monthly = computeMonthlyStats(empty, month, year);
      expect(monthly.outcomes).toEqual({ completed: 0, aheadOfTime: 0, onTime: 0, overdue: 0 });
      expect(monthly.subjectStats).toEqual([]);
      expect(monthly.mostTimeSubject).toBeNull();

      const suggestions = computeSuggestions(empty);
      expect(suggestions.focusSubjects).toEqual([]);
      expect(suggestions.avoidSubjects).toEqual([]);
      expect(suggestions.mostProductiveDays).toEqual([]);
      expect(suggestions.mostProductiveHours).toEqual([]);
    }), { numRuns: 100 });
  });

  it('Property 15: sessionDurationSeconds is non-negative', () => {
    // Feature: analytics-summaries, Property 15: sessionDurationSeconds >= 0 for any input
    fc.assert(fc.property(
      fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') }).filter(d => !isNaN(d.getTime())),
      fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') }).filter(d => !isNaN(d.getTime())),
      (start, end) => {
        const session: TimeSession = {
          id: 'test', task_id: 'task',
          started_at: start.toISOString(),
          ended_at: end.toISOString(),
        };
        expect(sessionDurationSeconds(session)).toBeGreaterThanOrEqual(0);
      }
    ), { numRuns: 100 });
  });

  it('Property 16: getWeekStart always returns a Monday', () => {
    // Feature: analytics-summaries, Property 16: getWeekStart(date).getUTCDay() === 1
    fc.assert(fc.property(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
      (date) => {
        expect(getWeekStart(date).getUTCDay()).toBe(1);
      }
    ), { numRuns: 100 });
  });

});
