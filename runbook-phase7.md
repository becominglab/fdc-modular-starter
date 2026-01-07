# Phase 7: クライアント（既存客）管理機能ランブック

## 目標

リードが受注（Won）した時にクライアント（顧客）として管理する機能を実装：
- clients テーブルの作成
- リード→クライアント変換の自動化
- クライアント一覧・詳細表示
- 失注リードの分析用一覧

## 前提条件

- [ ] Phase 6 完了（リード管理が動作）
- [ ] prospectsテーブルにデータがある状態
- [ ] `npm run dev` で http://localhost:3000 にアクセスできる

---

## 習得する新しい概念

### コンバージョン（Conversion）
リード（見込み客）が顧客に変わること。マーケティングファネルの出口。

```
リード (Prospect) → 成約 (Won) → クライアント (Client)
```

### Won/Lost
商談の最終結果。
- **Won（成約）**: 契約成立。クライアントに変換
- **Lost（失注）**: 見送り・競合負け。分析用に保持

### リレーション
Prospect → Client の1対1関係。`prospect_id` で元リードを参照し、トレーサビリティを確保。

---

## Step 1: データベーステーブルの作成

### 1.1 Supabase ダッシュボードで SQL を実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. 以下の SQL を実行:

```sql
-- =====================================================
-- clients テーブルの作成
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS clients_prospect_id_idx ON clients(prospect_id);
CREATE INDEX IF NOT EXISTS clients_contract_date_idx ON clients(contract_date DESC);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON clients(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) の設定
-- =====================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分のクライアントのみ参照可能
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (user_id = auth.uid());

-- ポリシー: 認証済みユーザーはクライアントを作成可能
CREATE POLICY "Users can create own clients"
  ON clients FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ポリシー: 自分のクライアントのみ更新可能
CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (user_id = auth.uid());

-- ポリシー: 自分のクライアントのみ削除可能
CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- updated_at 自動更新トリガー
-- =====================================================
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 確認ポイント

- [ ] `clients` テーブルが作成された
- [ ] RLS ポリシーが有効化された（4件）
- [ ] インデックスが作成された
- [ ] `prospect_id` 外部キーが設定された

---

## Step 2: 型定義の追加

### 2.1 クライアント型の定義

**ファイルパス:** `lib/types/client.ts`

```typescript
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
```

### 2.2 データベース型の更新

**ファイルパス:** `lib/types/database.ts` に追加

```typescript
// 既存の型定義の後に追加

export interface DbClient {
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

export type DbClientInsert = Omit<DbClient, 'id' | 'created_at' | 'updated_at'>;
export type DbClientUpdate = Partial<Omit<DbClient, 'id' | 'user_id' | 'prospect_id' | 'created_at' | 'updated_at'>>;
```

### 2.3 Database インターフェースにテーブル追加

**ファイルパス:** `lib/types/database.ts` の Database インターフェース内に追加

```typescript
// Tables の中に追加
clients: {
  Row: {
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
  };
  Insert: {
    id?: string;
    user_id: string;
    name: string;
    company: string;
    email?: string | null;
    phone?: string | null;
    contract_date?: string;
    notes?: string | null;
    prospect_id?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    name?: string;
    company?: string;
    email?: string | null;
    phone?: string | null;
    contract_date?: string;
    notes?: string | null;
    prospect_id?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'clients_prospect_id_fkey';
      columns: ['prospect_id'];
      referencedRelation: 'prospects';
      referencedColumns: ['id'];
    }
  ];
};
```

### 確認ポイント

- [ ] `lib/types/client.ts` が作成された
- [ ] `lib/types/database.ts` が更新された
- [ ] Database インターフェースに clients テーブルが追加された

---

## Step 3: Zod バリデーションスキーマの作成

**ファイルパス:** `lib/validations/client.ts`

```typescript
import { z } from 'zod';

/**
 * クライアント作成のスキーマ
 */
