import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { addSubtask } from '@/lib/taskService';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description } = await req.json();
    const subtask = await addSubtask(supabase, id, name, description);
    return NextResponse.json(subtask, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
