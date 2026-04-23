'use client';

import type { MonthlyStats } from '../../lib/analyticsUtils';

interface MonthlySummaryProps {
  stats: MonthlyStats;
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isCurrentMonth: boolean;
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlySummary({ stats, month, year, onPrevMonth, onNextMonth, isCurrentMonth }: MonthlySummaryProps) {
  const hasActivity = stats.totalSeconds > 0 || stats.outcomes.completed > 0;

  return (
    <div className="summary-panel">
      <div className="summary-nav">
        <button onClick={onPrevMonth}>‹</button>
        <h2>Monthly Summary {isCurrentMonth && <span className="current-badge">This Month</span>}</h2>
        <button onClick={onNextMonth} disabled={isCurrentMonth}>›</button>
      </div>
      <p className="period-label">{MONTH_NAMES[month]} {year}</p>

      {!hasActivity ? (
        <p className="empty-state">No activity this month.</p>
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

          {stats.subjectStats.length > 0 && (
            <div className="subject-breakdown">
              <h3>By Subject</h3>
              {stats.subjectStats.map(s => (
                <div key={s.subject} className="subject-row">
                  <span className="subject-name">{s.subject}</span>
                  <span className="subject-time">{formatHours(s.totalSeconds)}</span>
                  <span className="subject-outcomes">
                    {s.outcomes.completed} done · {s.outcomes.overdue} overdue
                  </span>
                </div>
              ))}
              {stats.mostTimeSubject && <p className="subject-insight">Most time: <strong>{stats.mostTimeSubject}</strong></p>}
              {stats.leastTimeSubject && <p className="subject-insight">Least time: <strong>{stats.leastTimeSubject}</strong></p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
