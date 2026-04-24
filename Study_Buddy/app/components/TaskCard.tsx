'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '../../lib/types';
import { updateTask, deleteTask, recordCompletion, stopTimeSession, uncompleteTask, deleteNotificationsForTask, markNotificationsReadForTask } from '../../lib/apiClient';
import SubtaskList from './SubtaskList';
import TaskTimer from './TaskTimer';

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
}

export default function TaskCard({ task, onUpdate }: TaskCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  async function handleStart() {
    setError(null);
    try {
      await updateTask(task.id, { status: 'In Progress' });
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task.');
    }
  }

  async function handleComplete() {
    setError(null);
    try {
      // Stop any active timer session first
      const activeSession = task.time_sessions?.find(s => !s.ended_at);
      if (activeSession) {
        await stopTimeSession(activeSession.id);
      }
      await updateTask(task.id, { status: 'Complete' });
      await recordCompletion(task.id, task.due_date);
      await markNotificationsReadForTask(task.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task.');
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteNotificationsForTask(task.id);
      await deleteTask(task.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
      setConfirming(false);
    }
  }

  async function handleUncomplete() {
    setError(null);
    try {
      await uncompleteTask(task.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uncomplete task.');
    }
  }

  const completionOutcome = task.completion_records?.[0]?.outcome;

  return (
    <div className="tasks">
      <div className="task-header">
        <h3>{task.name}</h3>
        <div className="task-header-right">
          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand task' : 'Minimize task'}>
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <ul className="task-details">
            <li>Subject: {task.subject}</li>
            <li>Due: {task.due_date}</li>
            <li>Status: {task.status}</li>
            {task.status === 'Complete' && completionOutcome && (
              <li>Completed: <span className="outcome-badge">{completionOutcome}</span></li>
            )}
          </ul>

          {task.description && <p className="task-description">{task.description}</p>}

          {error && <p className="field-error">{error}</p>}

          <div className="task-actions">
            {(task.status === 'Unstarted' || task.status === 'Overdue') && (
              <button onClick={handleStart}>Start</button>
            )}
            {(task.status === 'In Progress' || task.status === 'Overdue') && (
              <button onClick={handleComplete}>Complete</button>
            )}
            <button onClick={() => router.push(`/tasks?taskId=${task.id}`)}>Edit</button>
            {task.status === 'Complete' && (
              <button onClick={handleUncomplete}>Uncomplete</button>
            )}
            {!confirming ? (
              <button onClick={() => setConfirming(true)}>Delete</button>
            ) : (
              <span>
                Are you sure?{' '}
                <button onClick={handleDelete}>Yes</button>{' '}
                <button onClick={() => setConfirming(false)}>No</button>
              </span>
            )}
          </div>

          {task.status === 'In Progress' && (
            <TaskTimer
              taskId={task.id}
              sessions={task.time_sessions ?? []}
              onUpdate={onUpdate}
            />
          )}

          <SubtaskList
            taskId={task.id}
            subtasks={task.subtasks ?? []}
            onUpdate={onUpdate}
          />
        </>
      )}
    </div>
  );
}
