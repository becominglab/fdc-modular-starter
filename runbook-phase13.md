# Phase 13: Google Calendar/Tasks API 連携機能

## 目標

Phase 12 で準備した認証基盤を使用して、Google Calendar と Google Tasks の実際のデータ取得・表示機能を実装する。

## 機能概要

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                       │
│  ┌─────────────────────────────┬─────────────────────────────┐  │
│  │  今日の予定                  │  Google Tasks               │  │
│  │  ─────────────────────────  │  ─────────────────────────  │  │
│  │  09:00 チームミーティング    │  ☐ 企画書を作成             │  │
│  │  14:00 クライアント打合せ    │  ☐ メール返信               │  │
│  │  16:00 レビュー会            │  ☑ 資料準備                 │  │
│  └─────────────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Google API 型定義作成

### 1.1 型定義ファイル作成

**ファイル:** `lib/types/google-api.ts`

```typescript
// Google Calendar API 型定義

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  created?: string;
  updated?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
}

export interface GoogleCalendarListResponse {
  kind: 'calendar#calendarList';
  items: GoogleCalendar[];
  nextPageToken?: string;
}

export interface GoogleCalendarEventsResponse {
  kind: 'calendar#events';
  summary: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  timeZone?: string;
}

// Google Tasks API 型定義

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
  selfLink?: string;
  updated?: string;
}

export interface GoogleTaskListsResponse {
  kind: 'tasks#taskLists';
  items: GoogleTaskList[];
  nextPageToken?: string;
}

export interface GoogleTasksResponse {
  kind: 'tasks#tasks';
  items: GoogleTask[];
  nextPageToken?: string;
}
```

### 確認ポイント

- [ ] `lib/types/google-api.ts` が作成された

---

## Step 2: Google Calendar API クライアント作成

### 2.1 Calendar API クライアント

**ファイル:** `lib/server/google-calendar.ts`

```typescript
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
```

### 確認ポイント

- [ ] `lib/server/google-calendar.ts` が作成された

---

## Step 3: Google Tasks API クライアント作成

### 3.1 Tasks API クライアント

**ファイル:** `lib/server/google-tasks.ts`

```typescript
import { getValidGoogleToken } from './google-auth';
import type {
  GoogleTaskList,
  GoogleTask,
  GoogleTaskListsResponse,
  GoogleTasksResponse,
} from '@/lib/types/google-api';

const TASKS_API_BASE = 'https://www.googleapis.com/tasks/v1';

/**
 * ユーザーのタスクリスト一覧を取得
 */
export async function getTaskLists(userId: string): Promise<GoogleTaskList[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const response = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Task lists fetch error:', error);
    throw new Error(`Failed to fetch task lists: ${response.status}`);
  }

  const data: GoogleTaskListsResponse = await response.json();
  return data.items || [];
}

/**
 * 指定したタスクリストのタスク一覧を取得
 */
export async function getTasks(
  userId: string,
  taskListId: string = '@default',
  options: {
    maxResults?: number;
    showCompleted?: boolean;
    showHidden?: boolean;
    dueMin?: string;
    dueMax?: string;
  } = {}
): Promise<GoogleTask[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const params = new URLSearchParams();

  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.showCompleted !== undefined) params.set('showCompleted', options.showCompleted.toString());
  if (options.showHidden !== undefined) params.set('showHidden', options.showHidden.toString());
  if (options.dueMin) params.set('dueMin', options.dueMin);
  if (options.dueMax) params.set('dueMax', options.dueMax);

  const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Tasks fetch error:', error);
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  }

  const data: GoogleTasksResponse = await response.json();
  return data.items || [];
}

/**
 * 未完了のタスクを取得
 */
export async function getPendingTasks(userId: string): Promise<GoogleTask[]> {
  return getTasks(userId, '@default', {
    showCompleted: false,
    maxResults: 20,
  });
}

/**
 * タスクのステータスを更新
 */
export async function updateTaskStatus(
  userId: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTask> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
      completed: completed ? new Date().toISOString() : null,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Task update error:', error);
    throw new Error(`Failed to update task: ${response.status}`);
  }

  return response.json();
}
```