export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内です'),
  company: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内です'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内です')
    .optional()
    .or(z.literal('')),
  contract_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .optional()
    .or(z.literal('')),
  prospect_id: z
    .string()
    .uuid('無効なリードIDです')
    .optional(),
});

/**
 * クライアント更新のスキーマ
 */
export const updateClientSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内です')
    .optional(),
  company: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内です')
    .optional(),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .nullable()
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内です')
    .nullable()
    .optional()
    .or(z.literal('')),
  contract_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .nullable()
    .optional()
    .or(z.literal('')),
});

/**
 * リード→クライアント変換のスキーマ
 */
export const convertToClientSchema = z.object({
  prospect_id: z
    .string()
    .uuid('無効なリードIDです'),
  contract_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .optional()
    .or(z.literal('')),
});

// 型のエクスポート
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ConvertToClientInput = z.infer<typeof convertToClientSchema>;
```

### 確認ポイント

- [ ] `lib/validations/client.ts` が作成された

---

## Step 4: クライアント API の作成

### 4.1 クライアント一覧・作成 API

**ファイルパス:** `app/api/clients/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClientSchema } from '@/lib/validations/client';

/**
 * GET /api/clients
 * クライアント一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('contract_date', { ascending: false });

    // 検索フィルター
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'クライアントの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * 新規クライアントを作成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, company, email, phone, contract_date, notes, prospect_id } = validation.data;

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name,
        company,
        email: email || null,
        phone: phone || null,
        contract_date: contract_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        prospect_id: prospect_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json(
        { error: 'クライアントの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 4.2 個別クライアント API

**ファイルパス:** `app/api/clients/[clientId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateClientSchema } from '@/lib/validations/client';

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/clients/[clientId]
 * クライアント詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (error || !client) {
      return NextResponse.json(
        { error: 'クライアントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/[clientId]
 * クライアントを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // 空文字を null に変換
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value === '') {
        updateData[key] = null;
      } else if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'クライアントの更新に失敗しました' },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: 'クライアントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[clientId]
 * クライアントを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json(
        { error: 'クライアントの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 4.3 リード→クライアント変換 API

**ファイルパス:** `app/api/clients/convert/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { convertToClientSchema } from '@/lib/validations/client';

/**
 * POST /api/clients/convert
 * リードをクライアントに変換（Won時）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = convertToClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { prospect_id, contract_date, notes } = validation.data;

    // リードを取得
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospect_id)
      .eq('user_id', user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    // 既にクライアントに変換済みかチェック
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('prospect_id', prospect_id)
      .single();

    if (existingClient) {
      return NextResponse.json(
        { error: 'このリードは既にクライアントに変換されています' },
        { status: 400 }
      );
    }

    // クライアントを作成
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: prospect.name,
        company: prospect.company,
        email: prospect.email,
        phone: prospect.phone,
        contract_date: contract_date || new Date().toISOString().split('T')[0],
        notes: notes || prospect.notes,
        prospect_id: prospect_id,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return NextResponse.json(
        { error: 'クライアントの作成に失敗しました' },
        { status: 500 }
      );
    }

    // リードのステータスを Won に更新
    const { error: updateError } = await supabase
      .from('prospects')
      .update({ status: 'won' })
      .eq('id', prospect_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating prospect status:', updateError);
      // クライアント作成は成功しているのでエラーはログのみ
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 確認ポイント

- [ ] `app/api/clients/route.ts` が作成された
- [ ] `app/api/clients/[clientId]/route.ts` が作成された
- [ ] `app/api/clients/convert/route.ts` が作成された

---

## Step 5: API ヘルパーとフックの作成

### 5.1 API ヘルパー

**ファイルパス:** `lib/api/clients.ts`

```typescript
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
```

### 5.2 useClients フック

**ファイルパス:** `lib/hooks/useClients.ts`

```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  convertProspectToClient,
} from '@/lib/api/clients';
import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  ConvertToClientInput,
} from '@/lib/types/client';

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // クライアント取得
  const loadClients = useCallback(async () => {
    if (!user) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchClients(searchQuery || undefined);
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('クライアントの取得に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, searchQuery]);

  // 初期読み込みと検索変更時の再読み込み
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // クライアント追加
  const addClient = useCallback(
    async (input: CreateClientInput) => {
      if (!user) return;

      try {
        const newClient = await createClient(input);
        setClients((prev) => [newClient, ...prev]);
        return newClient;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('クライアントの作成に失敗しました'));
        throw err;
      }
    },
    [user]
  );

  // クライアント更新
  const handleUpdateClient = useCallback(
    async (id: string, input: UpdateClientInput) => {
      try {
        const updated = await updateClient(id, input);
        setClients((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('クライアントの更新に失敗しました'));
        throw err;
      }
    },
    []
  );

  // クライアント削除
  const handleDeleteClient = useCallback(async (id: string) => {
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('クライアントの削除に失敗しました'));
      throw err;
    }
  }, []);

  // リード→クライアント変換
  const handleConvertProspect = useCallback(
    async (input: ConvertToClientInput) => {
      try {
        const newClient = await convertProspectToClient(input);
        setClients((prev) => [newClient, ...prev]);
        return newClient;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('クライアントへの変換に失敗しました'));
        throw err;
      }
    },
    []
  );

  // 統計情報
  const stats = useMemo(
    () => ({
      total: clients.length,
      thisMonth: clients.filter((c) => {
        const contractDate = new Date(c.contract_date);
        const now = new Date();
        return (
          contractDate.getMonth() === now.getMonth() &&
          contractDate.getFullYear() === now.getFullYear()
        );
      }).length,
    }),
    [clients]
  );

  return {
    clients,
    isLoading,
    error,
    searchQuery,
    stats,
    addClient,
    updateClient: handleUpdateClient,
    deleteClient: handleDeleteClient,
    convertProspect: handleConvertProspect,
    setSearchQuery,
    reload: loadClients,
  };
}
```

### 確認ポイント

- [ ] `lib/api/clients.ts` が作成された
- [ ] `lib/hooks/useClients.ts` が作成された

---

## Step 6: UI コンポーネントの作成

### 6.1 クライアントカード

**ファイルパス:** `components/clients/ClientCard.tsx`

```typescript
'use client';

import { Building2, Mail, Phone, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Client } from '@/lib/types/client';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{client.name}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
            <Building2 size={14} />
            <span className="truncate">{client.company}</span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical size={16} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white border rounded-md shadow-lg z-10">
              <button
                onClick={() => {
                  onEdit(client);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil size={14} />
                編集
              </button>
              <button
                onClick={() => {
                  onDelete(client.id);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                削除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-sm text-green-600">
          <Calendar size={14} />
          <span>契約日: {formatDate(client.contract_date)}</span>
        </div>
        {client.email && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Mail size={14} />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Phone size={14} />
            <span>{client.phone}</span>
          </div>
        )}
      </div>

      {client.notes && (
        <p className="mt-3 text-xs text-gray-500 line-clamp-2">{client.notes}</p>
      )}

      {client.prospect_id && (
        <div className="mt-3 pt-2 border-t">
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            リードから変換
          </span>
        </div>
      )}
    </div>
  );
}
```

### 6.2 クライアント一覧

**ファイルパス:** `components/clients/ClientList.tsx`

```typescript
'use client';

import { Building2, Mail, Phone, Calendar, Pencil, Trash2 } from 'lucide-react';
import type { Client } from '@/lib/types/client';

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientList({ clients, onEdit, onDelete }: ClientListProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        クライアントがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">名前</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">会社</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">契約日</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">連絡先</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">メモ</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{client.name}</span>
                  {client.prospect_id && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      変換
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Building2 size={14} />
                  <span>{client.company}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-green-600">
                  <Calendar size={14} />
                  <span>{formatDate(client.contract_date)}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="space-y-1">
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Mail size={14} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Phone size={14} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {!client.email && !client.phone && (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-500 line-clamp-1">
                  {client.notes || '-'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 6.3 クライアント追加フォーム

**ファイルパス:** `components/clients/AddClientForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CreateClientInput } from '@/lib/types/client';

interface AddClientFormProps {
  onAdd: (input: CreateClientInput) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export function AddClientForm({ onAdd, isOpen, onClose }: AddClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateClientInput>({
    name: '',
    company: '',
    email: '',
    phone: '',
    contract_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onAdd(formData);
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        contract_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">新規クライアント</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              契約日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.contract_date}
              onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

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
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {isSubmitting ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6.4 クライアント編集モーダル

**ファイルパス:** `components/clients/EditClientModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import type { Client, UpdateClientInput } from '@/lib/types/client';

interface EditClientModalProps {
  client: Client | null;
  onUpdate: (id: string, input: UpdateClientInput) => Promise<void>;
  onClose: () => void;
}

export function EditClientModal({ client, onUpdate, onClose }: EditClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateClientInput>({
    name: '',
    company: '',
    email: '',
    phone: '',
    contract_date: '',
    notes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        company: client.company,
        email: client.email || '',
        phone: client.phone || '',
        contract_date: client.contract_date,
        notes: client.notes || '',
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onUpdate(client.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!client) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">クライアントを編集</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              契約日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.contract_date}
              onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

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
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6.5 リード変換モーダル

**ファイルパス:** `components/clients/ConvertProspectModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import type { Prospect } from '@/lib/types/prospect';
import type { ConvertToClientInput } from '@/lib/types/client';

interface ConvertProspectModalProps {
  prospect: Prospect | null;
  onConvert: (input: ConvertToClientInput) => Promise<void>;
  onClose: () => void;
}

export function ConvertProspectModal({ prospect, onConvert, onClose }: ConvertProspectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contract_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onConvert({
        prospect_id: prospect.id,
        contract_date: formData.contract_date,
        notes: formData.notes || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!prospect) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">クライアントに変換</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">変換するリード:</p>
            <p className="font-medium text-gray-900">{prospect.name}</p>
            <p className="text-sm text-gray-600">{prospect.company}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              契約日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.contract_date}
              onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ（任意）
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="契約に関するメモ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

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
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <UserCheck size={18} />
              {isSubmitting ? '変換中...' : '成約として登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6.6 コンポーネントエクスポート

**ファイルパス:** `components/clients/index.ts`

```typescript
export { ClientCard } from './ClientCard';
export { ClientList } from './ClientList';
export { AddClientForm } from './AddClientForm';
export { EditClientModal } from './EditClientModal';
export { ConvertProspectModal } from './ConvertProspectModal';
```

### 確認ポイント

- [ ] `components/clients/ClientCard.tsx` が作成された
- [ ] `components/clients/ClientList.tsx` が作成された
- [ ] `components/clients/AddClientForm.tsx` が作成された
- [ ] `components/clients/EditClientModal.tsx` が作成された
- [ ] `components/clients/ConvertProspectModal.tsx` が作成された
- [ ] `components/clients/index.ts` が作成された

---

## Step 7: クライアント一覧ページの作成

**ファイルパス:** `app/(app)/clients/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { useClients } from '@/lib/hooks/useClients';
import {
  ClientList,
  AddClientForm,
  EditClientModal,
} from '@/components/clients';
import type { Client, CreateClientInput, UpdateClientInput } from '@/lib/types/client';

export default function ClientsPage() {
  const {
    clients,
    isLoading,
    error,
    searchQuery,
    stats,
    addClient,
    updateClient,
    deleteClient,
    setSearchQuery,
  } = useClients();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleAdd = async (input: CreateClientInput) => {
    await addClient(input);
  };

  const handleUpdate = async (id: string, input: UpdateClientInput) => {
    await updateClient(id, input);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このクライアントを削除しますか？')) {
      await deleteClient(id);
    }
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
      {/* 統計情報 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Users size={20} />
            <span className="text-sm">総クライアント数</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 mb-1">今月の新規</p>
          <p className="text-2xl font-bold text-green-700">{stats.thisMonth}</p>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前・会社名で検索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus size={18} />
          <span>新規クライアント</span>
        </button>
      </div>

      {/* クライアント一覧 */}
      <div className="bg-white rounded-lg border">
        <ClientList
          clients={clients}
          onEdit={setEditingClient}
          onDelete={handleDelete}
        />
      </div>

      {/* 追加フォーム */}
      <AddClientForm
        isOpen={isAddFormOpen}
        onAdd={handleAdd}
        onClose={() => setIsAddFormOpen(false)}
      />

      {/* 編集モーダル */}
      <EditClientModal
        client={editingClient}
        onUpdate={handleUpdate}
        onClose={() => setEditingClient(null)}
      />
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/clients/page.tsx` が作成された

---

## Step 8: 失注リード一覧ページの作成

**ファイルパス:** `app/(app)/leads/lost/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Calendar } from 'lucide-react';
import type { Prospect } from '@/lib/types/prospect';

