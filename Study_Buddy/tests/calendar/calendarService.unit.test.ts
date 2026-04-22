import { describe, it, expect } from 'vitest';

import {
  deriveColor,
  validateEventForm,
  isValidWeeklyGoal,
  computeAvailableHours,
  computeWeeklyStudyHours,
  getISOWeekBounds,
  shouldShowBadge,
  COLOR_MAP,
  CalendarEvent,
  CalendarEventFormValues,
} from '../../lib/calendarService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'test-id',
    title: 'Test Event',
    type: 'class',
    start: '2025-06-16T09:00:00.000Z',
    end: '2025-06-16T11:00:00.000Z',
    color: '#4e73df',
    created_at: '2025-06-16T08:00:00.000Z',
    ...overrides,
  };
}

// ─── deriveColor ──────────────────────────────────────────────────────────────

describe('deriveColor', () => {
  it('returns correct hex for "class"', () => {
    expect(deriveColor('class')).toBe('#4e73df');
  });

  it('returns correct hex for "task"', () => {
    expect(deriveColor('task')).toBe('#e74a3b');
  });

  it('returns correct hex for "work"', () => {
    expect(deriveColor('work')).toBe('#36b9cc');
  });

  it('returns correct hex for "personal"', () => {
    expect(deriveColor('personal')).toBe('#1cc88a');
  });

  it('returns correct hex for "appointment"', () => {
    expect(deriveColor('appointment')).toBe('#f6c23e');
  });

  it('matches COLOR_MAP for all event types', () => {
    const types = ['class', 'task', 'work', 'personal', 'appointment'] as const;
    for (const type of types) {
      expect(deriveColor(type)).toBe(COLOR_MAP[type]);
    }
  });
});

// ─── validateEventForm ────────────────────────────────────────────────────────

