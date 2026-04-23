import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { stopTimeSession } from '@/lib/taskService';

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId } = await req.json();
    const session = await stopTimeSession(supabase, sessionId);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
