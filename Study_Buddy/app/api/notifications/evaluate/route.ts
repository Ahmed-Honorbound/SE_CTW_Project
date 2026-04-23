import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import {
  fetchNotifications,
  createNotification,
  buildNotificationRecord,
  shouldCreateNotification,
  filterDueSoonTasks,
  filterOverdueTasks,
} from '../../../../lib/notificationService';
import type { Task } from '../../../../lib/types';

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tasks } = await req.json() as { tasks: Task[] };
    const now = new Date();
    const existing = await fetchNotifications(supabase, user.id);
    const created = [];

    for (const task of filterDueSoonTasks(tasks, now)) {
      if (shouldCreateNotification(task, 'due_soon', existing)) {
        const notification = await createNotification(supabase, buildNotificationRecord(task, 'due_soon', now), user.id);
        created.push(notification);
      }
    }

    for (const task of filterOverdueTasks(tasks)) {
      if (shouldCreateNotification(task, 'overdue', existing)) {
        const notification = await createNotification(supabase, buildNotificationRecord(task, 'overdue', now), user.id);
        created.push(notification);
      }
    }

    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
