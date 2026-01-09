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
                          animation: 'pulse 2s infinite',
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
                        transition: 'all 0.2s',
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
