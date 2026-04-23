import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { recordCompletion } from '@/lib/taskService';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { dueDate } = await req.json();
    const record = await recordCompletion(supabase, id, dueDate);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