### 確認ポイント

- [ ] `lib/server/google-tasks.ts` が作成された

---

## Step 4: API エンドポイント作成

### 4.1 カレンダーイベント API

**ファイル:** `app/api/google/calendar/events/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayEvents, getWeekEvents, getCalendarEvents } from '@/lib/server/google-calendar';

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

    return NextResponse.json(events);
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
```

### 4.2 Google Tasks API

**ファイル:** `app/api/google/tasks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPendingTasks, getTaskLists, getTasks } from '@/lib/server/google-tasks';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const listId = searchParams.get('listId');
    const showCompleted = searchParams.get('showCompleted') === 'true';

    let tasks;

    if (listId) {
      tasks = await getTasks(user.id, listId, { showCompleted });
    } else {
      tasks = await getPendingTasks(user.id);
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Google Tasks API error:', error);

    if (error instanceof Error && error.message.includes('token not available')) {
      return NextResponse.json(
        { error: 'Google Tasks not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
```

### 4.3 タスクリスト API

**ファイル:** `app/api/google/tasks/lists/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskLists } from '@/lib/server/google-tasks';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskLists = await getTaskLists(user.id);
    return NextResponse.json(taskLists);
  } catch (error) {
    console.error('Task lists API error:', error);

    if (error instanceof Error && error.message.includes('token not available')) {
      return NextResponse.json(
        { error: 'Google Tasks not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch task lists' },
      { status: 500 }
    );
  }
}
```

### 4.4 カレンダー一覧 API

**ファイル:** `app/api/google/calendar/list/route.ts`

```typescript
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
```

### 確認ポイント

- [ ] `app/api/google/calendar/events/route.ts` が作成された
- [ ] `app/api/google/calendar/list/route.ts` が作成された
- [ ] `app/api/google/tasks/route.ts` が作成された
- [ ] `app/api/google/tasks/lists/route.ts` が作成された

---

## Step 5: React Hooks 作成

### 5.1 カレンダーイベント用 Hook

**ファイル:** `lib/hooks/useGoogleCalendar.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GoogleCalendarEvent } from '@/lib/types/google-api';

type Range = 'today' | 'week' | 'custom';

interface UseGoogleCalendarOptions {
  range?: Range;
  timeMin?: string;
  timeMax?: string;
  autoFetch?: boolean;
}

export function useGoogleCalendar(options: UseGoogleCalendarOptions = {}) {
  const { range = 'today', timeMin, timeMax, autoFetch = true } = options;

  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ range });
      if (range === 'custom' && timeMin && timeMax) {
        params.set('timeMin', timeMin);
        params.set('timeMax', timeMax);
      }

      const response = await fetch(`/api/google/calendar/events?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          setEvents([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [range, timeMin, timeMax]);

  useEffect(() => {
    if (autoFetch) {
      fetchEvents();
    }
  }, [fetchEvents, autoFetch]);

  return {
    events,
    isLoading,
    error,
    isConnected,
    refetch: fetchEvents,
  };
}
```

### 5.2 Google Tasks 用 Hook

**ファイル:** `lib/hooks/useGoogleTasks.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GoogleTask, GoogleTaskList } from '@/lib/types/google-api';

interface UseGoogleTasksOptions {
  listId?: string;
  showCompleted?: boolean;
  autoFetch?: boolean;
}

