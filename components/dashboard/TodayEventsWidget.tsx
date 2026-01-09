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
