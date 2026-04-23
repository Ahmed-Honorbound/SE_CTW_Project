'use client';

import type { WeeklyStats } from '../../lib/analyticsUtils';

interface WeeklySummaryProps {
  stats: WeeklyStats;
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  isCurrentWeek: boolean;
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function WeeklySummary({ stats, weekStart, onPrevWeek, onNextWeek, isCurrentWeek }: WeeklySummaryProps) {
  const hasActivity = stats.totalSeconds > 0 || stats.outcomes.completed > 0;

  return (
    <div className="summary-panel">
      <div className="summary-nav">
        <button onClick={onPrevWeek}>‹</button>
        <h2>Weekly Summary {isCurrentWeek && <span className="current-badge">This Week</span>}</h2>
        <button onClick={onNextWeek} disabled={isCurrentWeek}>›</button>
      </div>
      <p className="period-label">{formatWeekLabel(weekStart)}</p>

      {!hasActivity ? (
        <p className="empty-state">No activity this week.</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.outcomes.completed}</span>
              <span className="stat-label">Tasks Completed</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatHours(stats.totalSeconds)}</span>
              <span className="stat-label">Time Studied</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.busiestDay ?? '—'}</span>
              <span className="stat-label">Busiest Day</span>
            </div>
          </div>

          <div className="outcome-breakdown">
            <span className="outcome ahead">✓ Ahead: {stats.outcomes.aheadOfTime}</span>
            <span className="outcome ontime">✓ On Time: {stats.outcomes.onTime}</span>
            <span className="outcome overdue">✗ Overdue: {stats.outcomes.overdue}</span>
          </div>

          {stats.longestTask && (
            <p className="longest-task">
              Longest task: <strong>{stats.longestTask.name}</strong> ({stats.longestTask.subject}) — {formatHours(stats.longestTask.totalSeconds)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
