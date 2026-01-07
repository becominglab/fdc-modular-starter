'use client';

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskSort,
  SortOrder,
} from '@/lib/types/task';

// ローカルストレージのキー
const STORAGE_KEY = 'fdc-tasks';

// アクション型定義
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: UpdateTaskInput } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'SET_FILTER'; payload: TaskFilter }
  | { type: 'SET_SORT'; payload: { sort: TaskSort; order: SortOrder } };

// 状態型定義
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  filter: TaskFilter;
  sort: TaskSort;
  sortOrder: SortOrder;
}

// 初期状態
const initialState: TaskState = {
  tasks: [],
  isLoading: true,
  filter: 'all',
  sort: 'createdAt',
  sortOrder: 'desc',
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

    case 'SET_FILTER':
      return { ...state, filter: action.payload };

    case 'SET_SORT':
      return {
        ...state,
        sort: action.payload.sort,
        sortOrder: action.payload.order,
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

  // フィルター設定
  const setFilter = useCallback((filter: TaskFilter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  // ソート設定
  const setSort = useCallback((sort: TaskSort, order: SortOrder) => {
    dispatch({ type: 'SET_SORT', payload: { sort, order } });
  }, []);

  // フィルター適用
  const getFilteredTasks = useCallback(
    (tasks: Task[], filter: TaskFilter): Task[] => {
      switch (filter) {
        case 'pending':
          return tasks.filter((t) => !t.completed);
        case 'completed':
          return tasks.filter((t) => t.completed);
        default:
          return tasks;
      }
    },
    []
  );

  // ソート適用
  const getSortedTasks = useCallback(
    (tasks: Task[], sort: TaskSort, order: SortOrder): Task[] => {
      return [...tasks].sort((a, b) => {
        const aValue = a[sort];
        const bValue = b[sort];
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      });
    },
    []
  );

  // フィルター・ソート済みタスク
  const filteredTasks = useMemo(() => {
    const filtered = getFilteredTasks(state.tasks, state.filter);
    return getSortedTasks(filtered, state.sort, state.sortOrder);
  }, [
    state.tasks,
    state.filter,
    state.sort,
    state.sortOrder,
    getFilteredTasks,
    getSortedTasks,
  ]);

  // 統計情報
  const stats = {
    total: state.tasks.length,
    completed: state.tasks.filter((t) => t.completed).length,
    pending: state.tasks.filter((t) => !t.completed).length,
  };

  return {
    tasks: filteredTasks,
    allTasks: state.tasks,
    isLoading: state.isLoading,
    filter: state.filter,
    sort: state.sort,
    sortOrder: state.sortOrder,
    stats,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    setFilter,
    setSort,
  };
}
