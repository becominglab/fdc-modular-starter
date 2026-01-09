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
