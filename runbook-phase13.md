# Phase 13: Google Calendar API 連携 + 未分類イベント管理

## 目標

Google Calendar API を使って予定を取得し、アプリに表示：
- カレンダー一覧の取得
- イベント（予定）の取得
- 今日の予定をダッシュボードに表示
- **未分類イベントの表示とタスク化**

---

## アイゼンハワーマトリクス（4象限 + 2特殊）

```
FDC は「緊急度」×「重要度」で4象限に分類します：

                │  緊急              │  緊急でない
────────────────┼────────────────────┼──────────────────────
  重要          │  ♠ spade（黒）    │  ♥ heart（赤）
                │  すぐやる          │  予定に入れ実行
                │  Do Now            │  Schedule
────────────────┼────────────────────┼──────────────────────
  重要でない    │  ♦ diamond（黄）  │  ♣ club（青）
                │  任せる＆自動化    │  未来創造20%タイム
                │  Delegate          │  Create Future
────────────────┴────────────────────┴──────────────────────

＋2つの特殊カテゴリ：
  🃏 joker        → 分類待ち/特殊タスク
  ❓ unclassified → カレンダーから取得したばかり

【フロー】
カレンダーから取得 → 「未分類」としてジョーカーゾーンに表示
                     → ボタンクリックで象限に分類
                     → tasks テーブルに保存（suit カラム設定）
```

**重要ポイント**:
- カレンダーの予定 ≠ FDC のタスク
- 「緊急度×重要度」で分類するのが FDC の核心機能
- 分類することで時間の使い方が変わる

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| Google Calendar API | Googleカレンダーのイベントを取得するAPI |
| カレンダーID | 各カレンダーの識別子。メインは「primary」 |
| タイムゾーン | 時刻の基準地域。日本は「Asia/Tokyo」 |
| RFC3339 | 日時フォーマット「2025-12-08T10:00:00+09:00」 |
| アイゼンハワーマトリクス | 緊急度×重要度で4象限に分類するフレームワーク |
| Suit（4象限） | spade, heart, diamond, club |
| EventCategory | 4象限 + joker + unclassified の6種類 |

---

## 前提条件

- [ ] Phase 12 完了（Calendar/Tasks スコープ追加済み）
- [ ] Google認証でカレンダー権限が取得できている
- [ ] 開発サーバーが起動している

---

## Step 1: 型定義の拡張

### 1.1 Google Calendar 型定義（アイゼンハワーマトリクス対応）

**ファイル:** `lib/types/google-calendar.ts`

```typescript
/**
 * lib/types/google-calendar.ts
 *
 * Google Calendar API の型定義 + アイゼンハワーマトリクス
 */

// カレンダー一覧の各カレンダー
export interface GoogleCalendar {
  id: string;
  summary: string;  // カレンダー名
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
}

// カレンダー一覧レスポンス
export interface GoogleCalendarListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  items: GoogleCalendar[];
}

// イベントの日時
export interface GoogleEventDateTime {
  dateTime?: string;  // RFC3339 形式（時刻指定のイベント）
  date?: string;      // YYYY-MM-DD 形式（終日イベント）
  timeZone?: string;
}

// カレンダーイベント
export interface GoogleEvent {
  id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
  summary?: string;  // イベント名
  description?: string;
  location?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  recurringEventId?: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
}

// イベント一覧レスポンス
export interface GoogleEventsResponse {
  kind: string;
  etag: string;
  summary: string;
  timeZone: string;
  nextPageToken?: string;
  items: GoogleEvent[];
}

// =============================================
// アイゼンハワーマトリクス（4象限 + 2特殊）
// =============================================

// 4象限のスート
export type EventSuit = 'spade' | 'heart' | 'diamond' | 'club';

// 全カテゴリ（4象限 + joker + unclassified）
export type EventCategory = EventSuit | 'joker' | 'unclassified';

// FDC 用に拡張したイベント
export interface FDCEvent extends GoogleEvent {
  category: EventCategory;
  taskId?: string;  // タスク化された場合のID
  isAllDay: boolean;
  startTime: Date;
  endTime: Date;
}

// カテゴリの表示情報
export const EVENT_CATEGORY_INFO: Record<EventCategory, {
  label: string;
  symbol: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  spade: {
    label: 'すぐやる',
    symbol: '♠',
    color: '#1a1a1a',
    bgColor: '#f0f0f0',
    description: '緊急かつ重要 - Do Now',
  },
  heart: {
    label: '予定に入れ実行',
    symbol: '♥',
    color: '#dc2626',
    bgColor: '#fef2f2',
    description: '重要だが緊急でない - Schedule',
  },
  diamond: {
    label: '任せる',
    symbol: '♦',
    color: '#ca8a04',
    bgColor: '#fefce8',
    description: '緊急だが重要でない - Delegate',
  },
  club: {
    label: '未来創造',
    symbol: '♣',
    color: '#2563eb',
    bgColor: '#eff6ff',
    description: '緊急でも重要でもない - Create Future',
  },
  joker: {
    label: '特殊',
    symbol: '🃏',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    description: '分類待ち/特殊タスク',
  },
  unclassified: {
    label: '未分類',
    symbol: '❓',
    color: '#6b7280',
    bgColor: '#f9fafb',
    description: 'カレンダーから取得したばかり',
  },
};
```

