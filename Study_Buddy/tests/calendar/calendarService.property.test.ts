import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  deriveColor,
  validateEventForm,
  isValidWeeklyGoal,
  computeAvailableHours,
  computeWeeklyStudyHours,
  getISOWeekBounds,
  shouldShowBadge,
  COLOR_MAP,
  EventType,
  CalendarEvent,
  CalendarEventFormValues,
} from '../../lib/calendarService';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const arbEventType: fc.Arbitrary<EventType> = fc.constantFrom(
  'class',
  'task',
  'work',
  'personal',
  'appointment'
);

/** Produces a YYYY-MM-DD string */
const arbDateStr: fc.Arbitrary<string> = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => d.toISOString().split('T')[0]);

/** Produces an ISO datetime-local string (no timezone suffix) */
const arbDatetimeLocal: fc.Arbitrary<string> = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => {
    // Format as YYYY-MM-DDTHH:mm (datetime-local format)
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

/** Produces a valid CalendarEventFormValues with non-empty title and start */
const arbValidFormValues: fc.Arbitrary<CalendarEventFormValues> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  type: arbEventType,
  start: arbDatetimeLocal,
  end: fc.constant(''),
});

/** Produces a CalendarEvent with a non-null end */
const arbCalendarEventWithEnd = (dateStr: string): fc.Arbitrary<CalendarEvent> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    type: arbEventType,
    // start is on the given date, random hour/minute
    start: fc.integer({ min: 0, max: 22 }).map(hour => {
      const start = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`);
      return start.toISOString();
    }),
    end: fc.record({
      hour: fc.integer({ min: 0, max: 22 }),
      durationMinutes: fc.integer({ min: 6, max: 60 }), // 6–60 minutes duration
    }).map(({ hour, durationMinutes }) => {
      const start = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      return end.toISOString();
    }),
    color: fc.constant('#4e73df'),
    created_at: fc.constant(new Date().toISOString()),
  });

/** Produces a CalendarEvent with null end */
const arbCalendarEventNullEnd = (): fc.Arbitrary<CalendarEvent> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    type: arbEventType,
    start: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
      .filter(d => !isNaN(d.getTime()))
      .map(d => d.toISOString()),
    end: fc.constant(null),
    color: fc.constant('#4e73df'),
    created_at: fc.constant(new Date().toISOString()),
  });

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('Property-based tests: calendarService', () => {

  it('Property 1: deriveColor returns the exact hex from COLOR_MAP for any valid EventType', () => {
    // Feature: calendar-scheduler, Property 1: Color derivation is consistent with Color_Map
    // Validates: Requirements 1.3, 3.3
    fc.assert(
      fc.property(arbEventType, (type) => {
        const result = deriveColor(type);
        expect(result).toBe(COLOR_MAP[type]);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: validateEventForm returns a non-null string when title is empty/whitespace or start is empty', () => {
    // Feature: calendar-scheduler, Property 2: Event form validation rejects missing title or start
    // Validates: Requirements 2.3
    fc.assert(
      fc.property(
        fc.oneof(
          // Case A: empty title
          fc.record({
            title: fc.constant(''),
            type: arbEventType,
            start: arbDatetimeLocal,
            end: fc.constant(''),
          }),
          // Case B: whitespace-only title
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/./g, ' ')).filter(s => s.length > 0),
            type: arbEventType,
            start: arbDatetimeLocal,
            end: fc.constant(''),
          }),
          // Case C: empty start
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            type: arbEventType,
            start: fc.constant(''),
            end: fc.constant(''),
          })
        ) as fc.Arbitrary<CalendarEventFormValues>,
        (values) => {
          const result = validateEventForm(values);
          expect(result).not.toBeNull();
          expect(typeof result).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: validateEventForm returns a non-null string when end is non-empty and end <= start', () => {
    // Feature: calendar-scheduler, Property 3: Event form validation rejects end <= start
    // Validates: Requirements 2.4
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          type: arbEventType,
          startAndEnd: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .chain(startDate => {
              const startStr = startDate.toISOString().slice(0, 16);
              return fc.oneof(
                fc.constant({ start: startStr, end: startStr }),
                fc.integer({ min: 1, max: 60 }).map(mins => {
                  const endDate = new Date(startDate.getTime() - mins * 60 * 1000);
                  return { start: startStr, end: endDate.toISOString().slice(0, 16) };
                })
              );
            }),
        }),
        ({ title, type, startAndEnd }) => {
          const values: CalendarEventFormValues = {
            title,
            type,
            start: startAndEnd.start,
            end: startAndEnd.end,
          };
          const result = validateEventForm(values);
          expect(result).not.toBeNull();
          expect(typeof result).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: computeAvailableHours equals max(0, 16 - sumOfHoursForEventsOnThatDate)', () => {
    // Feature: calendar-scheduler, Property 4: Available hours formula correctness
    // Validates: Requirements 4.2, 4.3
    fc.assert(
      fc.property(
        arbDateStr,
        fc.array(
          fc.oneof(
            arbCalendarEventWithEnd('2025-06-15'), // fixed date events
            arbCalendarEventNullEnd()              // null-end events (should be ignored)
          ),
          { maxLength: 10 }
        ),
        (dateStr, events) => {
          // Manually compute expected value
          let totalHours = 0;
          for (const event of events) {
            if (event.end === null) continue;
            const localDate = new Date(event.start).toLocaleDateString('en-CA');
            if (localDate !== dateStr) continue;
            const duration =
              (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
            totalHours += duration;
          }
          const expected = Math.max(0, 16 - totalHours);
          const result = computeAvailableHours(events, dateStr);
          expect(result).toBeCloseTo(expected, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: computeWeeklyStudyHours sums only qualifying study events within the ISO week', () => {
    // Feature: calendar-scheduler, Property 5: Weekly study hours computation correctness
    // Validates: Requirements 5.2, 5.3
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.oneof(
              fc.constant('study session'),
              fc.constant('STUDY BREAK'),
              fc.constant('math homework'),
              fc.constant('Study for exam'),
              fc.constant('no match here'),
            ),
            type: arbEventType,
            start: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .filter(d => !isNaN(d.getTime()))
              .map(d => d.toISOString()),
            end: fc.oneof(
              fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .filter(d => !isNaN(d.getTime()))
                .map(d => d.toISOString()),
              fc.constant(null)
            ),
            color: fc.constant('#4e73df'),
            created_at: fc.constant(new Date().toISOString()),
          }) as fc.Arbitrary<CalendarEvent>,
          { maxLength: 15 }
        ),
        (referenceDate, events) => {
          const { weekStart, weekEnd } = getISOWeekBounds(referenceDate);

          // Manually compute expected value
          let expected = 0;
          for (const event of events) {
            if (event.end === null) continue;
            if (!event.title.toLowerCase().includes('study')) continue;
            const eventStart = new Date(event.start);
            if (eventStart < weekStart || eventStart > weekEnd) continue;
            const duration =
              (new Date(event.end).getTime() - eventStart.getTime()) / (1000 * 60 * 60);
            expected += duration;
          }

          const result = computeWeeklyStudyHours(events, referenceDate);
          expect(result).toBeCloseTo(expected, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: isValidWeeklyGoal returns false for any value that is not a positive integer', () => {
    // Feature: calendar-scheduler, Property 6: Weekly goal validation rejects invalid inputs
    // Validates: Requirements 6.5
    fc.assert(
      fc.property(
        fc.oneof(
          // Numbers < 1
          fc.float({ min: Math.fround(-1000), max: Math.fround(0.9999), noNaN: true }),
          // Non-integers (fractional part != 0, value >= 1)
          fc.float({ min: Math.fround(1.0001), max: Math.fround(1000), noNaN: true }).filter(n => n % 1 !== 0),
          // NaN
          fc.constant(NaN),
          // Infinity
          fc.constant(Infinity),
          fc.constant(-Infinity),
          // Non-numeric values
          fc.string(),
          fc.constant(null),
          fc.constant(undefined),
          fc.boolean(),
        ),
        (value) => {
          expect(isValidWeeklyGoal(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: shouldShowBadge returns false when alreadyShown is true, regardless of condition', () => {
    // Feature: calendar-scheduler, Property 7: Badge is shown exactly once per session
    // Validates: Requirements 7.1, 7.2, 7.5
    fc.assert(
      fc.property(
        fc.boolean(),
        (condition) => {
          expect(shouldShowBadge(true, condition)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

});
