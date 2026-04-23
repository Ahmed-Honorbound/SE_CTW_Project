import { describe, it, expect, vi } from 'vitest';

// Mock supabase before importing taskService
vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

import { computeTotalSeconds } from '../lib/taskService';
import { TimeSession } from '../lib/types';

function makeSession(startedAt: string, endedAt?: string): TimeSession {
  return { id: 'test', task_id: 'task', started_at: startedAt, ended_at: endedAt };
}

describe('computeTotalSeconds', () => {
  it('returns 0 for an empty array', () => {
    expect(computeTotalSeconds([])).toBe(0);
  });

  it('returns 0 for a single active session with no ended_at', () => {
    expect(computeTotalSeconds([makeSession('2026-12-01T10:00:00Z')])).toBe(0);
  });

  it('calculates seconds for a single completed session', () => {
    const sessions = [makeSession('2026-12-01T10:00:00Z', '2026-12-01T10:01:00Z')];
    expect(computeTotalSeconds(sessions)).toBe(60);
  });

  it('sums multiple completed sessions', () => {
    const sessions = [
      makeSession('2026-12-01T10:00:00Z', '2026-12-01T10:01:00Z'), // 60s
      makeSession('2026-12-01T11:00:00Z', '2026-12-01T11:00:30Z'), // 30s
    ];
    expect(computeTotalSeconds(sessions)).toBe(90);
  });

  it('excludes active sessions (null ended_at) from total', () => {
    const sessions = [
      makeSession('2026-12-01T10:00:00Z', '2026-12-01T10:01:00Z'), // 60s
      makeSession('2026-12-01T11:00:00Z'),                          // active, excluded
    ];
    expect(computeTotalSeconds(sessions)).toBe(60);
  });
});