### 確認ポイント

- [ ] `lib/types/google-calendar.ts` が作成された
- [ ] EventCategory 型に6種類のカテゴリが定義されている
- [ ] EVENT_CATEGORY_INFO に各カテゴリの表示情報がある

---

## Step 2: Google Calendar サーバーユーティリティ

### 2.1 Calendar API クライアント

**ファイル:** `lib/server/google-calendar.ts`

```typescript
/**
 * lib/server/google-calendar.ts
 *
 * Google Calendar API サーバーサイドユーティリティ
 */

import { getValidGoogleToken } from './google-auth';
import type {
  GoogleCalendar,
  GoogleCalendarListResponse,
  GoogleEvent,
  GoogleEventsResponse,
  FDCEvent,
} from '@/lib/types/google-calendar';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * カレンダー一覧を取得
 */
export async function getCalendarList(userId: string): Promise<GoogleCalendar[]> {
  const accessToken = await getValidGoogleToken(userId);
  if (!accessToken) {
    throw new Error('No valid access token');
  }

  const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
 * 指定カレンダーのイベントを取得
 */
export async function getCalendarEvents(
  userId: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50
): Promise<GoogleEvent[]> {
  const accessToken = await getValidGoogleToken(userId);
  if (!accessToken) {
    throw new Error('No valid access token');
  }

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: maxResults.toString(),
    timeZone: 'Asia/Tokyo',
  });

  if (timeMin) params.set('timeMin', timeMin);
  if (timeMax) params.set('timeMax', timeMax);

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Calendar events fetch error:', error);
    throw new Error(`Failed to fetch calendar events: ${response.status}`);
  }

  const data: GoogleEventsResponse = await response.json();
  return data.items || [];
}

/**
 * 今日のイベントを取得
 */
export async function getTodayEvents(userId: string, calendarId: string = 'primary'): Promise<GoogleEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return getCalendarEvents(
    userId,
    calendarId,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );
}

/**
 * 今週のイベントを取得
 */
export async function getWeekEvents(userId: string, calendarId: string = 'primary'): Promise<GoogleEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(startOfDay);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return getCalendarEvents(
    userId,
    calendarId,
    startOfDay.toISOString(),
    endOfWeek.toISOString(),
    100
  );
}

/**
 * GoogleEvent を FDCEvent に変換
 */
export function convertToFDCEvent(event: GoogleEvent): FDCEvent {
  const isAllDay = !event.start.dateTime;

  let startTime: Date;
  let endTime: Date;

  if (isAllDay) {
    // 終日イベント
    startTime = new Date(event.start.date + 'T00:00:00');
    endTime = new Date(event.end.date + 'T00:00:00');
  } else {
    // 時刻指定イベント
    startTime = new Date(event.start.dateTime!);
    endTime = new Date(event.end.dateTime!);
  }

  return {
    ...event,
    category: 'unclassified',  // デフォルトは未分類
    isAllDay,
    startTime,
    endTime,
  };
}

/**
 * イベント一覧を FDCEvent に変換
 */
export function convertEventsToFDC(events: GoogleEvent[]): FDCEvent[] {
  return events
    .filter(event => event.status !== 'cancelled')
    .map(convertToFDCEvent)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
```

### 確認ポイント

