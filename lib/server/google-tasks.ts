import { getValidGoogleToken } from './google-auth';
import type {
  GoogleTaskList,
  GoogleTask,
  GoogleTaskListsResponse,
  GoogleTasksResponse,
} from '@/lib/types/google-api';

const TASKS_API_BASE = 'https://www.googleapis.com/tasks/v1';

/**
 * ユーザーのタスクリスト一覧を取得
 */
export async function getTaskLists(userId: string): Promise<GoogleTaskList[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const response = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Task lists fetch error:', error);
    throw new Error(`Failed to fetch task lists: ${response.status}`);
  }

  const data: GoogleTaskListsResponse = await response.json();
  return data.items || [];
}

/**
 * 指定したタスクリストのタスク一覧を取得
 */
export async function getTasks(
  userId: string,
  taskListId: string = '@default',
  options: {
    maxResults?: number;
    showCompleted?: boolean;
    showHidden?: boolean;
    dueMin?: string;
    dueMax?: string;
  } = {}
): Promise<GoogleTask[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const params = new URLSearchParams();

  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.showCompleted !== undefined) params.set('showCompleted', options.showCompleted.toString());
  if (options.showHidden !== undefined) params.set('showHidden', options.showHidden.toString());
  if (options.dueMin) params.set('dueMin', options.dueMin);
  if (options.dueMax) params.set('dueMax', options.dueMax);

  const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Tasks fetch error:', error);
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  }

  const data: GoogleTasksResponse = await response.json();
  return data.items || [];
}

/**
 * 未完了のタスクを取得
 */
export async function getPendingTasks(userId: string): Promise<GoogleTask[]> {
  return getTasks(userId, '@default', {
    showCompleted: false,
    maxResults: 20,
  });
}

/**
 * タスクのステータスを更新
 */
export async function updateTaskStatus(
  userId: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTask> {
  const token = await getValidGoogleToken(userId);
  if (!token) {
    throw new Error('Google API token not available');
  }

  const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
      completed: completed ? new Date().toISOString() : null,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Task update error:', error);
    throw new Error(`Failed to update task: ${response.status}`);
  }

  return response.json();
}
