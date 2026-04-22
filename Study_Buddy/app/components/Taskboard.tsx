'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '../../lib/types';
import { fetchAllTasks, updateTaskStatus } from '../../lib/taskService';
import { evaluateNotifications } from '../../lib/notificationService';
import TaskCard from './TaskCard';
import '../styles/Taskboard.css';

type GroupedTasks = Record<TaskStatus, Task[]>;

const STATUS_SECTIONS: TaskStatus[] = ['Unstarted', 'In Progress', 'Complete', 'Overdue'];

function groupByStatus(tasks: Task[]): GroupedTasks {
  const grouped: GroupedTasks = {
    'Unstarted': [],
    'In Progress': [],
    'Complete': [],
    'Overdue': [],
  };
  for (const task of tasks) {
    grouped[task.status].push(task);
  }
  return grouped;
}

async function detectAndMarkOverdue(tasks: Task[]): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0];
  const overdueIds = tasks
    .filter(t => t.due_date < today && (t.status === 'Unstarted' || t.status === 'In Progress'))
    .map(t => t.id);

  for (const id of overdueIds) {
    await updateTaskStatus(id, 'Overdue');
  }
  return overdueIds;
}

export default function Taskboard() {
  const [grouped, setGrouped] = useState<GroupedTasks>({
    'Unstarted': [], 'In Progress': [], 'Complete': [], 'Overdue': [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tasks = await fetchAllTasks();
      const overdueIds = await detectAndMarkOverdue(tasks);
      // Apply overdue status locally so we don't need a second fetch
      const updated = tasks.map(t =>
        overdueIds.includes(t.id) ? { ...t, status: 'Overdue' as TaskStatus } : t
      );
      setGrouped(groupByStatus(updated));
      await evaluateNotifications(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (loading) {
    return <div className="taskboard"><p>Loading tasks...</p></div>;
  }

  if (error) {
    return <div className="taskboard"><p className="form-error">{error}</p></div>;
  }

  return (
    <div className="taskboard">
      {STATUS_SECTIONS.map(status => (
        <div key={status} className="status-section">
          <h2>{status}</h2>
          {grouped[status].length === 0 ? (
            <p className="empty-section">No tasks here.</p>
          ) : (
            grouped[status].map(task => (
              <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}