- [ ] `lib/server/google-calendar.ts` が作成された
- [ ] `getCalendarList`, `getCalendarEvents`, `getTodayEvents`, `getWeekEvents` がある
- [ ] `convertToFDCEvent` で未分類カテゴリが設定される

---

## Step 3: API Routes 作成

### 3.1 カレンダー一覧 API

**ファイル:** `app/api/google/calendars/route.ts`

```typescript
/**
 * app/api/google/calendars/route.ts
 *
 * GET /api/google/calendars - カレンダー一覧取得
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCalendarList } from '@/lib/server/google-calendar';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const calendars = await getCalendarList(user.id);

    return NextResponse.json(calendars);
  } catch (error) {
    console.error('Calendars API error:', error);

    if (error instanceof Error && error.message === 'No valid access token') {
      return NextResponse.json(
        { error: 'Google Calendar not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}
```

### 3.2 イベント一覧 API（FDCEvent対応）

**ファイル:** `app/api/google/calendars/events/route.ts`

```typescript
/**
 * app/api/google/calendars/events/route.ts
 *
 * GET /api/google/calendars/events - イベント一覧取得（FDCEvent形式）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCalendarEvents,
  getTodayEvents,
  getWeekEvents,
  convertEventsToFDC,
} from '@/lib/server/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const calendarId = searchParams.get('calendarId') || 'primary';
    const range = searchParams.get('range') || 'today';  // today, week, custom
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');

    let events;

    switch (range) {
      case 'today':
        events = await getTodayEvents(user.id, calendarId);
        break;
      case 'week':
        events = await getWeekEvents(user.id, calendarId);
        break;
      case 'custom':
        if (!timeMin || !timeMax) {
          return NextResponse.json(
            { error: 'timeMin and timeMax are required for custom range' },
            { status: 400 }
          );
        }
        events = await getCalendarEvents(user.id, calendarId, timeMin, timeMax);
        break;
      default:
        events = await getTodayEvents(user.id, calendarId);
    }

    // FDCEvent に変換して返す（未分類カテゴリ付き）
    const fdcEvents = convertEventsToFDC(events);

    return NextResponse.json(fdcEvents);
  } catch (error) {
    console.error('Calendar events API error:', error);

    if (error instanceof Error && error.message === 'No valid access token') {
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

### 確認ポイント

- [ ] `app/api/google/calendars/route.ts` が作成された
- [ ] `app/api/google/calendars/events/route.ts` が作成された
- [ ] range パラメータで today/week/custom が選択できる
- [ ] FDCEvent 形式（category: 'unclassified'）で返される

---

## Step 4: React Hooks 作成

### 4.1 カレンダーイベント Hook（分類機能付き）

**ファイル:** `lib/hooks/useCalendarEvents.ts`

```typescript
'use client';

/**
 * lib/hooks/useCalendarEvents.ts
 *
 * カレンダーイベント取得 Hook（分類機能付き）
 */

import { useState, useEffect, useCallback } from 'react';
import type { FDCEvent, EventCategory } from '@/lib/types/google-calendar';

interface UseCalendarEventsOptions {
  calendarId?: string;
  range?: 'today' | 'week' | 'custom';
  timeMin?: string;
  timeMax?: string;
  autoFetch?: boolean;
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const {
    calendarId = 'primary',
    range = 'today',
    timeMin,
    timeMax,
    autoFetch = true,
  } = options;

  const [events, setEvents] = useState<FDCEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        calendarId,
        range,
      });

      if (range === 'custom' && timeMin && timeMax) {
        params.set('timeMin', timeMin);
        params.set('timeMax', timeMax);
      }

      const response = await fetch(`/api/google/calendars/events?${params}`, {
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
      // startTime/endTime を Date オブジェクトに変換
      const eventsWithDates = data.map((event: FDCEvent) => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
      }));
      setEvents(eventsWithDates);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [calendarId, range, timeMin, timeMax]);

  useEffect(() => {
    if (autoFetch) {
      fetchEvents();
    }
  }, [fetchEvents, autoFetch]);

  // カテゴリでフィルタリング
  const getEventsByCategory = useCallback((category: EventCategory) => {
    return events.filter(event => event.category === category);
  }, [events]);

  // 未分類イベントを取得
  const unclassifiedEvents = events.filter(event => event.category === 'unclassified');

  // イベントのカテゴリを更新（ローカルステート）
  const updateEventCategory = useCallback((eventId: string, category: EventCategory) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId ? { ...event, category } : event
      )
    );
  }, []);

  return {
    events,
    unclassifiedEvents,
    isLoading,
    error,
    isConnected,
    refetch: fetchEvents,
    getEventsByCategory,
    updateEventCategory,
  };
}
```

### 4.2 カレンダー一覧 Hook

**ファイル:** `lib/hooks/useCalendars.ts`

```typescript
'use client';

