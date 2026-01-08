# Phase 9: アイゼンハワーマトリクス（4象限）タスク管理

## このPhaseの目標

FDC 3層アーキテクチャの「実行層」として、アイゼンハワーマトリクス（4象限）タスク管理を実装：
- Task型にsuit（♠♥♦♣）を追加
- 4象限ボードUI
- ドラッグ&ドロップでの象限移動
- Jokerゾーン（未分類タスク）

## 習得する新しい概念

- **3層アーキテクチャ**: FDCの核心。OKR（戦略）→ Action Map（戦術）→ Task（実行）
- **アイゼンハワーマトリクス**: 緊急度×重要度の2軸で4象限に分類
- **実行層**: 日々のタスクを管理する最下層。ここから上位層に進捗がロールアップ

## 4象限の意味

| 象限 | 緊急 | 重要 | 説明 |
|-----|------|------|------|
| ♠ Spade | ✓ | ✓ | 今すぐやる締切案件 |
| ♥ Heart | - | ✓ | 習慣化したい重要なこと |
| ♦ Diamond | ✓ | - | 割り込み・依頼対応 |
| ♣ Club | - | - | 20%タイム・実験 |

## 前提条件

- Phase 1-8 完了（タスクCRUD、CRM動作）
- Supabase認証済み

---

## Step 1: Task 型の拡張

### 1.1 型定義ファイルの更新

**ファイル: `lib/types/task.ts`**

```typescript
// Suit（4象限）
export type Suit = 'spade' | 'heart' | 'diamond' | 'club';

// タスクステータス
export type TaskStatus = 'not_started' | 'in_progress' | 'done';

// Task インターフェース
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  suit?: Suit;              // undefined = joker/未分類
  scheduled_date?: string;  // YYYY-MM-DD形式
  user_id: string;
  workspace_id: string;
  linked_action_item_ids?: string[];  // Phase 10で使用
  created_at: string;
  updated_at: string;
}

// 作成用入力型
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  suit?: Suit;
  scheduled_date?: string;
}

// 更新用入力型
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  suit?: Suit;
  scheduled_date?: string;
}

// Suit設定
export const SUIT_CONFIG: Record<Suit, { label: string; emoji: string; color: string; description: string }> = {
  spade: {
    label: 'スペード',
    emoji: '♠',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    description: '緊急かつ重要：今すぐやる',
  },
  heart: {
    label: 'ハート',
    emoji: '♥',
    color: 'bg-red-50 text-red-800 border-red-300',
    description: '重要だが緊急ではない：習慣化',
  },
  diamond: {
    label: 'ダイヤ',
    emoji: '♦',
    color: 'bg-blue-50 text-blue-800 border-blue-300',
    description: '緊急だが重要ではない：委任・効率化',
  },
  club: {
    label: 'クラブ',
    emoji: '♣',
    color: 'bg-green-50 text-green-800 border-green-300',
    description: '緊急でも重要でもない：20%タイム',
  },
};

// ステータス設定
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  not_started: { label: '未着手', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
  done: { label: '完了', color: 'bg-green-100 text-green-700' },
};

// Suit配列（表示順）
export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];
```

### 確認ポイント
- [ ] `Suit` 型が定義されている
- [ ] `Task` インターフェースに `suit` フィールドがある
- [ ] `SUIT_CONFIG` に4象限の設定がある

---

## Step 2: データベーステーブル更新

### 2.1 Supabase SQL実行

**Supabase Dashboard → SQL Editor で実行:**

```sql
-- tasks テーブルに suit カラムを追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS suit TEXT
CHECK (suit IN ('spade', 'heart', 'diamond', 'club'));

-- scheduled_date カラムを追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- linked_action_item_ids カラムを追加（Phase 10用）
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS linked_action_item_ids UUID[] DEFAULT '{}';

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_tasks_suit ON tasks(suit);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
```

### 確認ポイント
- [ ] SQLがエラーなく実行された
- [ ] tasks テーブルに suit カラムが追加された

