'use client';

import { useState, useEffect } from 'react';
import {
  computeWeeklyStats,
  computeMonthlyStats,
  computeSuggestions,
  getWeekStart,
  RawAnalyticsData,
} from '../../lib/analyticsUtils';
import { fetchAnalyticsData } from '../../lib/apiClient';
import WeeklySummary from './WeeklySummary';
import MonthlySummary from './MonthlySummary';
import SuggestionsPanel from './SuggestionsPanel';

export default function AnalyticsDashboard() {
  const [rawData, setRawData] = useState<RawAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    fetchAnalyticsData()
      .then(setRawData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  function prevWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; });
  }
  function nextWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; });
  }
  function prevMonth() {
    setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11; } return m - 1; });
  }
  function nextMonth() {
    setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0; } return m + 1; });
  }

  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const isCurrentWeek = weekStart.toISOString().split('T')[0] === currentWeekStart.toISOString().split('T')[0];
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  if (loading) return <div className="analytics-dashboard"><p>Loading analytics...</p></div>;
  if (error) return <div className="analytics-dashboard"><p className="form-error">{error}</p></div>;
  if (!rawData) return null;

  const weeklyStats = computeWeeklyStats(rawData, weekStart);
  const monthlyStats = computeMonthlyStats(rawData, month, year);
  const suggestions = computeSuggestions(rawData);

  return (
    <div className="analytics-dashboard">
      <WeeklySummary
        stats={weeklyStats}
        weekStart={weekStart}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
        isCurrentWeek={isCurrentWeek}
      />
      <MonthlySummary
        stats={monthlyStats}
        month={month}
        year={year}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        isCurrentMonth={isCurrentMonth}
      />
      <SuggestionsPanel suggestions={suggestions} />
    </div>
  );
}