describe('validateEventForm', () => {
  const validValues: CalendarEventFormValues = {
    title: 'Study Session',
    type: 'class',
    start: '2025-06-16T09:00',
    end: '2025-06-16T11:00',
  };

  it('returns null for a valid title and start (with end)', () => {
    expect(validateEventForm(validValues)).toBeNull();
  });

  it('returns null for a valid title and start (without end)', () => {
    expect(validateEventForm({ ...validValues, end: '' })).toBeNull();
  });

  it('returns an error string for an empty title', () => {
    const result = validateEventForm({ ...validValues, title: '' });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns an error string for a whitespace-only title', () => {
    const result = validateEventForm({ ...validValues, title: '   ' });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns an error string for a tab-only title', () => {
    const result = validateEventForm({ ...validValues, title: '\t\t' });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns an error string when start is empty', () => {
    const result = validateEventForm({ ...validValues, start: '' });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns an error string when end equals start', () => {
    const result = validateEventForm({
      ...validValues,
      start: '2025-06-16T09:00',
      end: '2025-06-16T09:00',
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns an error string when end is before start', () => {
    const result = validateEventForm({
      ...validValues,
      start: '2025-06-16T11:00',
      end: '2025-06-16T09:00',
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns null when end is empty (end is optional)', () => {
    expect(validateEventForm({ ...validValues, end: '' })).toBeNull();
  });

  it('returns null when end is strictly after start', () => {
    expect(
      validateEventForm({
        ...validValues,
        start: '2025-06-16T09:00',
        end: '2025-06-16T10:00',
      })
    ).toBeNull();
  });
});

// ─── isValidWeeklyGoal ────────────────────────────────────────────────────────

describe('isValidWeeklyGoal', () => {
  it('accepts 1', () => {
    expect(isValidWeeklyGoal(1)).toBe(true);
  });

  it('accepts 5', () => {
    expect(isValidWeeklyGoal(5)).toBe(true);
  });

  it('accepts 100', () => {
    expect(isValidWeeklyGoal(100)).toBe(true);
  });

  it('rejects 0', () => {
    expect(isValidWeeklyGoal(0)).toBe(false);
  });

  it('rejects -1', () => {
    expect(isValidWeeklyGoal(-1)).toBe(false);
  });

  it('rejects 0.5', () => {
    expect(isValidWeeklyGoal(0.5)).toBe(false);
  });

  it('rejects 1.5 (non-integer >= 1)', () => {
    expect(isValidWeeklyGoal(1.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidWeeklyGoal(NaN)).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(isValidWeeklyGoal(Infinity)).toBe(false);
  });

  it('rejects -Infinity', () => {
    expect(isValidWeeklyGoal(-Infinity)).toBe(false);
  });

  it('rejects string "5"', () => {
    expect(isValidWeeklyGoal('5')).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidWeeklyGoal(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidWeeklyGoal(undefined)).toBe(false);
  });
});

// ─── computeAvailableHours ────────────────────────────────────────────────────

describe('computeAvailableHours', () => {
  // Use a fixed local date string for deterministic tests
  // We'll use UTC dates so local date matches predictably
  const dateStr = '2025-06-16';

  it('returns 16 for an empty event list', () => {
    expect(computeAvailableHours([], dateStr)).toBe(16);
  });

  it('subtracts event hours from 16', () => {
    // 2-hour event on the target date (UTC midnight = local date in UTC+0)
    const event = makeEvent({
      start: '2025-06-16T10:00:00.000Z',
      end: '2025-06-16T12:00:00.000Z',
    });
    // The local date of the start depends on timezone; we compute it the same way the function does
    const localDate = new Date('2025-06-16T10:00:00.000Z').toLocaleDateString('en-CA');
    const result = computeAvailableHours([event], localDate);
    expect(result).toBeCloseTo(14, 5);
  });

  it('returns 0 when events fill more than 16 hours', () => {
    // 20-hour event on the target date
    const localDate = new Date('2025-06-16T00:00:00.000Z').toLocaleDateString('en-CA');
    const event = makeEvent({
      start: '2025-06-16T00:00:00.000Z',
      end: '2025-06-16T20:00:00.000Z',
    });
    const result = computeAvailableHours([event], localDate);
    expect(result).toBe(0);
  });

  it('ignores events on other dates', () => {
    const event = makeEvent({
      start: '2025-06-17T10:00:00.000Z',
      end: '2025-06-17T12:00:00.000Z',
    });
    // Query for June 16 — event is on June 17
    const localDate16 = new Date('2025-06-16T10:00:00.000Z').toLocaleDateString('en-CA');
    const localDate17 = new Date('2025-06-17T10:00:00.000Z').toLocaleDateString('en-CA');
    // The event is on localDate17, so querying localDate16 should return 16
    expect(computeAvailableHours([event], localDate16)).toBe(16);
    // Querying localDate17 should subtract 2 hours
    expect(computeAvailableHours([event], localDate17)).toBeCloseTo(14, 5);
  });

  it('ignores events with null end', () => {
    const localDate = new Date('2025-06-16T10:00:00.000Z').toLocaleDateString('en-CA');
    const event = makeEvent({
      start: '2025-06-16T10:00:00.000Z',
      end: null,
    });
    expect(computeAvailableHours([event], localDate)).toBe(16);
  });

  it('sums multiple events on the same date', () => {
    const localDate = new Date('2025-06-16T08:00:00.000Z').toLocaleDateString('en-CA');
    const event1 = makeEvent({
      start: '2025-06-16T08:00:00.000Z',
      end: '2025-06-16T10:00:00.000Z', // 2 hours
    });
    const event2 = makeEvent({
      id: 'test-id-2',
      start: '2025-06-16T12:00:00.000Z',
      end: '2025-06-16T14:00:00.000Z', // 2 hours
    });
    expect(computeAvailableHours([event1, event2], localDate)).toBeCloseTo(12, 5);
  });
});

// ─── computeWeeklyStudyHours ──────────────────────────────────────────────────

describe('computeWeeklyStudyHours', () => {
  // Use a Monday in the middle of a known week
  // 2025-06-16 is a Monday
  const monday = new Date('2025-06-16T12:00:00.000Z');

  it('returns 0 for an empty event list', () => {
    expect(computeWeeklyStudyHours([], monday)).toBe(0);
  });

  it('counts a "study" event within the ISO week', () => {
    const event = makeEvent({
      title: 'study session',
      start: '2025-06-16T10:00:00.000Z',
      end: '2025-06-16T12:00:00.000Z', // 2 hours
    });
    const result = computeWeeklyStudyHours([event], monday);
    expect(result).toBeCloseTo(2, 5);
  });

  it('ignores events without "study" in the title', () => {
    const event = makeEvent({
      title: 'math homework',
      start: '2025-06-16T10:00:00.000Z',
      end: '2025-06-16T12:00:00.000Z',
    });
    expect(computeWeeklyStudyHours([event], monday)).toBe(0);
  });

  it('ignores events outside the ISO week', () => {
    // 2025-06-09 is the previous Monday (previous week)
    const event = makeEvent({
      title: 'study session',
      start: '2025-06-09T10:00:00.000Z',
      end: '2025-06-09T12:00:00.000Z',
    });
    expect(computeWeeklyStudyHours([event], monday)).toBe(0);
  });

  it('ignores events with null end', () => {
    const event = makeEvent({
      title: 'study session',
      start: '2025-06-16T10:00:00.000Z',
      end: null,
    });
    expect(computeWeeklyStudyHours([event], monday)).toBe(0);
  });

  it('is case-insensitive for "STUDY" matching', () => {
    const event = makeEvent({
      title: 'STUDY BREAK',
      start: '2025-06-16T10:00:00.000Z',
      end: '2025-06-16T11:00:00.000Z', // 1 hour
    });
    expect(computeWeeklyStudyHours([event], monday)).toBeCloseTo(1, 5);
  });

  it('is case-insensitive for mixed-case "Study" matching', () => {
    const event = makeEvent({
      title: 'Study for exam',
      start: '2025-06-16T10:00:00.000Z',
      end: '2025-06-16T13:00:00.000Z', // 3 hours
    });
    expect(computeWeeklyStudyHours([event], monday)).toBeCloseTo(3, 5);
  });

  it('sums multiple qualifying study events', () => {
    const event1 = makeEvent({
      title: 'study session',
      start: '2025-06-16T08:00:00.000Z',
      end: '2025-06-16T10:00:00.000Z', // 2 hours
    });
    const event2 = makeEvent({
      id: 'test-id-2',
      title: 'study group',
      start: '2025-06-18T14:00:00.000Z', // Wednesday of same week
      end: '2025-06-18T16:00:00.000Z', // 2 hours
    });
    expect(computeWeeklyStudyHours([event1, event2], monday)).toBeCloseTo(4, 5);
  });

  it('includes events on Sunday (last day of ISO week)', () => {
    // 2025-06-22 is Sunday of the same week as 2025-06-16 Monday
    const event = makeEvent({
      title: 'study session',
      start: '2025-06-22T10:00:00.000Z',
      end: '2025-06-22T12:00:00.000Z', // 2 hours
    });
    expect(computeWeeklyStudyHours([event], monday)).toBeCloseTo(2, 5);
  });
});

// ─── getISOWeekBounds ─────────────────────────────────────────────────────────

describe('getISOWeekBounds', () => {
  it('Monday is the week start', () => {
    // 2025-06-16 is a Monday
    const date = new Date(2025, 5, 16, 12, 0, 0); // local time
    const { weekStart } = getISOWeekBounds(date);
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getHours()).toBe(0);
    expect(weekStart.getMinutes()).toBe(0);
    expect(weekStart.getSeconds()).toBe(0);
    expect(weekStart.getMilliseconds()).toBe(0);
  });

  it('Sunday is the week end', () => {
    // 2025-06-16 is a Monday; Sunday should be 2025-06-22
    const date = new Date(2025, 5, 16, 12, 0, 0);
    const { weekEnd } = getISOWeekBounds(date);
    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getHours()).toBe(23);
    expect(weekEnd.getMinutes()).toBe(59);
    expect(weekEnd.getSeconds()).toBe(59);
    expect(weekEnd.getMilliseconds()).toBe(999);
  });

  it('week start is 6 days before week end (span is ~7 days)', () => {
    const date = new Date(2025, 5, 18, 12, 0, 0); // Wednesday
    const { weekStart, weekEnd } = getISOWeekBounds(date);
    const diffMs = weekEnd.getTime() - weekStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Monday 00:00:00.000 to Sunday 23:59:59.999 = 6 days + 23h 59m 59.999s ≈ 6.9999...
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);
  });

  it('returns Monday as week start when given a Sunday', () => {
    // 2025-06-22 is a Sunday
    const date = new Date(2025, 5, 22, 12, 0, 0);
    const { weekStart } = getISOWeekBounds(date);
    expect(weekStart.getDay()).toBe(1); // Monday
    // Should be 2025-06-16
    expect(weekStart.getDate()).toBe(16);
    expect(weekStart.getMonth()).toBe(5); // June (0-indexed)
  });

  it('returns correct bounds for a Wednesday', () => {
    // 2025-06-18 is a Wednesday
    const date = new Date(2025, 5, 18, 12, 0, 0);
    const { weekStart, weekEnd } = getISOWeekBounds(date);
    expect(weekStart.getDate()).toBe(16); // Monday June 16
    expect(weekEnd.getDate()).toBe(22);   // Sunday June 22
  });
});

// ─── shouldShowBadge ──────────────────────────────────────────────────────────

describe('shouldShowBadge', () => {
  it('returns false when alreadyShown is true and condition is true', () => {
    expect(shouldShowBadge(true, true)).toBe(false);
  });

  it('returns false when alreadyShown is true and condition is false', () => {
    expect(shouldShowBadge(true, false)).toBe(false);
  });

  it('returns true when alreadyShown is false and condition is true', () => {
    expect(shouldShowBadge(false, true)).toBe(true);
  });

  it('returns false when alreadyShown is false and condition is false', () => {
    expect(shouldShowBadge(false, false)).toBe(false);
  });
});
