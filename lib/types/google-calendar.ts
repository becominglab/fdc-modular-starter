/**
 * lib/types/google-calendar.ts
 *
 * Google Calendar API の型定義 + アイゼンハワーマトリクス
 */

// 既存の型を再エクスポート
export type {
  GoogleCalendar,
  GoogleCalendarEvent,
  GoogleCalendarListResponse,
  GoogleCalendarEventsResponse,
} from './google-api';

// =============================================
// アイゼンハワーマトリクス（4象限 + 2特殊）
// =============================================

// 4象限のスート
export type EventSuit = 'spade' | 'heart' | 'diamond' | 'club';

// 全カテゴリ（4象限 + joker + unclassified）
export type EventCategory = EventSuit | 'joker' | 'unclassified';

// FDC 用に拡張したイベント
export interface FDCEvent {
  id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
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
  // FDC 拡張フィールド
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
