# SECURITY-DB-DETAIL.md - FDCセキュリティ・DB設計詳細

> **注**: 本ドキュメントは `FDC-GRAND-GUIDE.md` から分離されたセキュリティ・DB設計の詳細記録です。
> コア開発ガイドは `docs/FDC-CORE.md` を参照してください。

---

## 1. データベース設計

### 1.1 主要テーブル

#### users（ユーザー管理）
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_sub TEXT UNIQUE NOT NULL,  -- Google OAuth識別子
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  system_role TEXT NOT NULL DEFAULT 'USER',   -- 'SA' / 'USER' / 'TEST'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### workspaces（ワークスペース）
```sql
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### workspace_members（メンバー管理）
```sql
CREATE TABLE workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'admin', 'member', 'viewer'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
```

#### workspace_data（暗号化データ保存）
```sql
CREATE TABLE workspace_data (
  workspace_id INTEGER PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  data JSONB NOT NULL, -- 暗号化されたAppData
  version INTEGER DEFAULT 1, -- 楽観的排他制御用
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### workspace_keys（暗号鍵管理）
```sql
CREATE TABLE workspace_keys (
  workspace_id INTEGER PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  encrypted_key JSONB NOT NULL, -- {version, iv, authTag, ciphertext}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### audit_logs（監査ログ）
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id),
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,              -- 'create', 'update', 'delete', etc.
  resource_type TEXT NOT NULL,       -- 'lead', 'client', 'workspace', etc.
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### sessions（セッション管理）
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                -- セッションID（UUID v4）
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,      -- デフォルト7日間
  revoked_at TIMESTAMP                -- NULL = 有効、NOT NULL = 無効化済み
);

-- インデックス
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at);
```

---

## 2. 認可アーキテクチャ（RLSバイパス設計）

### 2.1 設計方針（サーバーサイドアーキテクチャ）

**現在の実装：SERVICE_ROLE_KEY使用によるRLSバイパス**

> **重要**: RLSポリシーはマイグレーションで定義されていますが、すべてのDB操作で
> `SERVICE_ROLE_KEY`を使用しているため、**実質的にRLSはバイパス**されています。
> 認可はアプリケーション層（Next.js API Routes）で実装されています。

```sql
-- RLSポリシーは定義済みだが、SERVICE_ROLE_KEY使用でバイパス
-- 認可はアプリケーション層で実装
```

**理由:**
1. **すべてのDB操作がサーバーサイド（Next.js API Routes）経由**
   - クライアントから直接 Supabase にアクセスしない
   - ANON_KEY はクライアント認証のみに使用
   - データ操作には SERVICE_ROLE_KEY を使用

2. **認証チェックは Next.js で実装済み**
   ```typescript
   // lib/server/auth.ts
   export async function getSession(request: NextRequest): Promise<User | null> {
     const sessionToken = request.cookies.get('fdc_session')?.value;
     if (!sessionToken) return null;
     // Supabase SDK でセッション検証...
   }
   ```

3. **SERVICE_ROLE_KEY の安全な使用**
   - 環境変数で管理（Vercel 暗号化ストレージ）
   - サーバーサイドでのみ使用（クライアントに露出しない）

### 2.2 セキュリティ層の実装

| レイヤー | 実装 | 説明 |
|---------|------|------|
| **認証** | `getSession()` | HTTPOnly Cookie でセッション検証 |
| **認可** | API Route 内チェック | ワークスペースメンバーシップ検証 |
| **監査** | `audit_logs` テーブル | すべての操作を記録 |
| **暗号化** | `workspace_data` | AES-256-GCM で暗号化 |

### 2.3 将来のRLS拡張

RLS が必要になるケース：
- Realtime Subscriptions の導入
- モバイルアプリの追加
- エッジ関数での処理

---

## 3. 認証設計（Supabase Auth + カスタムセッション管理）

### 3.1 認証フロー

```
1. [クライアント] "Google でログイン" クリック
   ↓ app/login/page.tsx
2. [Supabase Auth] PKCE フロー開始（ANON_KEY 使用）
   ↓ Google OAuth 画面へリダイレクト
3. [Google] ユーザー認証 → 認可コード発行
   ↓ /api/auth/callback にリダイレクト
4. [サーバー] PKCE コード交換（ANON_KEY）
   ↓ app/api/auth/callback/route.ts
5. [サーバー] ユーザー情報を DB に保存（SERVICE_ROLE_KEY）
   ↓ Supabase SDK (HTTPS) で users テーブルに upsert
6. [サーバー] FDC セッション作成（SERVICE_ROLE_KEY）
   ↓ Supabase SDK (HTTPS) で sessions テーブルに insert
7. [サーバー] fdc_session Cookie 設定
   ↓ HttpOnly, Secure, SameSite=Lax
8. [クライアント] /dashboard にリダイレクト
```

### 3.2 実装の特徴

**1. 二段階の Key 使用:**
- **ANON_KEY**: クライアント認証（PKCE）のみ
- **SERVICE_ROLE_KEY**: DB 操作（RLS バイパス）

**2. 完全 HTTPS 化:**
```typescript
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// すべての DB 操作が HTTPS 経由
await supabaseAdmin.from('users').upsert(...);
await supabaseAdmin.from('sessions').insert(...);
```

**3. セキュリティ層:**
| レイヤー | 実装箇所 | 説明 |
|---------|---------|------|
| **HTTPOnly Cookie** | `app/api/auth/callback` | JavaScript からアクセス不可 |
| **SameSite=Lax** | Cookie 設定 | CSRF 対策 |
| **Secure フラグ** | 本番環境のみ | HTTPS 強制 |
| **セッション有効期限** | 7日間 | `expires_at` カラムで管理 |

### 3.3 Cookie 仕様
```typescript
response.cookies.set('fdc_session', sessionToken, {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7, // 7日間
});
```

---

## 4. 認可（RBAC - Role-Based Access Control）

### 4.1 システムロール（users.system_role）- 3値
- **SA**: システム管理者（全WSアクセス可、ユーザー管理権限）
- **USER**: 正式ユーザー（所属WSのみアクセス可）
- **TEST**: 試用期間ユーザー（機能制限付き）

### 4.2 ワークスペースロール（workspace_members.role）- 3値
- **OWNER**: WS全体管理者（削除含むすべての権限）
- **ADMIN**: メンバー管理、データ編集
- **MEMBER**: データ閲覧・編集

### 4.3 ロール別権限マトリクス

| 機能 | SA | OWNER | ADMIN | MEMBER | TEST |
|-----|-----|-------|-------|--------|------|
| Dashboard表示 | R/W | R/W | R/W | R/W | R（制限付き） |
| MVV/Brand編集 | R/W | R/W | R/W | R | R |
| Leads/Clients閲覧 | R/W | R/W | R/W | R/W | R（制限付き） |
| Templates管理 | R/W | R/W | R/W | 利用のみ | 利用のみ |
| Reports閲覧 | R（全体） | R（全体） | R（WS） | R（個人） | R（制限付き） |
| Cross-WS Reports | R | R | ❌ | ❌ | ❌ |
| Settings | R/W | R/W | R/W | ❌ | ❌ |
| Admin（WS管理） | R/W | R/W | R/W（MEMBER管理） | ❌ | ❌ |
| SAダッシュボード | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 5. 暗号化（AES-256-GCM）

### 5.1 2層暗号化構造

```
[マスター鍵]（環境変数: MASTER_ENCRYPTION_KEY）
    ↓ 暗号化
[ワークスペース鍵]（workspace_keys テーブル）
    ↓ 暗号化
[ワークスペースデータ]（workspace_data.data）
```

### 5.2 暗号化仕様
- **アルゴリズム**: AES-256-GCM（認証付き暗号化）
- **鍵長**: 256ビット（32バイト）
- **IV長**: 128ビット（16バイト）
- **認証タグ長**: 128ビット（16バイト）

### 5.3 暗号化データ形式（EncryptedData）
```typescript
{
  version: 1,           // スキーマバージョン
  iv: "...",            // 初期化ベクトル（Base64）
  authTag: "...",       // 認証タグ（Base64）
  ciphertext: "..."     // 暗号文（Base64）
}
```

### 5.4 主要関数（lib/server/encryption.ts）
- `generateWorkspaceKey()`: 32バイトランダム鍵生成
- `encrypt(plaintext, key)`: データ暗号化
- `decrypt(encrypted, key)`: データ復号
- `createWorkspaceKey(workspaceId)`: WS鍵生成・保存
- `getWorkspaceKey(workspaceId)`: WS鍵取得
- `rotateWorkspaceKey(workspaceId)`: 鍵ローテーション

---

## 6. セキュリティハーデニング

### 6.1 実装済み対策
- ⚠️ Row Level Security (RLS) - ポリシー定義済みだが **SERVICE_ROLE_KEY使用のため実質バイパス**（アプリケーション層で認可）
- ✅ レート制限（API別に5〜60リクエスト/分）
- ✅ XSS対策（Content Security Policy）
- ✅ CSRF対策
- ✅ 入力バリデーション強化
- ✅ セキュリティヘッダー設定
- ✅ SQL インジェクション対策（Parameterized Queries）
- ✅ 監査ログ（全重要操作を記録）

### 6.2 セキュリティヘッダー（next.config.mjs）
```javascript
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

---

## 7. Workspace機能

### 7.1 概念
- **Workspace** = 1つの企業または組織単位
- 各ユーザーは1つ以上のワークスペースに所属可能
- すべてのデータは `workspace_id` で分離

### 7.2 機能
1. **作成**: オーナーとして新規WS作成（自動で暗号鍵生成）
2. **切替**: 所属WS間の切替
3. **メンバー管理**: メンバー追加・削除・ロール変更（owner/admin権限）
4. **データ分離**: RBAC + 暗号化の2層防御

---

## 8. 監査ログ機能

### 8.1 記録対象
- ワークスペース作成・削除
- メンバー追加・削除・ロール変更
- データ更新（Leads, Clients, Templates等）
- 暗号鍵の作成・ローテーション
- ログイン・ログアウト
- 権限変更

### 8.2 API
- `GET /api/audit-logs?workspaceId={id}&limit={n}&offset={n}` - 監査ログ取得
- 内部関数: `createAuditLog()` - ログ記録

---

## 9. レポート機能

### 9.1 ロール別レポート

#### SA/OWNER向け
- 全体KPI（総見込み客数、商談中、成約数、コンバージョン率）
- ファネル統計
- チャネル統計
- チームパフォーマンス
- Cross-WS レポート

#### ADMIN向け
- ワークスペースKPI
- ファネル統計
- チームパフォーマンス

#### MEMBER向け
- 個人パフォーマンス
- 自分のリード・顧客・TODO

### 9.2 エクスポート機能
- **CSV形式**でレポートをエクスポート
- UTF-8 BOM付き（Excel対応）
- エクスポート種別: KPI / メンバー / 監査ログ

---

**Last Updated**: 2025-11-30
**Source**: FDC-GRAND-GUIDE.md（分割）
