/**
 * タスクの型定義
 * Phase 2: フィルター・ソート追加
 */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 新規タスク作成用の入力型
 */
export type CreateTaskInput = Pick<Task, 'title'>;

/**
 * タスク更新用の入力型
 */
export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'completed'>>;

/**
 * フィルター種別
 */
export type TaskFilter = 'all' | 'pending' | 'completed';

/**
 * ソート種別
 */
export type TaskSort = 'createdAt' | 'updatedAt';

/**
 * ソート順
 */
export type SortOrder = 'asc' | 'desc';
