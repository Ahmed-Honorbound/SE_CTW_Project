import { describe, it, expect, vi } from 'vitest';

// Mock supabase before importing taskService
vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

import { computeOutcome } from '../lib/taskService';

describe('computeOutcome', () => {
  it('returns "ahead of time" when completed well before due date', () => {
    const completedAt = new Date('2026-11-01');
    expect(computeOutcome(completedAt, '2026-12-01')).toBe('ahead of time');
  });

  it('returns "ahead of time" when completed one day before due date', () => {
    const completedAt = new Date('2026-11-30');
    expect(computeOutcome(completedAt, '2026-12-01')).toBe('ahead of time');
  });

  it('returns "on time" when completed on the same calendar day as due date', () => {
    const completedAt = new Date('2026-12-01T10:00:00Z');
    expect(computeOutcome(completedAt, '2026-12-01')).toBe('on time');
  });

  it('returns "on time" when completed at end of due date', () => {
    const completedAt = new Date('2026-12-01T23:59:59Z');
    expect(computeOutcome(completedAt, '2026-12-01')).toBe('on time');
  });

  it('returns "overdue" when completed one day after due date', () => {
    const completedAt = new Date('2026-12-02');
    expect(computeOutcome(completedAt, '2026-12-01')).toBe('overdue');
  });

  it('returns "overdue" when completed far after due date', () => {
    const completedAt = new Date('2027-06-01');
    expect(computeOutcome(completedAt, '2026-12-01')).toBe('overdue');
  });
});
