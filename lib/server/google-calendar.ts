import { getValidGoogleToken } from './google-auth';
import type {
  GoogleCalendar,
  GoogleCalendarEvent,
  GoogleCalendarListResponse,
  GoogleCalendarEventsResponse,
} from '@/lib/types/google-api';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * ユーザーのカレンダー一覧を取得
 */
export async function getCalendarList(userId: string): Promise<GoogleCalendar[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Calendar list fetch error:', error);
    throw new Error(`Failed to fetch calendar list: ${response.status}`);
  }

  const data: GoogleCalendarListResponse = await response.json();
  return data.items || [];
}

/**
 * 指定したカレンダーのイベント一覧を取得
 */
export async function getCalendarEvents(
  userId: string,
  calendarId: string = 'primary',
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
  } = {}
): Promise<GoogleCalendarEvent[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const params = new URLSearchParams();

  if (options.timeMin) params.set('timeMin', options.timeMin);
  if (options.timeMax) params.set('timeMax', options.timeMax);
  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.singleEvents !== undefined) params.set('singleEvents', options.singleEvents.toString());
  if (options.orderBy) params.set('orderBy', options.orderBy);

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Calendar events fetch error:', error);
    throw new Error(`Failed to fetch calendar events: ${response.status}`);
  }

  const data: GoogleCalendarEventsResponse = await response.json();
  return data.items || [];
}

/**
 * 今日のイベントを取得
 */
export async function getTodayEvents(userId: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return getCalendarEvents(userId, 'primary', {
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });
}

/**
 * 今週のイベントを取得
 */
export async function getWeekEvents(userId: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // 日曜日
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return getCalendarEvents(userId, 'primary', {
    timeMin: startOfWeek.toISOString(),
    timeMax: endOfWeek.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });
}
