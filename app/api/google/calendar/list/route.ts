import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCalendarList } from '@/lib/server/google-calendar';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendars = await getCalendarList(user.id);
    return NextResponse.json(calendars);
  } catch (error) {
    console.error('Calendar list API error:', error);

    if (error instanceof Error && error.message.includes('token not available')) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar list' },
      { status: 500 }
    );
  }
}
