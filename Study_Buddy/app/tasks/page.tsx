'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TaskForm from '../components/TaskForm';
import '../styles/Tasks.css';

function TasksContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId') ?? undefined;

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1 className="tasks-title">{taskId ? 'Edit Task' : 'Add New Task'}</h1>
        <p className="tasks-subtitle">
          {taskId ? 'Update the details below to edit this task.' : 'Fill in the details below to create a new task.'}
        </p>
      </div>
      <section className="task-form-section">
        <TaskForm taskId={taskId} />
      </section>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="tasks-page">Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
}