export function useGoogleTasks(options: UseGoogleTasksOptions = {}) {
  const { listId, showCompleted = false, autoFetch = true } = options;

  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (listId) params.set('listId', listId);
      if (showCompleted) params.set('showCompleted', 'true');

      const response = await fetch(`/api/google/tasks?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          setTasks([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [listId, showCompleted]);

  useEffect(() => {
    if (autoFetch) {
      fetchTasks();
    }
  }, [fetchTasks, autoFetch]);

  return {
    tasks,
    isLoading,
    error,
    isConnected,
    refetch: fetchTasks,
  };
}

export function useGoogleTaskLists() {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/tasks/lists', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch task lists');
      }

      const data = await response.json();
      setTaskLists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskLists();
  }, [fetchTaskLists]);

  return {
    taskLists,
    isLoading,
    error,
    refetch: fetchTaskLists,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useGoogleCalendar.ts` が作成された
- [ ] `lib/hooks/useGoogleTasks.ts` が作成された

---

## Step 6: ダッシュボードウィジェット作成

### 6.1 今日の予定ウィジェット

**ファイル:** `components/dashboard/TodayEventsWidget.tsx`

```typescript
'use client';

import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';
import { useGoogleCalendar } from '@/lib/hooks/useGoogleCalendar';
import type { GoogleCalendarEvent } from '@/lib/types/google-api';

function formatEventTime(event: GoogleCalendarEvent): string {
  if (event.start.date) {
    return '終日';
  }

  if (event.start.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end.dateTime ? new Date(event.end.dateTime) : null;

    const startTime = start.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (end) {
      const endTime = end.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${startTime} - ${endTime}`;
    }

    return startTime;
  }

  return '';
}

function isEventNow(event: GoogleCalendarEvent): boolean {
  if (!event.start.dateTime || !event.end.dateTime) return false;

  const now = Date.now();
  const start = new Date(event.start.dateTime).getTime();
  const end = new Date(event.end.dateTime).getTime();

  return now >= start && now <= end;
}

