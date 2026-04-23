'use client';

import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EventClickArg } from '@fullcalendar/core';
import {
  CalendarEvent,
  CalendarEventFormValues,
  EventType,
  validateEventForm,
  isValidWeeklyGoal,
  computeAvailableHours,
  computeWeeklyStudyHours,
  shouldShowBadge,
} from '../../lib/calendarUtils';
import {
  fetchCalendarEvents,
  fetchWeeklyGoal,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  upsertWeeklyGoal,
} from '../../lib/apiClient';
import '../styles/Calendar.css';

const DEFAULT_FORM: CalendarEventFormValues = {
  title: '',
  type: 'class',
  start: '',
  end: '',
};

// Helper: convert ISO timestamp to datetime-local string (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarPage(): JSX.Element {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);
  const [goalInput, setGoalInput] = useState<string>('0');
  const [formValues, setFormValues] = useState<CalendarEventFormValues>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeBadges, setActiveBadges] = useState<Array<'streak' | 'goal'>>([]);

  // ─── Modal state ──────────────────────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [editValues, setEditValues] = useState<CalendarEventFormValues>(DEFAULT_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  const streakBadgeShown = useRef(false);
  const goalBadgeShown = useRef(false);

  // ─── Load data on mount ───────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [eventsData, goalData] = await Promise.all([fetchCalendarEvents(), fetchWeeklyGoal()]);
        setEvents(eventsData);
        const goal = goalData ?? 0;
        setWeeklyGoal(goal);
        setGoalInput(String(goal));
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Failed to load calendar data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Derived metrics ──────────────────────────────────────────────────────

  const todayStr = new Date().toLocaleDateString('en-CA');
  const availableHours = computeAvailableHours(events, todayStr);
  const weeklyStudyHours = computeWeeklyStudyHours(events, new Date());

  // ─── Badge logic ──────────────────────────────────────────────────────────

  useEffect(() => {
    const newBadges: Array<'streak' | 'goal'> = [];
    if (shouldShowBadge(streakBadgeShown.current, weeklyStudyHours >= 10)) {
      streakBadgeShown.current = true;
      newBadges.push('streak');
    }
    if (shouldShowBadge(goalBadgeShown.current, weeklyGoal > 0 && weeklyStudyHours >= weeklyGoal)) {
      goalBadgeShown.current = true;
      newBadges.push('goal');
    }
    if (newBadges.length > 0) {
      setActiveBadges(prev => [...prev, ...newBadges]);
    }
  }, [weeklyStudyHours, weeklyGoal]);

  // ─── Add event form handlers ──────────────────────────────────────────────

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    setFormError(null);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateEventForm(formValues);
    if (error) { setFormError(error); return; }
    try {
      const created = await createCalendarEvent(formValues);
      setEvents(prev => [...prev, created]);
      setFormValues(DEFAULT_FORM);
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create event.');
    }
  }

  // ─── Weekly goal handler ──────────────────────────────────────────────────

  async function handleGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setGoalInput(raw);
    const parsed = parseInt(raw, 10);
    if (isValidWeeklyGoal(parsed)) {
      try {
        await upsertWeeklyGoal(parsed);
        setWeeklyGoal(parsed);
      } catch { /* silent */ }
    }
  }

  // ─── Calendar event click → open modal ───────────────────────────────────

  function handleEventClick(arg: EventClickArg) {
    const clicked = events.find(e => e.id === arg.event.id);
    if (!clicked) return;
    setSelectedEvent(clicked);
    setModalMode('view');
    setEditError(null);
  }

  function openEditMode() {
    if (!selectedEvent) return;
    setEditValues({
      title: selectedEvent.title,
      type: selectedEvent.type as EventType,
      start: toDatetimeLocal(selectedEvent.start),
      end: selectedEvent.end ? toDatetimeLocal(selectedEvent.end) : '',
    });
    setModalMode('edit');
    setEditError(null);
  }

  function closeModal() {
    setSelectedEvent(null);
    setModalMode('view');
    setEditError(null);
  }

  // ─── Delete from modal ────────────────────────────────────────────────────

  async function handleModalDelete() {
    if (!selectedEvent) return;
    try {
      await deleteCalendarEvent(selectedEvent.id);
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      closeModal();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete event.');
      closeModal();
    }
  }

  // ─── Edit from modal ──────────────────────────────────────────────────────

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setEditValues(prev => ({ ...prev, [name]: value }));
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    const error = validateEventForm(editValues);
    if (error) { setEditError(error); return; }
    try {
      const updated = await updateCalendarEvent(selectedEvent.id, editValues);
      setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev));
      closeModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update event.');
    }
  }

  // ─── Badge dismiss ────────────────────────────────────────────────────────

  function dismissBadge(badge: 'streak' | 'goal') {
    setActiveBadges(prev => prev.filter(b => b !== badge));
  }

  // ─── FullCalendar event objects ───────────────────────────────────────────

  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end ?? undefined,
    color: e.color,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="calendar-page"><p>Loading calendar...</p></div>;
  }

  return (
    <div className="calendar-page">
      <h1 className="calendar-title">Smart Study Planner</h1>

      {pageError && <p className="calendar-error">{pageError}</p>}

      {/* Badges */}
      {activeBadges.includes('streak') && (
        <div className="badge-notification" role="alert">
          🏆 Badge Earned: 10 Hour Study Streak!
          <button className="badge-dismiss" onClick={() => dismissBadge('streak')} aria-label="Dismiss badge">✕</button>
        </div>
      )}
      {activeBadges.includes('goal') && (
        <div className="badge-notification" role="alert">
          🎉 Weekly Study Goal Achieved!
          <button className="badge-dismiss" onClick={() => dismissBadge('goal')} aria-label="Dismiss badge">✕</button>
        </div>
      )}

      {/* Metrics */}
      <div className="calendar-metrics">
        <div className="metric-card">
          <span className="metric-label">Available Hours Today</span>
          <span className="metric-value">{availableHours.toFixed(2)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Weekly Study Progress</span>
          <span className="metric-value">{weeklyStudyHours.toFixed(2)} / {weeklyGoal} hrs</span>
        </div>
        <div className="metric-card">
          <label className="metric-label" htmlFor="weekly-goal">Weekly Study Goal (hours)</label>
          <input
            id="weekly-goal"
            type="number"
            min="1"
            className="goal-input"
            value={goalInput}
            onChange={handleGoalChange}
          />
        </div>
      </div>

      {/* Add Event Form */}
      <section className="event-form-section">
        <h2>Add Event / Task</h2>
        <form className="event-form" onSubmit={handleFormSubmit}>
          <input
            type="text"
            name="title"
            placeholder="Event Title (e.g., Math Class, Work)"
            value={formValues.title}
            onChange={handleFormChange}
            className="form-input"
          />
          <select name="type" value={formValues.type} onChange={handleFormChange} className="form-select">
            <option value="class">Class</option>
            <option value="task">Task</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="appointment">Appointment</option>
          </select>
          <label className="form-label">Start Time:</label>
          <input type="datetime-local" name="start" value={formValues.start} onChange={handleFormChange} className="form-input" />
          <label className="form-label">End Time:</label>
          <input type="datetime-local" name="end" value={formValues.end} onChange={handleFormChange} className="form-input" />
          {formError && <p className="form-error">{formError}</p>}
          <button type="submit" className="form-submit-btn">Add Event</button>
        </form>
      </section>

      {/* Calendar */}
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          eventClick={handleEventClick}
          eventCursor="pointer"
          height="auto"
        />
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Event options" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>

            {modalMode === 'view' ? (
              <>
                <h3 className="modal-title">{selectedEvent.title}</h3>
                <p className="modal-meta">
                  <strong>Type:</strong> {selectedEvent.type}
                </p>
                <p className="modal-meta">
                  <strong>Start:</strong> {new Date(selectedEvent.start).toLocaleString()}
                </p>
                {selectedEvent.end && (
                  <p className="modal-meta">
                    <strong>End:</strong> {new Date(selectedEvent.end).toLocaleString()}
                  </p>
                )}
                <div className="modal-actions">
                  <button className="modal-edit-btn" onClick={openEditMode}>Edit</button>
                  <button className="modal-delete-btn" onClick={handleModalDelete}>Delete</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">Edit Event</h3>
                <form className="event-form" onSubmit={handleEditSubmit}>
                  <input
                    type="text"
                    name="title"
                    value={editValues.title}
                    onChange={handleEditChange}
                    className="form-input"
                    placeholder="Event Title"
                  />
                  <select name="type" value={editValues.type} onChange={handleEditChange} className="form-select">
                    <option value="class">Class</option>
                    <option value="task">Task</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="appointment">Appointment</option>
                  </select>
                  <label className="form-label">Start Time:</label>
                  <input type="datetime-local" name="start" value={editValues.start} onChange={handleEditChange} className="form-input" />
                  <label className="form-label">End Time:</label>
                  <input type="datetime-local" name="end" value={editValues.end} onChange={handleEditChange} className="form-input" />
                  {editError && <p className="form-error">{editError}</p>}
                  <div className="modal-actions">
                    <button type="submit" className="modal-edit-btn">Save</button>
                    <button type="button" className="modal-cancel-btn" onClick={() => setModalMode('view')}>Cancel</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
