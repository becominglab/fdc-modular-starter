import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  ConvertToClientInput,
} from '@/lib/types/client';

const API_BASE = '/api/clients';

/**
 * クライアント一覧を取得
 */
export async function fetchClients(search?: string): Promise<Client[]> {
  const params = new URLSearchParams();
  if (search) {
    params.append('search', search);
  }

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'クライアントの取得に失敗しました');
  }

  return response.json();
}

/**
 * クライアントを作成
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'クライアントの作成に失敗しました');
  }

  return response.json();
}

/**
 * クライアントを更新
 */
export async function updateClient(
  id: string,
  input: UpdateClientInput
): Promise<Client> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'クライアントの更新に失敗しました');
  }

  return response.json();
}

/**
 * クライアントを削除
 */
export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'クライアントの削除に失敗しました');
  }
}

/**
 * リードをクライアントに変換
 */
export async function convertProspectToClient(
  input: ConvertToClientInput
): Promise<Client> {
  const response = await fetch(`${API_BASE}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'クライアントへの変換に失敗しました');
  }

  return response.json();
}
