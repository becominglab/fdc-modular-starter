import type {
  Prospect,
  CreateProspectInput,
  UpdateProspectInput,
  ProspectStatus,
} from '@/lib/types/prospect';

const API_BASE = '/api/prospects';

/**
 * リード一覧を取得
 */
export async function fetchProspects(
  status?: string,
  search?: string
): Promise<Prospect[]> {
  const params = new URLSearchParams();
  if (status && status !== 'all') {
    params.append('status', status);
  }
  if (search) {
    params.append('search', search);
  }

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リードの取得に失敗しました');
  }

  return response.json();
}

/**
 * リードを作成
 */
export async function createProspect(
  input: CreateProspectInput
): Promise<Prospect> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リードの作成に失敗しました');
  }

  return response.json();
}

/**
 * リードを更新
 */
export async function updateProspect(
  id: string,
  input: UpdateProspectInput
): Promise<Prospect> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リードの更新に失敗しました');
  }

  return response.json();
}

/**
 * ステータスを更新
 */
export async function updateProspectStatus(
  id: string,
  status: ProspectStatus
): Promise<Prospect> {
  return updateProspect(id, { status });
}

/**
 * リードを削除
 */
export async function deleteProspect(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リードの削除に失敗しました');
  }
}
