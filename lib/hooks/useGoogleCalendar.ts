'use client';

/**
 * lib/hooks/useGoogleCalendar.ts
 *
 * カレンダーイベント取得 Hook（FDCEvent対応 + 分類機能）
 */

import { useState, useEffect, useCallback } from 'react';
import type { FDCEvent, EventCategory } from '@/lib/types/google-calendar';

type Range = 'today' | 'week' | 'custom';

interface UseGoogleCalendarOptions {
  range?: Range;
  timeMin?: string;
  timeMax?: string;
  autoFetch?: boolean;
}

export function useGoogleCalendar(options: UseGoogleCalendarOptions = {}) {
  const { range = 'today', timeMin, timeMax, autoFetch = true } = options;

  const [events, setEvents] = useState<FDCEvent[]>([]);
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
  }, [range, timeMin, timeMax]);

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
