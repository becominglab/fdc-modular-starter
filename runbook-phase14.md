# Phase 14: イベント→タスク変換 + 4象限マトリクスビュー

## 目標

カレンダーイベントをFDCタスクに変換し、アイゼンハワーマトリクス（4象限）で管理：
- 未分類イベントを4象限に分類してタスク化
- タスクに `suit` カラムを追加（spade/heart/diamond/club）
- 4象限マトリクスビューでタスクを表示
- ドラッグ&ドロップで象限間移動

---

## アイゼンハワーマトリクス復習

```
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

【フロー】
1. カレンダーから取得 → 未分類イベントとして表示
2. 4象限ボタンで分類 → tasks テーブルに保存
3. マトリクスビューで管理 → ドラッグで象限移動
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| suit カラム | タスクの4象限分類（spade/heart/diamond/club） |
| google_event_id | Google Calendar イベントとの紐付け |
| マトリクスビュー | 4象限を一覧表示するKanban風UI |
| ドラッグ&ドロップ | タスクを象限間で移動する操作 |

---

## 前提条件

- [ ] Phase 13 完了（Google Calendar API 連携）
- [ ] 未分類イベントの表示ができている
- [ ] 開発サーバーが起動している

---

## Step 1: データベーススキーマ更新

### 1.1 マイグレーション作成

**ファイル:** `supabase/migrations/20260109_phase14_task_suit.sql`

```sql
-- Phase 14: タスクに suit（4象限）と google_event_id を追加

-- suit カラム追加（4象限分類）
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS suit TEXT CHECK (suit IN ('spade', 'heart', 'diamond', 'club'));

-- Google Calendar イベントID（紐付け用）
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tasks_suit ON tasks(suit);
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON tasks(google_event_id);

-- コメント
COMMENT ON COLUMN tasks.suit IS '4象限分類: spade(緊急重要), heart(重要), diamond(緊急), club(未来創造)';
COMMENT ON COLUMN tasks.google_event_id IS 'Google Calendar イベントID（紐付け用）';
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 1.3 型定義の再生成

```bash
supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > lib/types/database.types.ts
```

### 確認ポイント

- [ ] マイグレーションが成功した
- [ ] tasks テーブルに suit カラムが追加された
- [ ] tasks テーブルに google_event_id カラムが追加された

---

## Step 2: 型定義の更新

### 2.1 Task 型に suit を追加

**ファイル:** `lib/types/task.ts`

```typescript
/**
 * lib/types/task.ts
 *
 * タスク関連の型定義
 */

import type { EventSuit } from './google-calendar';

// タスクのステータス
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// タスクの優先度
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// タスク
export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  completed_at?: string | null;
  assignee_id?: string | null;
  // Phase 14: 4象限分類
  suit?: EventSuit | null;
  google_event_id?: string | null;
  // メタデータ
  created_at: string;
  updated_at: string;
}

// タスク作成用
export interface TaskCreate {
  workspace_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  assignee_id?: string;
  suit?: EventSuit;
  google_event_id?: string;
}

// タスク更新用
export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  completed_at?: string;
  assignee_id?: string;
  suit?: EventSuit | null;
}

// 4象限の表示情報
export const SUIT_INFO: Record<EventSuit, {
  label: string;
  symbol: string;
  color: string;
  bgColor: string;
  description: string;
  quadrant: string;
}> = {
  spade: {
    label: 'すぐやる',
    symbol: '♠',
    color: '#1a1a1a',
    bgColor: '#f0f0f0',
    description: '緊急かつ重要',
    quadrant: 'Q1: Do Now',
  },
  heart: {
    label: '予定に入れ実行',
    symbol: '♥',
    color: '#dc2626',
    bgColor: '#fef2f2',
    description: '重要だが緊急でない',
    quadrant: 'Q2: Schedule',
  },
  diamond: {
    label: '任せる',
    symbol: '♦',
    color: '#ca8a04',
    bgColor: '#fefce8',
    description: '緊急だが重要でない',
    quadrant: 'Q3: Delegate',
  },
  club: {
    label: '未来創造',
    symbol: '♣',
    color: '#2563eb',
    bgColor: '#eff6ff',
    description: '緊急でも重要でもない',
    quadrant: 'Q4: Create Future',
  },
};
```