---

## Step 3: API ルートの更新

### 3.1 タスクAPI更新

**ファイル: `app/api/tasks/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// バリデーションスキーマ
const createTaskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'done']).default('not_started'),
  suit: z.enum(['spade', 'heart', 'diamond', 'club']).optional(),
  scheduled_date: z.string().optional(),
});

// GET: タスク一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const suit = searchParams.get('suit');
    const status = searchParams.get('status');
    const includeJoker = searchParams.get('include_joker') === 'true';

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // suitフィルター
    if (suit) {
      query = query.eq('suit', suit);
    } else if (!includeJoker) {
      // デフォルトでは未分類を含めない
    }

    // statusフィルター
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Tasks fetch error:', error);
      return NextResponse.json({ error: 'タスクの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// POST: タスク作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    // ワークスペースID取得
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'ワークスペースが見つかりません' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...result.data,
        user_id: user.id,
        workspace_id: membership.workspace_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Task create error:', error);
      return NextResponse.json({ error: 'タスクの作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
```

### 3.2 個別タスクAPI

**ファイル: `app/api/tasks/[taskId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

type Params = Promise<{ taskId: string }>;

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'done']).optional(),
  suit: z.enum(['spade', 'heart', 'diamond', 'club']).nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
});

// GET: タスク取得
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'タスクが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Task GET error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// PATCH: タスク更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'タスクの更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Task PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// DELETE: タスク削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'タスクの削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
```

### 確認ポイント
- [ ] GET /api/tasks でタスク一覧が取得できる
- [ ] POST /api/tasks でタスクが作成できる
- [ ] PATCH /api/tasks/[id] でsuitが更新できる

---

## Step 4: @dnd-kit インストール

### 4.1 パッケージインストール

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 確認ポイント
- [ ] package.json に @dnd-kit/core が追加されている

---

## Step 5: useTasks フック作成

### 5.1 タスク管理フック

**ファイル: `lib/hooks/useTasks.ts`**

```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Task, Suit, TaskStatus, CreateTaskInput, UpdateTaskInput } from '@/lib/types/task';
import { SUITS } from '@/lib/types/task';

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // タスク取得
  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks?include_joker=true');
      if (!response.ok) {
        throw new Error('タスクの取得に失敗しました');
      }
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスク作成
  const addTask = useCallback(async (input: CreateTaskInput) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('タスクの作成に失敗しました');
      }
      const newTask = await response.json();
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
      throw err;
    }
  }, []);

  // タスク更新
  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('タスクの更新に失敗しました');
      }
      const updated = await response.json();
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
      throw err;
    }
  }, []);

  // Suit更新（ドラッグ&ドロップ用）
  const updateSuit = useCallback(async (id: string, suit: Suit | null) => {
    return updateTask(id, { suit: suit ?? undefined });
  }, [updateTask]);

  // ステータス更新
  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    return updateTask(id, { status });
  }, [updateTask]);

  // タスク削除
  const deleteTask = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('タスクの削除に失敗しました');
      }
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
      throw err;
    }
  }, []);

  // Suit別グループ化
  const tasksBySuit = useMemo(() => {
    const grouped: Record<Suit | 'joker', Task[]> = {
      spade: [],
      heart: [],
      diamond: [],
      club: [],
      joker: [],
    };

    for (const task of tasks) {
      if (task.suit) {
        grouped[task.suit].push(task);
      } else {
        grouped.joker.push(task);
      }
    }

    return grouped;
  }, [tasks]);

  // 統計情報
  const stats = useMemo(() => ({
    total: tasks.length,
    byStatus: {
      not_started: tasks.filter(t => t.status === 'not_started').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
    },
    bySuit: {
      spade: tasks.filter(t => t.suit === 'spade').length,
      heart: tasks.filter(t => t.suit === 'heart').length,
      diamond: tasks.filter(t => t.suit === 'diamond').length,
      club: tasks.filter(t => t.suit === 'club').length,
      joker: tasks.filter(t => !t.suit).length,
    },
  }), [tasks]);

  return {
    tasks,
    tasksBySuit,
    stats,
    isLoading,
    error,
    addTask,
    updateTask,
    updateSuit,
    updateStatus,
    deleteTask,
    reload: loadTasks,
  };
}
```