export function TodayEventsWidget() {
  const { events, isLoading, error, isConnected } = useGoogleCalendar({
    range: 'today',
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">今日の予定</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">今日の予定</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Calendar size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Google カレンダーが連携されていません</p>
          <p className="text-xs mt-1">再ログインして連携を許可してください</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">今日の予定</h3>
        </div>
        <div className="text-center py-8 text-red-500">
          <p className="text-sm">読み込みエラー</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">今日の予定</h3>
        </div>
        <span className="text-xs text-gray-400">
          {events.length} 件
        </span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">今日の予定はありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const isNow = isEventNow(event);
            return (
              <div
                key={event.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isNow
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isNow && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      )}
                      <h4 className="font-medium text-gray-900 truncate">
                        {event.summary || '(タイトルなし)'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatEventTime(event)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={12} />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-white rounded transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 6.2 Google Tasks ウィジェット

**ファイル:** `components/dashboard/GoogleTasksWidget.tsx`

```typescript
'use client';

import { CheckSquare, Square, ExternalLink } from 'lucide-react';
import { useGoogleTasks } from '@/lib/hooks/useGoogleTasks';
import type { GoogleTask } from '@/lib/types/google-api';

function formatDueDate(due: string | undefined): string | null {
  if (!due) return null;

  const dueDate = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);

  if (dueDateOnly.getTime() === today.getTime()) {
    return '今日';
  }
  if (dueDateOnly.getTime() === tomorrow.getTime()) {
    return '明日';
  }
  if (dueDateOnly < today) {
    return '期限切れ';
  }

  return dueDate.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
}

export function GoogleTasksWidget() {
  const { tasks, isLoading, error, isConnected } = useGoogleTasks();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Google Tasks が連携されていません</p>
          <p className="text-xs mt-1">再ログインして連携を許可してください</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <div className="text-center py-8 text-red-500">
          <p className="text-sm">読み込みエラー</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <span className="text-xs text-gray-400">
          {tasks.length} 件
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <CheckSquare size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">未完了のタスクはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const dueLabel = formatDueDate(task.due);
            const isOverdue = dueLabel === '期限切れ';

            return (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {task.status === 'completed' ? (
                      <CheckSquare size={18} className="text-green-500" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${
                      task.status === 'completed'
                        ? 'text-gray-400 line-through'
                        : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h4>
                    {task.notes && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {task.notes}
                      </p>
                    )}
                    {dueLabel && (
                      <span className={`text-xs mt-1 inline-block ${
                        isOverdue ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/dashboard/TodayEventsWidget.tsx` が作成された
- [ ] `components/dashboard/GoogleTasksWidget.tsx` が作成された

---

## Step 7: ダッシュボードページ更新

### 7.1 ダッシュボードにウィジェット追加

**ファイル:** `app/(app)/dashboard/page.tsx` を更新

既存のダッシュボードページに Google ウィジェットを追加します。以下のインポートとコンポーネントを追加：

```typescript
// インポート追加
import { TodayEventsWidget } from '@/components/dashboard/TodayEventsWidget';
import { GoogleTasksWidget } from '@/components/dashboard/GoogleTasksWidget';

// JSX 内に追加（適切な場所に）
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <TodayEventsWidget />
  <GoogleTasksWidget />
</div>
```

### 確認ポイント

- [ ] ダッシュボードに Google ウィジェットが表示される

---

## Step 8: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックがエラーなく完了
- [ ] ビルドがエラーなく完了

---

## Step 9: 動作確認

### 9.1 開発サーバー起動

```bash
npm run dev
```

### 9.2 テスト手順

1. http://localhost:3000/login にアクセス
2. Google でログイン（Calendar/Tasks 権限を許可）
3. ダッシュボードで以下を確認：
   - 「今日の予定」ウィジェットが表示される
   - 「Google Tasks」ウィジェットが表示される
   - Google カレンダーの予定が表示される
   - Google Tasks の未完了タスクが表示される

### 確認ポイント

- [ ] 今日の予定ウィジェットが正常に表示される
- [ ] Google Tasks ウィジェットが正常に表示される
- [ ] 未連携時は適切なメッセージが表示される

---

## Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 13: Google Calendar/Tasks API 連携機能

- lib/types/google-api.ts: Google API 型定義
- lib/server/google-calendar.ts: Calendar API クライアント
- lib/server/google-tasks.ts: Tasks API クライアント
- app/api/google/calendar/events: カレンダーイベント API
- app/api/google/calendar/list: カレンダー一覧 API
- app/api/google/tasks: タスク取得 API
- app/api/google/tasks/lists: タスクリスト API
- lib/hooks/useGoogleCalendar.ts: カレンダー用 Hook
- lib/hooks/useGoogleTasks.ts: タスク用 Hook
- components/dashboard/TodayEventsWidget.tsx: 今日の予定ウィジェット
- components/dashboard/GoogleTasksWidget.tsx: Google Tasks ウィジェット

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### 型定義
- [ ] `lib/types/google-api.ts` 作成

### サーバーサイド
- [ ] `lib/server/google-calendar.ts` 作成
- [ ] `lib/server/google-tasks.ts` 作成

### API エンドポイント
- [ ] `app/api/google/calendar/events/route.ts` 作成
- [ ] `app/api/google/calendar/list/route.ts` 作成
- [ ] `app/api/google/tasks/route.ts` 作成
- [ ] `app/api/google/tasks/lists/route.ts` 作成

### クライアントサイド
- [ ] `lib/hooks/useGoogleCalendar.ts` 作成
- [ ] `lib/hooks/useGoogleTasks.ts` 作成
- [ ] `components/dashboard/TodayEventsWidget.tsx` 作成
- [ ] `components/dashboard/GoogleTasksWidget.tsx` 作成

### 動作確認
- [ ] 今日の予定が表示される
- [ ] Google Tasks が表示される
- [ ] 未連携時のメッセージ表示
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 14 以降）

1. **カレンダーイベント作成機能**
   - Task からカレンダーイベントを作成
   - 予定の編集・削除

2. **双方向同期**
   - FDC Task と Google Tasks の同期
   - 変更の自動反映

3. **週間カレンダービュー**
   - 週単位でのイベント表示
   - ドラッグ＆ドロップ対応
