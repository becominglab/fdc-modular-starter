import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getTodayEvents,
  getWeekEvents,
  getCalendarEvents,
  convertEventsToFDC,
} from '@/lib/server/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'today';

    let events;

    switch (range) {
      case 'today':
        events = await getTodayEvents(user.id);
        break;
      case 'week':
        events = await getWeekEvents(user.id);
        break;
      case 'custom':
        const timeMin = searchParams.get('timeMin');
        const timeMax = searchParams.get('timeMax');
        if (!timeMin || !timeMax) {
          return NextResponse.json(
            { error: 'timeMin and timeMax are required for custom range' },
            { status: 400 }
          );
        }
        events = await getCalendarEvents(user.id, 'primary', {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });
        break;
      default:
        events = await getTodayEvents(user.id);
    }

    // FDCEvent 形式に変換（category: 'unclassified' 付き）
    const fdcEvents = convertEventsToFDC(events);
    return NextResponse.json(fdcEvents);
  } catch (error) {
    console.error('Calendar events API error:', error);

    if (error instanceof Error && error.message.includes('token not available')) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
