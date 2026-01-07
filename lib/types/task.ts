/**
 * タスクの型定義
 * Phase 1: localStorage 版
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
