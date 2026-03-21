'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TaskForm from '../components/TaskForm';
import '../../app/styles/Tasks.css';

function TasksContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId') ?? undefined;

  return (
    <div className="container">
      <TaskForm taskId={taskId} />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
}