### 確認ポイント

- [ ] Task 型に suit と google_event_id が追加された
- [ ] SUIT_INFO に4象限の表示情報がある

---

## Step 3: API Routes 更新

### 3.1 イベントからタスク作成 API

**ファイル:** `app/api/tasks/from-event/route.ts`

```typescript
/**
 * app/api/tasks/from-event/route.ts
 *
 * POST /api/tasks/from-event - カレンダーイベントからタスク作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EventSuit } from '@/lib/types/google-calendar';

interface CreateTaskFromEventBody {
  eventId: string;
  eventSummary: string;
  eventDescription?: string;
  eventStart?: string;
  suit: EventSuit;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateTaskFromEventBody = await request.json();
    const { eventId, eventSummary, eventDescription, eventStart, suit } = body;

    if (!eventId || !eventSummary || !suit) {
      return NextResponse.json(
        { error: 'eventId, eventSummary, and suit are required' },
        { status: 400 }
      );
    }

    // 既に同じイベントからタスクが作成されていないか確認
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('google_event_id', eventId)
      .single();

    if (existingTask) {
      return NextResponse.json(
        { error: 'Task already exists for this event', taskId: existingTask.id },
        { status: 409 }
      );
    }

    // ユーザーのワークスペースを取得
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      );
    }

    // suit に応じた優先度を設定
    const priorityMap: Record<EventSuit, string> = {
      spade: 'urgent',
      heart: 'high',
      diamond: 'medium',
      club: 'low',
    };

    // タスク作成
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        workspace_id: membership.workspace_id,
        title: eventSummary,
        description: eventDescription || null,
        status: 'pending',
        priority: priorityMap[suit],
        due_date: eventStart || null,
        suit,
        google_event_id: eventId,
      })
      .select()
      .single();

    if (createError) {
      console.error('Task creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task from event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.2 タスクの suit 更新 API

**ファイル:** `app/api/tasks/[taskId]/suit/route.ts`

```typescript
/**
 * app/api/tasks/[taskId]/suit/route.ts
 *
 * PATCH /api/tasks/:taskId/suit - タスクの象限を更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EventSuit } from '@/lib/types/google-calendar';

interface UpdateSuitBody {
  suit: EventSuit;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateSuitBody = await request.json();
    const { suit } = body;

    if (!suit || !['spade', 'heart', 'diamond', 'club'].includes(suit)) {
      return NextResponse.json(
        { error: 'Invalid suit value' },
        { status: 400 }
      );
    }

    // suit に応じた優先度も更新
    const priorityMap: Record<EventSuit, string> = {
      spade: 'urgent',
      heart: 'high',
      diamond: 'medium',
      club: 'low',
    };

    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({
        suit,
        priority: priorityMap[suit],
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Task suit update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task suit' },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task suit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.3 象限別タスク取得 API

**ファイル:** `app/api/tasks/by-suit/route.ts`

```typescript
/**
 * app/api/tasks/by-suit/route.ts
 *
 * GET /api/tasks/by-suit - 象限別にタスクを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // ユーザーのワークスペースを取得
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        spade: [],
        heart: [],
        diamond: [],
        club: [],
        unassigned: [],
      });
    }

    const workspaceIds = memberships.map(m => m.workspace_id);

    // タスク取得（suit でグループ化）
    let query = supabase
      .from('tasks')
      .select('*')
      .in('workspace_id', workspaceIds)
      .order('created_at', { ascending: false });

    if (!includeCompleted) {
      query = query.neq('status', 'completed').neq('status', 'cancelled');
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error('Tasks fetch error:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // 象限別に分類
    const grouped = {
      spade: tasks?.filter(t => t.suit === 'spade') || [],
      heart: tasks?.filter(t => t.suit === 'heart') || [],
      diamond: tasks?.filter(t => t.suit === 'diamond') || [],
      club: tasks?.filter(t => t.suit === 'club') || [],
      unassigned: tasks?.filter(t => !t.suit) || [],
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Get tasks by suit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 確認ポイント

- [ ] `app/api/tasks/from-event/route.ts` が作成された
- [ ] `app/api/tasks/[taskId]/suit/route.ts` が作成された
- [ ] `app/api/tasks/by-suit/route.ts` が作成された

---

## Step 4: React Hooks 作成

### 4.1 4象限タスク管理 Hook

**ファイル:** `lib/hooks/useMatrixTasks.ts`

```typescript
'use client';

/**
 * lib/hooks/useMatrixTasks.ts
 *
 * 4象限マトリクス用タスク管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { Task } from '@/lib/types/task';
import type { EventSuit } from '@/lib/types/google-calendar';

interface MatrixTasks {
  spade: Task[];
  heart: Task[];
  diamond: Task[];
  club: Task[];
  unassigned: Task[];
}

interface UseMatrixTasksOptions {
  includeCompleted?: boolean;
  autoFetch?: boolean;
}

export function useMatrixTasks(options: UseMatrixTasksOptions = {}) {
  const { includeCompleted = false, autoFetch = true } = options;

  const [tasks, setTasks] = useState<MatrixTasks>({
    spade: [],
    heart: [],
    diamond: [],
    club: [],
    unassigned: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (includeCompleted) {
        params.set('includeCompleted', 'true');
      }

      const response = await fetch(`/api/tasks/by-suit?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    if (autoFetch) {
      fetchTasks();
    }
  }, [fetchTasks, autoFetch]);

  // タスクの象限を更新
  const updateTaskSuit = useCallback(async (taskId: string, newSuit: EventSuit) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/suit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suit: newSuit }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task suit');
      }

      const updatedTask = await response.json();

      // ローカルステートを更新
      setTasks(prev => {
        const newTasks = { ...prev };

        // 全象限から該当タスクを削除
        for (const suit of ['spade', 'heart', 'diamond', 'club', 'unassigned'] as const) {
          newTasks[suit] = newTasks[suit].filter(t => t.id !== taskId);
        }

        // 新しい象限に追加
        newTasks[newSuit] = [updatedTask, ...newTasks[newSuit]];

        return newTasks;
      });

      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // イベントからタスク作成
  const createTaskFromEvent = useCallback(async (
    eventId: string,
    eventSummary: string,
    suit: EventSuit,
    eventDescription?: string,
    eventStart?: string
  ) => {
    try {
      const response = await fetch('/api/tasks/from-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          eventSummary,
          eventDescription,
          eventStart,
          suit,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const newTask = await response.json();

      // ローカルステートを更新
      setTasks(prev => ({
        ...prev,
        [suit]: [newTask, ...prev[suit]],
      }));

      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // 各象限のタスク数
  const counts = {
    spade: tasks.spade.length,
    heart: tasks.heart.length,
    diamond: tasks.diamond.length,
    club: tasks.club.length,
    unassigned: tasks.unassigned.length,
    total: tasks.spade.length + tasks.heart.length + tasks.diamond.length + tasks.club.length,
  };

  return {
    tasks,
    counts,
    isLoading,
    error,
    refetch: fetchTasks,
    updateTaskSuit,
    createTaskFromEvent,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useMatrixTasks.ts` が作成された
- [ ] `updateTaskSuit` で象限変更ができる
- [ ] `createTaskFromEvent` でイベントからタスク作成ができる

---

## Step 5: 4象限マトリクスビュー

### 5.1 マトリクスコンポーネント

**ファイル:** `components/matrix/EisenhowerMatrix.tsx`

```typescript
'use client';

/**
 * components/matrix/EisenhowerMatrix.tsx
 *
 * アイゼンハワーマトリクス（4象限表示）
 */

