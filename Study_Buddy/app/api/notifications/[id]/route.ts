import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { markAsRead } from '@/lib/notificationService';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await markAsRead(supabase, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
