import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { fetchEvents, createEvent } from '../../../../lib/calendarService';

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const events = await fetchEvents(supabase, user.id);
    return NextResponse.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const created = await createEvent(supabase, payload, user.id);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