import { useMatrixTasks } from '@/lib/hooks/useMatrixTasks';
import { SUIT_INFO, type Task } from '@/lib/types/task';
import type { EventSuit } from '@/lib/types/google-calendar';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface QuadrantProps {
  suit: EventSuit;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onSuitChange?: (taskId: string, newSuit: EventSuit) => void;
}

function Quadrant({ suit, tasks, onTaskClick, onSuitChange }: QuadrantProps) {
  const info = SUIT_INFO[suit];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.style.opacity = '0.8';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.style.opacity = '1';
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onSuitChange) {
      onSuitChange(taskId, suit);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: info.bgColor,
        borderRadius: '12px',
        padding: '16px',
        minHeight: '200px',
        border: `2px solid ${info.color}20`,
        transition: 'all 0.2s',
      }}
    >
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${info.color}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{info.symbol}</span>
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: info.color,
              margin: 0,
            }}>
              {info.label}
            </h3>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: 0,
            }}>
              {info.quadrant}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          color: info.color,
          background: `${info.color}20`,
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {tasks.length}
        </span>
      </div>

      {/* タスク一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.length === 0 ? (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px 0',
          }}>
            タスクなし
          </p>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              color={info.color}
              onClick={() => onTaskClick?.(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  color: string;
  onClick?: () => void;
}

function TaskCard({ task, color, onClick }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const statusIcon = {
    pending: <Circle size={14} />,
    in_progress: <Clock size={14} />,
    completed: <CheckCircle2 size={14} />,
    cancelled: <AlertCircle size={14} />,
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: 'grab',
        border: '1px solid var(--border-light)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ color: color, marginTop: '2px' }}>
          {statusIcon[task.status]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-dark)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {task.title}
          </p>
          {task.due_date && (
            <p style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: '4px 0 0 0',
            }}>
              {new Date(task.due_date).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EisenhowerMatrix() {
  const { tasks, counts, isLoading, error, updateTaskSuit } = useMatrixTasks();

  const handleSuitChange = async (taskId: string, newSuit: EventSuit) => {
    try {
      await updateTaskSuit(taskId, newSuit);
    } catch (err) {
      console.error('Failed to update task suit:', err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--error)' }}>
        エラー: {error}
      </div>
    );
  }

  return (
    <div>
      {/* 統計 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {(['spade', 'heart', 'diamond', 'club'] as EventSuit[]).map(suit => {
          const info = SUIT_INFO[suit];
          return (
            <div
              key={suit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: info.bgColor,
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <span>{info.symbol}</span>
              <span style={{ fontWeight: 500, color: info.color }}>
                {counts[suit]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2x2 マトリクス */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
      }}>
        {/* 上段: 重要 */}
        <Quadrant
          suit="spade"
          tasks={tasks.spade}
          onSuitChange={handleSuitChange}
        />
        <Quadrant
          suit="heart"
          tasks={tasks.heart}
          onSuitChange={handleSuitChange}
        />

        {/* 下段: 重要でない */}
        <Quadrant
          suit="diamond"
          tasks={tasks.diamond}
          onSuitChange={handleSuitChange}
        />
        <Quadrant
          suit="club"
          tasks={tasks.club}
          onSuitChange={handleSuitChange}
        />
      </div>

      {/* 未分類タスク */}
      {tasks.unassigned.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}>
            未分類のタスク ({tasks.unassigned.length})
          </h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {tasks.unassigned.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                style={{
                  background: 'var(--bg-gray)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'grab',
                }}
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/matrix/EisenhowerMatrix.tsx` が作成された
- [ ] ドラッグ&ドロップで象限間移動ができる
- [ ] タスク数が表示される

---

## Step 6: UnclassifiedEvents 更新

### 6.1 タスク化機能を追加

**ファイル:** `components/calendar/UnclassifiedEvents.tsx` の更新

```typescript
// handleCategorize 関数を更新
const handleCategorize = async (event: FDCEvent, category: EventCategory) => {
  if (category === 'joker' || category === 'unclassified') {
    // joker と unclassified はタスク化しない
    updateEventCategory(event.id, category);
    onCategorize?.(event, category);
    return;
  }

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
        suit: category,
      }),
    });

    if (response.ok) {
      // 成功したらローカルステートも更新
      updateEventCategory(event.id, category);
      onCategorize?.(event, category);
    } else {
      const data = await response.json();
      if (data.error === 'Task already exists for this event') {
        // 既にタスク化済み
        updateEventCategory(event.id, category);
      } else {
        console.error('Failed to create task:', data.error);
      }
    }
  } catch (err) {
    console.error('Create task error:', err);
  }
};
```

---

## Step 7: マトリクスページ作成

### 7.1 マトリクスページ

**ファイル:** `app/(app)/matrix/page.tsx`

```typescript
'use client';