/**
 * lib/hooks/useCalendars.ts
 *
 * カレンダー一覧取得 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { GoogleCalendar } from '@/lib/types/google-calendar';

export function useCalendars() {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const fetchCalendars = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/calendars', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          setCalendars([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch calendars');
      }

      const data = await response.json();
      setCalendars(data);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  // プライマリカレンダーを取得
  const primaryCalendar = calendars.find(cal => cal.primary);

  return {
    calendars,
    primaryCalendar,
    isLoading,
    error,
    isConnected,
    refetch: fetchCalendars,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useCalendarEvents.ts` が作成された
- [ ] `lib/hooks/useCalendars.ts` が作成された
- [ ] `unclassifiedEvents` で未分類イベントが取得できる
- [ ] `updateEventCategory` でカテゴリ更新ができる

---

## Step 5: UI コンポーネント作成

### 5.1 今日の予定コンポーネント

**ファイル:** `components/calendar/TodaySchedule.tsx`

```typescript
'use client';

/**
 * components/calendar/TodaySchedule.tsx
 *
 * 今日の予定表示コンポーネント
 */

import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';
import { useCalendarEvents } from '@/lib/hooks/useCalendarEvents';
import type { FDCEvent } from '@/lib/types/google-calendar';

function formatEventTime(event: FDCEvent): string {
  if (event.isAllDay) {
    return '終日';
  }

  const start = event.startTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const end = event.endTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${start} - ${end}`;
}

function isEventNow(event: FDCEvent): boolean {
  if (event.isAllDay) return false;

  const now = Date.now();
  return now >= event.startTime.getTime() && now <= event.endTime.getTime();
}

export function TodaySchedule() {
  const { events, isLoading, error, isConnected } = useCalendarEvents({
    range: 'today',
  });

  const cardStyle: React.CSSProperties = {
    background: 'var(--glass)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '20px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };

  const titleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-dark)',
  };

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <Calendar size={20} color="var(--primary)" />
            <span>今日の予定</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <Calendar size={20} color="var(--primary)" />
            <span>今日の予定</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <Calendar size={40} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <p style={{ fontSize: '14px' }}>Google カレンダーが連携されていません</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>再ログインして連携を許可してください</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <Calendar size={20} color="var(--primary)" />
            <span>今日の予定</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--error)' }}>
          <p style={{ fontSize: '14px' }}>読み込みエラー</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <Calendar size={20} color="var(--primary)" />
          <span>今日の予定</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {events.length} 件
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <Calendar size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
          <p style={{ fontSize: '14px' }}>今日の予定はありません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map(event => {
            const isNow = isEventNow(event);
            return (
              <div
                key={event.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: isNow ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  background: isNow ? 'var(--primary-alpha-05)' : 'var(--bg-gray)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isNow && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'var(--primary)',
                          borderRadius: '50%',
                        }} />
                      )}
                      <h4 style={{
                        fontWeight: 500,
                        color: 'var(--text-dark)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        margin: 0,
                      }}>
                        {event.summary || '(タイトルなし)'}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {formatEventTime(event)}
                      </span>
                      {event.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      style={{
                        padding: '4px',
                        color: 'var(--text-muted)',
                        borderRadius: '4px',
                      }}
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

### 5.2 未分類イベント一覧コンポーネント

**ファイル:** `components/calendar/UnclassifiedEvents.tsx`

```typescript
'use client';

/**
 * components/calendar/UnclassifiedEvents.tsx
 *
 * 未分類イベント一覧（タスク化待ち）
 */

import { HelpCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useCalendarEvents } from '@/lib/hooks/useCalendarEvents';
import { EVENT_CATEGORY_INFO, type EventCategory, type FDCEvent } from '@/lib/types/google-calendar';

interface UnclassifiedEventsProps {
  onCategorize?: (event: FDCEvent, category: EventCategory) => void;
}

function formatEventTime(event: FDCEvent): string {
  if (event.isAllDay) {
    return '終日';
  }
  return event.startTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventDate(event: FDCEvent): string {
  const today = new Date();
  const eventDate = event.startTime;

  if (
    today.getFullYear() === eventDate.getFullYear() &&
    today.getMonth() === eventDate.getMonth() &&
    today.getDate() === eventDate.getDate()
  ) {
    return '今日';
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (
    tomorrow.getFullYear() === eventDate.getFullYear() &&
    tomorrow.getMonth() === eventDate.getMonth() &&
    tomorrow.getDate() === eventDate.getDate()
  ) {
    return '明日';
  }

  return eventDate.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
}

export function UnclassifiedEvents({ onCategorize }: UnclassifiedEventsProps) {
  const { unclassifiedEvents, isLoading, error, isConnected, updateEventCategory } = useCalendarEvents({
    range: 'week',
  });

  const handleCategorize = (event: FDCEvent, category: EventCategory) => {
    updateEventCategory(event.id, category);
    onCategorize?.(event, category);
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--glass)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '20px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };

  const titleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-dark)',
  };

  // 4象限のカテゴリボタン
  const categoryButtons: EventCategory[] = ['spade', 'heart', 'diamond', 'club'];

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <HelpCircle size={20} color="var(--text-muted)" />
            <span>未分類イベント</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (!isConnected || error) {
    return null;  // カレンダー未連携時は非表示
  }

  if (unclassifiedEvents.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <HelpCircle size={20} color="var(--text-muted)" />
            <span>未分類イベント</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <HelpCircle size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
          <p style={{ fontSize: '14px' }}>すべて分類済みです</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <HelpCircle size={20} color="var(--text-muted)" />
          <span>未分類イベント</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {unclassifiedEvents.length} 件
        </span>
      </div>

      <p style={{
        fontSize: '12px',
        color: 'var(--text-muted)',
        marginBottom: '16px',
        padding: '8px 12px',
        background: 'var(--bg-gray)',
        borderRadius: '6px',
      }}>
        カレンダーの予定を4象限に分類してタスク化しましょう
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {unclassifiedEvents.map(event => (
          <div
            key={event.id}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-gray)',
            }}
          >
            {/* イベント情報 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Calendar size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatEventDate(event)}
                </span>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatEventTime(event)}
                </span>
              </div>
              <h4 style={{
                fontWeight: 500,
                color: 'var(--text-dark)',
                fontSize: '14px',
                margin: 0,
              }}>
                {event.summary || '(タイトルなし)'}
              </h4>
            </div>

            {/* 分類ボタン */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {categoryButtons.map(category => {
                const info = EVENT_CATEGORY_INFO[category];
                return (
                  <button
                    key={category}
                    onClick={() => handleCategorize(event, category)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: info.bgColor,
                      color: info.color,
                      transition: 'all 0.2s',
                    }}
                  >
                    {info.symbol}
                    <ArrowRight size={12} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/calendar/TodaySchedule.tsx` が作成された
- [ ] `components/calendar/UnclassifiedEvents.tsx` が作成された
- [ ] 4象限への分類ボタン（♠♥♦♣）が表示される

---

## Step 6: ダッシュボードに組み込み

### 6.1 ダッシュボードページ更新

**ファイル:** `app/(app)/dashboard/page.tsx`

```typescript
'use client';

/**
 * app/(app)/dashboard/page.tsx
 *
 * ダッシュボードページ
 */

import { LayoutDashboard } from 'lucide-react';
import { TodaySchedule } from '@/components/calendar/TodaySchedule';
import { UnclassifiedEvents } from '@/components/calendar/UnclassifiedEvents';
import { GoogleTasksWidget } from '@/components/dashboard/GoogleTasksWidget';

export default function DashboardPage() {
  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <LayoutDashboard size={28} color="var(--primary)" />
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
          border: 'none',
          padding: 0,
        }}>
          ダッシュボード
        </h2>
      </div>

      {/* カレンダー・タスク ウィジェット */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        <TodaySchedule />
        <GoogleTasksWidget />
      </div>

      {/* 未分類イベント */}
      <div style={{ marginBottom: '24px' }}>
        <UnclassifiedEvents />
      </div>

      {/* クイックリンク */}
      <div className="card">
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-dark)',
          marginBottom: '16px',
        }}>
          クイックアクセス
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          <a href="/tasks" className="btn btn-secondary" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px', padding: '16px', textDecoration: 'none',
          }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>タスク</span>
          </a>
          <a href="/leads" className="btn btn-secondary" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px', padding: '16px', textDecoration: 'none',
          }}>
            <span style={{ fontSize: '24px' }}>👥</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>リード</span>
          </a>
          <a href="/clients" className="btn btn-secondary" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px', padding: '16px', textDecoration: 'none',
          }}>
            <span style={{ fontSize: '24px' }}>🏢</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>クライアント</span>
          </a>
          <a href="/action-maps" className="btn btn-secondary" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px', padding: '16px', textDecoration: 'none',
          }}>
            <span style={{ fontSize: '24px' }}>🗺️</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Action Map</span>
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] ダッシュボードに `TodaySchedule` が表示される
- [ ] ダッシュボードに `UnclassifiedEvents` が表示される
- [ ] 未分類イベントの分類ボタンが動作する

