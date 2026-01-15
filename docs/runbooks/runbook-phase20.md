# Phase 20: 通知システム（In-App Notifications）

## 概要
ユーザーへのリアルタイム通知機能を実装し、重要なイベント（招待、タスク期限、メンション等）を知らせる。

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| In-App Notification | アプリ内で表示される通知 |
| 未読/既読管理 | 通知の状態管理 |
| リアルタイム更新 | Supabase Realtimeによる即時反映 |
| 通知バッジ | 未読数の表示 |

## 前提条件
- [ ] Phase 19 完了（Super Admin機能が動作）
- [ ] Supabase プロジェクトにアクセス可能

---

## Step 1: Supabase テーブル作成

Supabase ダッシュボード > SQL Editor で実行:

```sql
-- notifications テーブル作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invitation', 'task_due', 'task_assigned', 'mention', 'system', 'info')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 自分の通知のみ読み取り可能
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 自分の通知のみ更新可能（既読にする等）
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 自分の通知のみ削除可能
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- システムが通知を作成可能（service_role経由）
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Realtime有効化
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**確認ポイント:**
- [ ] notifications テーブルが作成された
- [ ] RLS ポリシーが設定された
- [ ] Realtime が有効化された

---

## Step 2: 型定義作成

### ファイル: `lib/types/notification.ts`

```typescript
/**
 * lib/types/notification.ts
 *
 * 通知関連の型定義
 */

export type NotificationType =
  | 'invitation'    // ワークスペース招待
  | 'task_due'      // タスク期限
  | 'task_assigned' // タスク割り当て
  | 'mention'       // メンション
  | 'system'        // システム通知
  | 'info';         // お知らせ

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}
```

**確認ポイント:**
- [ ] lib/types/notification.ts が作成された

---

## Step 3: 通知API作成

### 3.1 通知一覧取得: `app/api/notifications/route.ts`

```typescript
/**
 * app/api/notifications/route.ts
 *
 * GET /api/notifications - 通知一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // 未読数を取得
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 通知既読: `app/api/notifications/[notificationId]/read/route.ts`

```typescript
/**
 * app/api/notifications/[notificationId]/read/route.ts
 *
 * PATCH /api/notifications/:id/read - 通知を既読にする
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ notificationId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { notificationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 全件既読: `app/api/notifications/read-all/route.ts`

```typescript
/**
 * app/api/notifications/read-all/route.ts
 *
 * PATCH /api/notifications/read-all - 全通知を既読にする
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications read-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**確認ポイント:**
- [ ] app/api/notifications/route.ts が作成された
- [ ] app/api/notifications/[notificationId]/read/route.ts が作成された
- [ ] app/api/notifications/read-all/route.ts が作成された

---

## Step 4: 通知フック作成

### ファイル: `lib/hooks/useNotifications.ts`

```typescript
/**
 * lib/hooks/useNotifications.ts
 *
 * 通知管理フック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types/notification';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as Notification['type'],
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: row.is_read,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications.map(mapNotification));
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  // 初回取得
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime購読
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = mapNotification(payload.new as NotificationRow);
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
```

**確認ポイント:**
- [ ] lib/hooks/useNotifications.ts が作成された

---

## Step 5: 通知UIコンポーネント作成

### 5.1 通知ベル: `components/notifications/NotificationBell.tsx`

```typescript
/**
 * components/notifications/NotificationBell.tsx
 *
 * ヘッダー用通知ベルアイコン
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NotificationList } from './NotificationList';

export function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <NotificationList
            notifications={notifications}
            loading={loading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
```

### 5.2 通知リスト: `components/notifications/NotificationList.tsx`

```typescript
/**
 * components/notifications/NotificationList.tsx
 *
 * 通知一覧コンポーネント
 */

'use client';

import { Bell, Mail, CheckSquare, Users, Info, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/types/notification';

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  invitation: Mail,
  task_due: AlertCircle,
  task_assigned: CheckSquare,
  mention: Users,
  system: Bell,
  info: Info,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  invitation: 'text-blue-600 bg-blue-50',
  task_due: 'text-red-600 bg-red-50',
  task_assigned: 'text-green-600 bg-green-50',
  mention: 'text-purple-600 bg-purple-50',
  system: 'text-gray-600 bg-gray-50',
  info: 'text-amber-600 bg-amber-50',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return date.toLocaleDateString('ja-JP');
}

