/**
 * lib/api/approaches.ts
 *
 * アプローチAPI ヘルパー関数
 */

import type { Approach, CreateApproachInput, UpdateApproachInput, ApproachStats } from '@/lib/types/approach';

const API_BASE = '/api/approaches';

// アプローチ一覧取得
export async function fetchApproaches(prospectId?: string): Promise<Approach[]> {
  const url = prospectId ? `${API_BASE}?prospect_id=${prospectId}` : API_BASE;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('アプローチの取得に失敗しました');
  }
  return response.json();
}

// アプローチ作成
export async function createApproach(input: CreateApproachInput): Promise<Approach> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アプローチの作成に失敗しました');
  }
  return response.json();
}

// アプローチ更新
export async function updateApproach(id: string, input: UpdateApproachInput): Promise<Approach> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アプローチの更新に失敗しました');
  }
  return response.json();
}

// アプローチ削除
export async function deleteApproach(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アプローチの削除に失敗しました');
  }
}

// アプローチ統計取得
export async function fetchApproachStats(): Promise<ApproachStats> {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) {
    throw new Error('統計の取得に失敗しました');
  }
  return response.json();
}
