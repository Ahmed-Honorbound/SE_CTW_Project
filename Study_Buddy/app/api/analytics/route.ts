import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { fetchAnalyticsData } from '../../../lib/analyticsService';

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await fetchAnalyticsData(supabase, user.id);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