---

## Step 7: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックがエラーなく完了
- [ ] ビルドがエラーなく完了

---

## Step 8: 動作確認

### 8.1 開発サーバー起動

```bash
npm run dev
```

### 8.2 確認項目

1. http://localhost:3000/dashboard にアクセス
2. Google ログイン（再ログインが必要な場合あり）
3. 以下を確認:
   - [ ] 「今日の予定」に Google カレンダーの予定が表示される
   - [ ] 「未分類イベント」に今週の予定が表示される
   - [ ] 分類ボタン（♠♥♦♣）をクリックするとカテゴリが変わる
   - [ ] 現在進行中のイベントがハイライトされる

---

## Step 9: Git プッシュ

```bash
git add -A
git commit -m "Phase 13: Google Calendar API 連携 + 未分類イベント管理

- lib/types/google-calendar.ts: カレンダー型定義 + アイゼンハワーマトリクス（6カテゴリ）
- lib/server/google-calendar.ts: Calendar API クライアント + FDCEvent変換
- lib/hooks/useCalendarEvents.ts: イベント取得 Hook（分類機能付き）
- lib/hooks/useCalendars.ts: カレンダー一覧 Hook
- app/api/google/calendars: カレンダー API Routes
- components/calendar/TodaySchedule.tsx: 今日の予定
- components/calendar/UnclassifiedEvents.tsx: 未分類イベント + 4象限分類機能
- dashboard: カレンダーウィジェット統合

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### 型定義
- [ ] `lib/types/google-calendar.ts` 作成
- [ ] EventCategory 型（6種類: spade, heart, diamond, club, joker, unclassified）
- [ ] EVENT_CATEGORY_INFO（各カテゴリの表示情報）
- [ ] FDCEvent インターフェース

### サーバーサイド
- [ ] `lib/server/google-calendar.ts` 作成
- [ ] getCalendarList 関数
- [ ] getCalendarEvents 関数
- [ ] getTodayEvents / getWeekEvents 関数
- [ ] convertToFDCEvent / convertEventsToFDC 関数

### API Routes
- [ ] `app/api/google/calendars/route.ts` 作成
- [ ] `app/api/google/calendars/events/route.ts` 作成

### React Hooks
- [ ] `lib/hooks/useCalendarEvents.ts` 作成
- [ ] `lib/hooks/useCalendars.ts` 作成
- [ ] unclassifiedEvents 取得機能
- [ ] updateEventCategory 機能

### UI コンポーネント
- [ ] `components/calendar/TodaySchedule.tsx` 作成
- [ ] `components/calendar/UnclassifiedEvents.tsx` 作成
- [ ] 4象限分類ボタン実装（♠♥♦♣）

### 統合
- [ ] ダッシュボードに組み込み
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] 動作確認完了
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 14 以降）

1. **タスク化機能の実装**
   - 分類したイベントを tasks テーブルに保存
   - suit カラムにカテゴリを設定
   - google_event_id でリンク

2. **4象限マトリクスビュー**
   - Kanban 風の4象限表示
   - ドラッグ&ドロップで分類変更

3. **双方向同期**
   - FDC タスク → Google Tasks
   - 完了状態の同期