/**
 * app/(app)/matrix/page.tsx
 *
 * アイゼンハワーマトリクスページ
 */

import { Grid2X2 } from 'lucide-react';
import { EisenhowerMatrix } from '@/components/matrix/EisenhowerMatrix';

export default function MatrixPage() {
  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Grid2X2 size={28} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            マトリクス
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            アイゼンハワーマトリクスでタスクを管理
          </p>
        </div>
      </div>

      {/* 説明 */}
      <div style={{
        background: 'var(--bg-gray)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        タスクをドラッグして象限間を移動できます。カレンダーの予定は「ダッシュボード」から分類してください。
      </div>

      {/* マトリクス */}
      <EisenhowerMatrix />
    </div>
  );
}
```

### 7.2 ナビゲーション更新

**ファイル:** `app/(app)/layout.tsx` のナビゲーションに追加

```typescript
// ナビゲーションリンクに追加
<NavLink href="/matrix" icon={<Grid2X2 size={20} />}>
  マトリクス
</NavLink>
```

### 確認ポイント

- [ ] `/matrix` ページが作成された
- [ ] ナビゲーションにマトリクスリンクが追加された

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

### 9.2 確認項目

1. http://localhost:3000/dashboard にアクセス
2. 未分類イベントの分類ボタン（♠♥♦♣）をクリック
3. 以下を確認:
   - [ ] 分類するとタスクが作成される
   - [ ] `/matrix` ページに4象限が表示される
   - [ ] タスクをドラッグして象限間移動ができる
   - [ ] 各象限のタスク数が表示される

---

## Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 14: イベント→タスク変換 + 4象限マトリクスビュー

- supabase/migrations: tasks に suit, google_event_id カラム追加
- lib/types/task.ts: Task 型に suit 追加 + SUIT_INFO
- app/api/tasks/from-event: イベントからタスク作成 API
- app/api/tasks/[taskId]/suit: タスク象限更新 API
- app/api/tasks/by-suit: 象限別タスク取得 API
- lib/hooks/useMatrixTasks.ts: 4象限タスク管理 Hook
- components/matrix/EisenhowerMatrix.tsx: マトリクスビュー
- app/(app)/matrix/page.tsx: マトリクスページ
- ドラッグ&ドロップで象限間移動

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### データベース
- [ ] tasks テーブルに suit カラム追加
- [ ] tasks テーブルに google_event_id カラム追加
- [ ] マイグレーション成功

### 型定義
- [ ] Task 型に suit 追加
- [ ] SUIT_INFO 定義

### API Routes
- [ ] `POST /api/tasks/from-event` 作成
- [ ] `PATCH /api/tasks/:taskId/suit` 作成
- [ ] `GET /api/tasks/by-suit` 作成

### React Hooks
- [ ] `useMatrixTasks` 作成
- [ ] `updateTaskSuit` 機能
- [ ] `createTaskFromEvent` 機能

### UI コンポーネント
- [ ] `EisenhowerMatrix` 作成
- [ ] ドラッグ&ドロップ実装
- [ ] `/matrix` ページ作成

### 統合
- [ ] UnclassifiedEvents でタスク作成
- [ ] ナビゲーション更新
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 15 以降）

1. **Google Tasks 双方向同期**
   - FDC タスク → Google Tasks に同期
   - 完了状態の双方向同期
   - リアルタイム更新

2. **タスク詳細モーダル**
   - タスクの編集・削除
   - ステータス変更
   - 期限設定

3. **フィルター・検索機能**
   - 期限でフィルター
   - ステータスでフィルター
   - キーワード検索
