'use client';

import { useReducer, useEffect, useCallback } from 'react';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types/task';

// ローカルストレージのキー
const STORAGE_KEY = 'fdc-tasks';

// アクション型定義
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: UpdateTaskInput } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string };

// 状態型定義
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
}

// 初期状態
const initialState: TaskState = {
  tasks: [],
  isLoading: true,
};

// Reducer 関数
function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, isLoading: false };

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };

    case 'UPDATE_TASK': {
      const { id, updates } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, ...updates, updatedAt: Date.now() }
            : task
        ),
      };
    }

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      };

    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload
            ? { ...task, completed: !task.completed, updatedAt: Date.now() }
            : task
        ),
      };

    default:
      return state;
  }
}

// localStorage から読み込み
function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    console.error('Failed to load tasks from localStorage');
    return [];
  }
}

// localStorage に保存
function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.error('Failed to save tasks to localStorage');
  }
}

// UUID 生成
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * タスク管理用カスタムフック
 */
export function useTaskReducer() {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // 初期読み込み
  useEffect(() => {
    const tasks = loadTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }, []);

  // 変更時に保存
  useEffect(() => {
    if (!state.isLoading) {
      saveTasks(state.tasks);
    }
  }, [state.tasks, state.isLoading]);

  // タスク追加
  const addTask = useCallback((input: CreateTaskInput) => {
    const now = Date.now();
    const newTask: Task = {
      id: generateId(),
      title: input.title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);

  // タスク更新
  const updateTask = useCallback((id: string, updates: UpdateTaskInput) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
  }, []);

  // タスク削除
  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, []);

  // タスク完了切り替え
  const toggleTask = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TASK', payload: id });
  }, []);

  // 統計情報
  const stats = {
    total: state.tasks.length,
    completed: state.tasks.filter((t) => t.completed).length,
    pending: state.tasks.filter((t) => !t.completed).length,
  };

  return {
    tasks: state.tasks,
    isLoading: state.isLoading,
    stats,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
  };
}