export default function LostLeadsPage() {
  const [lostProspects, setLostProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLostProspects() {
      try {
        const response = await fetch('/api/prospects?status=lost');
        if (!response.ok) {
          throw new Error('失注リードの取得に失敗しました');
        }
        const data = await response.json();
        setLostProspects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLostProspects();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP');
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
        エラー: {error}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">失注リード</h1>
          <p className="text-sm text-gray-500">失注した案件の分析・振り返り用</p>
        </div>
      </div>

      {/* 統計 */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
        <p className="text-sm text-red-600">失注件数</p>
        <p className="text-3xl font-bold text-red-700">{lostProspects.length}</p>
      </div>

      {/* リスト */}
      {lostProspects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
          失注リードはありません
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">名前</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">会社</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">失注日</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">メモ</th>
              </tr>
            </thead>
            <tbody>
              {lostProspects.map((prospect) => (
                <tr key={prospect.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {prospect.name}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Building2 size={14} />
                      <span>{prospect.company}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar size={14} />
                      <span>{formatDate(prospect.updated_at)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {prospect.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/leads/lost/page.tsx` が作成された

---

## Step 9: ナビゲーションの更新

**ファイルパス:** `app/(app)/layout.tsx` に追加

```typescript
import {
  LayoutDashboard,
  LogOut,
  CheckSquare,
  Users,
  Briefcase,  // 追加
  type LucideIcon,
} from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/tasks', label: 'タスク', icon: CheckSquare },
  { href: '/leads', label: 'リード', icon: Users },
  { href: '/clients', label: 'クライアント', icon: Briefcase },  // 追加
];
```

### 確認ポイント

- [ ] ナビゲーションに「クライアント」リンクが追加された

---

## Step 10: リードページに変換ボタンを追加

**ファイルパス:** `app/(app)/leads/page.tsx` に変換機能を追加

リード一覧ページに、リードをクライアントに変換するボタンを追加します。

```typescript
// インポートに追加
import { ConvertProspectModal } from '@/components/clients';
import { useClients } from '@/lib/hooks/useClients';

// コンポーネント内に追加
const { convertProspect } = useClients();
const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);

const handleConvert = async (input: ConvertToClientInput) => {
  await convertProspect(input);
  // リードのリストを更新
  reload();
};

// JSX に追加（EditProspectModal の後）
<ConvertProspectModal
  prospect={convertingProspect}
  onConvert={handleConvert}
  onClose={() => setConvertingProspect(null)}
/>
```

### 確認ポイント

- [ ] リードページに変換機能が追加された

---

## Step 11: 型チェックとビルド確認

```bash
# 型チェック
npm run type-check

# ビルド確認
npm run build
```

### 確認ポイント

- [ ] `npm run type-check` がエラーなしで完了
- [ ] `npm run build` がエラーなしで完了

---

## Step 12: 動作確認

### 12.1 クライアント機能テスト

1. クライアント作成
   - [ ] 新規クライアントが作成できる
   - [ ] 必須項目（名前、会社名、契約日）がバリデーションされる

2. クライアント一覧
   - [ ] クライアント一覧が表示される
   - [ ] 検索が動作する
   - [ ] 統計情報が表示される

3. クライアント編集・削除
   - [ ] 編集モーダルが開く
   - [ ] 更新が反映される
   - [ ] 削除確認後に削除される

### 12.2 リード変換テスト

1. リード→クライアント変換
   - [ ] リードから「成約」ボタンでクライアントに変換できる
   - [ ] 変換後、リードのステータスが「Won」になる
   - [ ] クライアント一覧に表示される
   - [ ] 「リードから変換」バッジが表示される

### 12.3 失注リード確認

- [ ] 失注リード一覧ページが表示される
- [ ] Lost ステータスのリードのみ表示される

### 12.4 RLS確認

- [ ] 自分のクライアントのみ表示される
- [ ] 他ユーザーのクライアントにはアクセスできない

---

## 完了チェックリスト

### データベース設定

- [ ] `clients` テーブルが作成された
- [ ] RLS ポリシーが設定された（4件）
- [ ] インデックスが作成された
- [ ] `prospect_id` 外部キーが設定された

### ファイル作成

- [ ] `lib/types/client.ts` - クライアント型定義
- [ ] `lib/validations/client.ts` - Zod バリデーション
- [ ] `app/api/clients/route.ts` - 一覧・作成 API
- [ ] `app/api/clients/[clientId]/route.ts` - 詳細・更新・削除 API
- [ ] `app/api/clients/convert/route.ts` - 変換 API
- [ ] `lib/api/clients.ts` - API ヘルパー
- [ ] `lib/hooks/useClients.ts` - クライアントフック
- [ ] `components/clients/ClientCard.tsx` - カード
- [ ] `components/clients/ClientList.tsx` - 一覧
- [ ] `components/clients/AddClientForm.tsx` - 追加フォーム
- [ ] `components/clients/EditClientModal.tsx` - 編集モーダル
- [ ] `components/clients/ConvertProspectModal.tsx` - 変換モーダル
- [ ] `components/clients/index.ts` - エクスポート
- [ ] `app/(app)/clients/page.tsx` - クライアント一覧ページ
- [ ] `app/(app)/leads/lost/page.tsx` - 失注リード一覧ページ

### ファイル修正

- [ ] `lib/types/database.ts` - クライアント型追加
- [ ] `app/(app)/layout.tsx` - ナビゲーション更新
- [ ] `app/(app)/leads/page.tsx` - 変換機能追加（任意）

### 機能確認

- [ ] クライアント作成ができる
- [ ] クライアント一覧が表示される
- [ ] クライアント編集・削除ができる
- [ ] リード→クライアント変換ができる
- [ ] 失注リード一覧が表示される
- [ ] RLS が正しく機能する

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 7 が完了したら、以下の拡張が可能：
- クライアント詳細ページ
- 契約金額・売上管理
- 請求書発行機能
- クライアント別活動履歴
- ダッシュボードに顧客分析グラフ

---

## トラブルシューティング

### 変換時に「既にクライアントに変換されています」エラー

```sql
-- 重複チェック
SELECT * FROM clients WHERE prospect_id = 'リードID';

-- 強制削除（テスト用）
DELETE FROM clients WHERE prospect_id = 'リードID';
```

### RLS でアクセス拒否される

```sql
-- ポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'clients';

-- user_id の確認
SELECT auth.uid();
```

### 外部キー制約エラー

```sql
-- リードが存在するか確認
SELECT * FROM prospects WHERE id = 'リードID';

-- 外部キーを NULL にして作成
INSERT INTO clients (user_id, name, company, contract_date)
VALUES ('user-id', '名前', '会社', '2024-01-01');
```

### 契約日の形式エラー

- 日付は `YYYY-MM-DD` 形式で送信
- `new Date().toISOString().split('T')[0]` を使用
