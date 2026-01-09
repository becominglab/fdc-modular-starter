'use client';

/**
 * components/calendar/UnclassifiedEvents.tsx
 *
 * 未分類イベント一覧（タスク化待ち）
 */

import { useState } from 'react';
import { HelpCircle, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useGoogleCalendar } from '@/lib/hooks/useGoogleCalendar';
import { EVENT_CATEGORY_INFO, type EventCategory, type EventSuit, type FDCEvent } from '@/lib/types/google-calendar';

interface UnclassifiedEventsProps {
  onCategorize?: (event: FDCEvent, category: EventCategory) => void;
  onTaskCreated?: (taskId: string) => void;
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

export function UnclassifiedEvents({ onCategorize, onTaskCreated }: UnclassifiedEventsProps) {
  const { unclassifiedEvents, isLoading, error, isConnected, updateEventCategory } = useGoogleCalendar({
    range: 'week',
  });
  const [processingEventId, setProcessingEventId] = useState<string | null>(null);

  const handleCategorize = async (event: FDCEvent, category: EventCategory) => {
    // joker と unclassified はタスク化しない
    if (category === 'joker' || category === 'unclassified') {
      updateEventCategory(event.id, category);
      onCategorize?.(event, category);
      return;
    }

    setProcessingEventId(event.id);

    try {
      // API でタスク作成
      const response = await fetch('/api/tasks/from-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId: event.id,
          eventSummary: event.summary || '(タイトルなし)',
          eventDescription: event.description,
          eventStart: event.start.dateTime || event.start.date,
          suit: category as EventSuit,
        }),
      });

      if (response.ok) {
        const task = await response.json();
        // 成功したらローカルステートも更新
        updateEventCategory(event.id, category);
        onCategorize?.(event, category);
        onTaskCreated?.(task.id);
      } else {
        const data = await response.json();
        if (data.error === 'Task already exists for this event') {
          // 既にタスク化済み - それでもUIは更新
          updateEventCategory(event.id, category);
          onCategorize?.(event, category);
        } else {
          console.error('Failed to create task:', data.error);
        }
      }
    } catch (err) {
      console.error('Create task error:', err);
    } finally {
      setProcessingEventId(null);
    }
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
              {processingEventId === event.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  タスク作成中...
                </div>
              ) : (
                categoryButtons.map(category => {
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
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
