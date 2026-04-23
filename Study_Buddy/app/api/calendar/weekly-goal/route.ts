import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { fetchWeeklyGoal, upsertWeeklyGoal } from '../../../../lib/calendarService';

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const goal = await fetchWeeklyGoal(supabase, user.id);
    return NextResponse.json(goal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { goal } = await req.json();
    await upsertWeeklyGoal(supabase, goal, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