### 確認ポイント
- [ ] useTasks フックが作成されている
- [ ] tasksBySuit でSuit別にグループ化されている

---

## Step 6: UIコンポーネント作成

### 6.1 タスクカード

**ファイル: `components/tasks/TaskCard.tsx`**

```typescript
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus } from '@/lib/types/task';
import { SUIT_CONFIG, STATUS_CONFIG } from '@/lib/types/task';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suitConfig = task.suit ? SUIT_CONFIG[task.suit] : null;
  const statusConfig = STATUS_CONFIG[task.status];

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange) {
      const newStatus = task.status === 'done' ? 'not_started' : 'done';
      onStatusChange(task.id, newStatus);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* 完了チェック */}
        <button
          onClick={handleComplete}
          className={`mt-0.5 flex-shrink-0 ${
            task.status === 'done' ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
          }`}
        >
          <CheckCircle size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <p className={`text-sm font-medium ${
            task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}>
            {task.title}
          </p>

          {/* メタ情報 */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {suitConfig && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${suitConfig.color}`}>
                {suitConfig.emoji} {suitConfig.label}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* メニュー */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical size={14} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-28 bg-white border rounded-md shadow-lg z-20">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={12} />
                  編集
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                  削除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 6.2 象限カラム

**ファイル: `components/tasks/QuadrantColumn.tsx`**

```typescript
'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Task, Suit, TaskStatus } from '@/lib/types/task';
import { SUIT_CONFIG } from '@/lib/types/task';
import { TaskCard } from './TaskCard';

interface QuadrantColumnProps {
  suit: Suit;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function QuadrantColumn({
  suit,
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
}: QuadrantColumnProps) {
  const config = SUIT_CONFIG[suit];

  const { setNodeRef, isOver } = useDroppable({
    id: `quadrant-${suit}`,
    data: { suit },
  });

  return (
    <div className={`rounded-lg border-2 ${config.color} ${isOver ? 'ring-2 ring-blue-400' : ''}`}>
      {/* ヘッダー */}
      <div className="p-3 border-b bg-white/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <span className="text-lg">{config.emoji}</span>
            {config.label}
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-gray-600">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
      </div>

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        className="p-2 min-h-[200px] space-y-2"
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            タスクをドラッグしてここにドロップ
          </div>
        )}
      </div>
    </div>
  );
}
```

### 6.3 Jokerゾーン

**ファイル: `components/tasks/JokerZone.tsx`**

```typescript
'use client';

import { useDroppable } from '@dnd-kit/core';
import { HelpCircle } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types/task';
import { TaskCard } from './TaskCard';

interface JokerZoneProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function JokerZone({ tasks, onEdit, onDelete, onStatusChange }: JokerZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'quadrant-joker',
    data: { suit: null },
  });

  return (
    <div className={`rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 ${
      isOver ? 'ring-2 ring-blue-400 border-blue-400' : ''
    }`}>
      {/* ヘッダー */}
      <div className="p-3 border-b border-dashed border-gray-300">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-600 flex items-center gap-2">
            <HelpCircle size={18} />
            Joker（未分類）
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-gray-600">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          象限が決まっていないタスク。ドラッグして振り分けてください
        </p>
      </div>

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        className="p-2 min-h-[100px] space-y-2"
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            未分類タスクはありません
          </div>
        )}
      </div>
    </div>
  );
}
```

### 6.4 4象限ボード

**ファイル: `components/tasks/TaskBoard.tsx`**

```typescript
'use client';

