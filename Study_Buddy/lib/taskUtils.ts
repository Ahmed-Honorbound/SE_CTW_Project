import type { TimeSession } from './types';

export function computeTotalSeconds(sessions: TimeSession[]): number {
  return sessions.reduce((total, session) => {
    if (!session.ended_at) return total;
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ended_at).getTime();
    return total + Math.floor((end - start) / 1000);
  }, 0);
}
