/**
 * クライアント（既存客）の型
 */
export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  contract_date: string;
  notes: string | null;
  prospect_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * クライアント作成の入力型
 */
export interface CreateClientInput {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  contract_date?: string;
  notes?: string;
  prospect_id?: string;
}

/**
 * クライアント更新の入力型
 */
export interface UpdateClientInput {
  name?: string;
  company?: string;
  email?: string | null;
  phone?: string | null;
  contract_date?: string;
  notes?: string | null;
}

/**
 * リードからクライアントへの変換入力型
 */
export interface ConvertToClientInput {
  prospect_id: string;
  contract_date?: string;
  notes?: string;
}
