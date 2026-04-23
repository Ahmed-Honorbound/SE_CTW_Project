'use client';

import type { Suggestions } from '../../lib/analyticsUtils';

interface SuggestionsPanelProps {
  suggestions: Suggestions;
}

export default function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  const hasData =
    suggestions.focusSubjects.length > 0 ||
    suggestions.avoidSubjects.length > 0 ||
    suggestions.mostProductiveDays.length > 0 ||
    suggestions.mostProductiveHours.length > 0;

  if (!hasData) {
    return (
      <div className="summary-panel">
        <h2>Suggestions</h2>
        <p className="empty-state">Not enough data yet. Complete more tasks to get personalized suggestions.</p>
      </div>
    );
  }

  return (
    <div className="summary-panel">
      <h2>Suggestions</h2>

      {suggestions.focusSubjects.length > 0 && (
        <div className="suggestion-block">
          <h3>📚 Focus On</h3>
          <p>These subjects have a high overdue rate — give them more attention:</p>
          <ul>{suggestions.focusSubjects.map(s => <li key={s}>{s}</li>)}</ul>
        </div>
      )}

      {suggestions.avoidSubjects.length > 0 && (
        <div className="suggestion-block">
          <h3>⚠️ Falling Behind</h3>
          <p>Consistently struggling with these subjects:</p>
          <ul>{suggestions.avoidSubjects.map(s => <li key={s}>{s}</li>)}</ul>
        </div>
      )}

      {suggestions.mostProductiveDays.length > 0 && (
        <div className="suggestion-block">
          <h3>📅 Most Productive Days</h3>
          <p>You complete tasks on time most often on:</p>
          <ul>{suggestions.mostProductiveDays.map(d => <li key={d}>{d}</li>)}</ul>
        </div>
      )}

      {suggestions.mostProductiveHours.length > 0 && (
        <div className="suggestion-block">
          <h3>🕐 Best Study Hours</h3>
          <p>You tend to start sessions most often at:</p>
          <ul>{suggestions.mostProductiveHours.map(h => {
            const start = h % 12 || 12;
            const end = (h + 1) % 12 || 12;
            const startAmPm = h < 12 ? 'AM' : 'PM';
            const endAmPm = (h + 1) < 12 ? 'AM' : 'PM';
            return <li key={h}>{start}:00 {startAmPm} – {end}:00 {endAmPm}</li>;
          })}</ul>
        </div>
      )}
    </div>
  );
}