import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useState } from 'react';
import type { Task, Suit, TaskStatus } from '@/lib/types/task';
import { SUITS } from '@/lib/types/task';
import { QuadrantColumn } from './QuadrantColumn';
import { JokerZone } from './JokerZone';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  tasksBySuit: Record<Suit | 'joker', Task[]>;
  onSuitChange: (taskId: string, suit: Suit | null) => Promise<void>;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskBoard({
  tasksBySuit,
  onSuitChange,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: { active: { data: { current?: { task?: Task } } } }) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // ドロップ先のsuitを取得
    let newSuit: Suit | null = null;
    if (overId.startsWith('quadrant-')) {
      const suitStr = overId.replace('quadrant-', '');
      if (suitStr === 'joker') {
        newSuit = null;
      } else {
        newSuit = suitStr as Suit;
      }
    }

    // 現在のタスクを探す
    const allTasks = [...tasksBySuit.spade, ...tasksBySuit.heart, ...tasksBySuit.diamond, ...tasksBySuit.club, ...tasksBySuit.joker];
    const task = allTasks.find(t => t.id === taskId);

    if (task && task.suit !== newSuit) {
      await onSuitChange(taskId, newSuit);
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Jokerゾーン */}
      {tasksBySuit.joker.length > 0 && (
        <div className="mb-6">
          <JokerZone
            tasks={tasksBySuit.joker}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        </div>
      )}

      {/* 4象限グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUITS.map(suit => (
          <QuadrantColumn
            key={suit}
            suit={suit}
            tasks={tasksBySuit[suit]}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* ドラッグ中のオーバーレイ */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-80">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

### 6.5 タスク追加フォーム

**ファイル: `components/tasks/AddTaskForm.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateTaskInput, Suit } from '@/lib/types/task';
import { SUIT_CONFIG, SUITS } from '@/lib/types/task';

interface AddTaskFormProps {
  isOpen: boolean;
  onAdd: (input: CreateTaskInput) => Promise<void>;
  onClose: () => void;
  defaultSuit?: Suit;
}

export function AddTaskForm({ isOpen, onAdd, onClose, defaultSuit }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suit, setSuit] = useState<Suit | ''>(defaultSuit || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        suit: suit || undefined,
      });
      setTitle('');
      setDescription('');
      setSuit(defaultSuit || '');
      onClose();
    } catch (error) {
      console.error('Add task error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">タスクを追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="タスクのタイトル"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="タスクの説明（任意）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Suit選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              象限（後で変更可能）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUITS.map(s => {
                const config = SUIT_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSuit(suit === s ? '' : s)}
                    className={`p-2 rounded-md border text-left transition-all ${
                      suit === s
                        ? `${config.color} border-2`
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{config.emoji}</span>
                    <span className="ml-1 text-sm">{config.label}</span>
                  </button>
                );
              })}
            </div>
            {!suit && (
              <p className="text-xs text-gray-500 mt-1">
                未選択の場合はJoker（未分類）として追加されます
              </p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6.6 コンポーネントインデックス

**ファイル: `components/tasks/index.ts`**

```typescript
export { TaskCard } from './TaskCard';
export { QuadrantColumn } from './QuadrantColumn';
export { JokerZone } from './JokerZone';
export { TaskBoard } from './TaskBoard';
export { AddTaskForm } from './AddTaskForm';
```

### 確認ポイント
- [ ] TaskCard がドラッグ可能
- [ ] QuadrantColumn がドロップ受け入れ可能
- [ ] JokerZone が表示される

---

## Step 7: タスクページ作成

### 7.1 タスクボードページ

**ファイル: `app/(app)/tasks/page.tsx`** を更新

```typescript
'use client';

import { useState } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useTasks } from '@/lib/hooks/useTasks';
import { TaskBoard, AddTaskForm } from '@/components/tasks';
import type { Task, TaskStatus } from '@/lib/types/task';

export default function TasksPage() {
  const {
    tasksBySuit,
    stats,
    isLoading,
    error,
    addTask,
    updateSuit,
    updateStatus,
    deleteTask,
  } = useTasks();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('このタスクを削除しますか？')) {
      await deleteTask(id);
    }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateStatus(id, status);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラー: {error.message}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タスクボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            アイゼンハワーマトリクスでタスクを管理
          </p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          タスクを追加
        </button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg border text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">合計</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
          <p className="text-2xl font-bold text-slate-700">{stats.bySuit.spade}</p>
          <p className="text-xs text-gray-500">♠ スペード</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.bySuit.heart}</p>
          <p className="text-xs text-gray-500">♥ ハート</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.bySuit.diamond}</p>
          <p className="text-xs text-gray-500">♦ ダイヤ</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.bySuit.club}</p>
          <p className="text-xs text-gray-500">♣ クラブ</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-2xl font-bold text-gray-600">{stats.bySuit.joker}</p>
          <p className="text-xs text-gray-500">? Joker</p>
        </div>
      </div>

      {/* タスクボード */}
      <TaskBoard
        tasksBySuit={tasksBySuit}
        onSuitChange={updateSuit}
        onEdit={setEditingTask}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* タスク追加フォーム */}
      <AddTaskForm
        isOpen={isAddFormOpen}
        onAdd={addTask}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
```

### 確認ポイント
- [ ] /tasks ページが表示される
- [ ] 4象限が表示される
- [ ] タスクを追加できる
- [ ] ドラッグ&ドロップで象限を移動できる

---

## Step 8: 動作確認

### 8.1 開発サーバー起動

```bash
npm run dev
```

### 8.2 確認手順

1. http://localhost:3000/tasks にアクセス
2. 「タスクを追加」ボタンでタスクを作成
3. 象限を選択せずに追加 → Jokerゾーンに表示される
4. Jokerからタスクをドラッグして象限にドロップ
5. 象限間でタスクをドラッグ&ドロップ
6. チェックマークで完了/未完了を切り替え

---

## 完了チェックリスト

### 型定義
- [ ] lib/types/task.ts に Suit 型が定義されている
- [ ] Task インターフェースに suit フィールドがある
- [ ] SUIT_CONFIG に4象限の設定がある

### データベース
- [ ] tasks テーブルに suit カラムが追加されている
- [ ] tasks テーブルに scheduled_date カラムがある

### API
- [ ] GET /api/tasks でタスク一覧が取得できる
- [ ] POST /api/tasks でタスクが作成できる
- [ ] PATCH /api/tasks/[id] でsuitが更新できる

### UIコンポーネント
- [ ] TaskCard がドラッグ可能
- [ ] QuadrantColumn が4つ表示される
- [ ] JokerZone が表示される
- [ ] TaskBoard でドラッグ&ドロップが動作する

### 機能確認
- [ ] タスクを追加できる
- [ ] タスクの象限を変更できる（ドラッグ&ドロップ）
- [ ] タスクのステータスを変更できる（チェックマーク）
- [ ] タスクを削除できる
- [ ] 統計情報が正しく表示される

---

## 次のPhase

Phase 10 では、OKR（目標）と Action Map（施策）を実装し、タスクとの連携を行います。

---

## 参考: フォルダ構成

```
lib/
├── types/
│   └── task.ts          # Task型定義（更新）
├── hooks/
│   └── useTasks.ts      # タスク管理フック

components/
└── tasks/
    ├── index.ts
    ├── TaskCard.tsx      # ドラッグ可能カード
    ├── QuadrantColumn.tsx # 象限カラム
    ├── JokerZone.tsx     # 未分類ゾーン
    ├── TaskBoard.tsx     # 4象限ボード
    └── AddTaskForm.tsx   # タスク追加フォーム

app/
├── api/
│   └── tasks/
│       ├── route.ts           # タスクCRUD
│       └── [taskId]/
│           └── route.ts       # 個別タスク操作
└── (app)/
    └── tasks/
        └── page.tsx           # タスクボードページ
```
