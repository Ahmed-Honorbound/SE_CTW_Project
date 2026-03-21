'use client';

import { useState, useEffect, useRef } from 'react';
import { TimeSession } from '../../lib/types';
import { startTimeSession, stopTimeSession, computeTotalSeconds } from '../../lib/taskService';

interface TaskTimerProps {
  taskId: string;
  sessions: TimeSession[];
  onUpdate: () => void;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export default function TaskTimer({ taskId, sessions, onUpdate }: TaskTimerProps) {
  const activeSession = sessions.find(s => !s.ended_at);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(activeSession?.id ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(() => computeTotalSeconds(sessions));
  const [timerError, setTimerError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume elapsed if there's already an active session
  useEffect(() => {
    if (activeSession) {
      const elapsed = Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000);
      setElapsedSeconds(elapsed);
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setTimerError(null);
    try {
      const session = await startTimeSession(taskId);
      setActiveSessionId(session.id);
      setElapsedSeconds(0);
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } catch (err) {
      setTimerError(err instanceof Error ? err.message : 'Failed to start timer.');
    }
  }

  async function handleStop() {
    if (!activeSessionId) return;
    setTimerError(null);
    try {
      const stopped = await stopTimeSession(activeSessionId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setActiveSessionId(null);
      setElapsedSeconds(0);
      const updatedSessions = sessions.map(s => s.id === stopped.id ? stopped : s);
      setTotalSeconds(computeTotalSeconds(updatedSessions));
      onUpdate();
    } catch (err) {
      setTimerError(err instanceof Error ? err.message : 'Failed to stop timer.');
    }
  }

  const isRunning = Boolean(activeSessionId);

  return (
    <div className="task-timer">
      <span>Total: {formatSeconds(totalSeconds)}</span>
      {isRunning && <span> | Session: {formatSeconds(elapsedSeconds)}</span>}
      {timerError && <span className="field-error"> {timerError}</span>}
      <button onClick={isRunning ? handleStop : handleStart}>
        {isRunning ? 'Stop' : 'Start Timer'}
      </button>
    </div>
  );
}