export function NotificationList({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationListProps) {
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
      onClose();
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-gray-900">通知</h3>
        {unreadNotifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            すべて既読にする
          </button>
        )}
      </div>

      {/* 通知リスト */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p>通知はありません</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => {
            const Icon = TYPE_ICONS[notification.type] || Bell;
            const colorClass = TYPE_COLORS[notification.type] || 'text-gray-600 bg-gray-50';

            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* フッター */}
      {notifications.length > 10 && (
        <div className="p-2 border-t">
          <a
            href="/notifications"
            className="block text-center text-sm text-blue-600 hover:text-blue-800"
          >
            すべての通知を見る
          </a>
        </div>
      )}
    </div>
  );
}
```

### 5.3 インデックス: `components/notifications/index.ts`

```typescript
export { NotificationBell } from './NotificationBell';
export { NotificationList } from './NotificationList';
```

**確認ポイント:**
- [ ] components/notifications/NotificationBell.tsx が作成された
- [ ] components/notifications/NotificationList.tsx が作成された
- [ ] components/notifications/index.ts が作成された

---

## Step 6: ヘッダーに通知ベル追加

### ファイル: `app/(app)/layout.tsx` または `components/Header.tsx`

ヘッダーコンポーネントに NotificationBell を追加:

```typescript
import { NotificationBell } from '@/components/notifications';

// ヘッダー内のユーザーメニュー付近に追加
<div className="flex items-center gap-2">
  <NotificationBell />
  {/* 既存のユーザーメニュー */}
</div>
```

**確認ポイント:**
- [ ] ヘッダーに通知ベルが表示される

---

## Step 7: 通知ユーティリティ作成

### ファイル: `lib/utils/notification.ts`

```typescript
/**
 * lib/utils/notification.ts
 *
 * 通知作成ユーティリティ（サーバーサイド）
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { NotificationCreateInput } from '@/lib/types/notification';

export async function createNotification(input: NotificationCreateInput) {
  const serviceClient = createServiceClient();

  const { error } = await serviceClient.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message || null,
    link: input.link || null,
    metadata: input.metadata || {},
  });

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

// 招待通知を作成
export async function notifyInvitation(userId: string, workspaceName: string, inviterName: string) {
  await createNotification({
    userId,
    type: 'invitation',
    title: `${workspaceName}への招待`,
    message: `${inviterName}さんから招待されました`,
    link: '/invite/accept',
  });
}

// タスク期限通知を作成
export async function notifyTaskDue(userId: string, taskTitle: string, taskId: string) {
  await createNotification({
    userId,
    type: 'task_due',
    title: 'タスクの期限が近づいています',
    message: taskTitle,
    link: `/tasks?id=${taskId}`,
  });
}
```

**確認ポイント:**
- [ ] lib/utils/notification.ts が作成された

---

## Step 8: 型生成 & ビルド確認

```bash
# Supabase 型生成
npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts

# TypeScript 型チェック
npm run type-check

# ビルド
npm run build
```

**確認ポイント:**
- [ ] 型チェックが通る
- [ ] ビルドが成功する

---

## Step 9: 動作確認

1. `/dashboard` または任意のページでヘッダーに通知ベルが表示される
2. 通知ベルをクリックするとドロップダウンが開く
3. 通知をクリックすると既読になる
4. 「すべて既読にする」が機能する

### テスト用通知の作成（SQL）

```sql
-- テスト通知を作成
INSERT INTO notifications (user_id, type, title, message, link)
SELECT
  id,
  'info',
  'ようこそ！',
  '通知システムが有効になりました',
  '/dashboard'
FROM profiles
WHERE email = 'your-email@example.com';
```

**確認ポイント:**
- [ ] 通知ベルが表示される
- [ ] 未読バッジが表示される
- [ ] 通知リストが表示される
- [ ] 既読処理が機能する
- [ ] Realtime で新規通知が反映される

---

## 完了チェックリスト

- [ ] **Step 1**: Supabase テーブル作成完了
  - [ ] notifications テーブル
  - [ ] RLS ポリシー設定
  - [ ] Realtime 有効化

- [ ] **Step 2**: 型定義作成完了
  - [ ] lib/types/notification.ts

- [ ] **Step 3**: API 作成完了
  - [ ] GET /api/notifications
  - [ ] PATCH /api/notifications/:id/read
  - [ ] PATCH /api/notifications/read-all

- [ ] **Step 4**: フック作成完了
  - [ ] useNotifications

- [ ] **Step 5**: UIコンポーネント作成完了
  - [ ] NotificationBell
  - [ ] NotificationList

- [ ] **Step 6**: ヘッダー更新完了

- [ ] **Step 7**: ユーティリティ作成完了

- [ ] **Step 8**: ビルド確認完了

- [ ] **Step 9**: 動作確認完了

---

## 注意事項

1. **Realtime**: Supabase RealtimeはWebSocket接続を使用するため、接続数に注意
2. **通知の削除**: 古い通知は定期的に削除する仕組みを検討（別Phase）
3. **プッシュ通知**: Web Push通知は別Phaseで実装予定
4. **メール通知**: 重要な通知はメールでも送信（別Phase）
