# Phase 8-1: Workspace暗号化方針設計

**Version:** 1.0
**作成日:** 2025-11-13
**ステータス:** 設計中（レビュー待ち）
**担当:** Claude Code

---

## 📋 目次

1. [概要・目的](#概要目的)
2. [現状分析](#現状分析)
3. [暗号方式・キー階層](#暗号方式キー階層)
4. [API/フロント責務分担](#apiフロント責務分担)
5. [ロール別アクセスルール](#ロール別アクセスルール)
6. [8-2以降の改修計画](#8-2以降の改修計画)
7. [RLS/監査ログ連携](#rls監査ログ連携)
8. [リスク・考慮事項](#リスク考慮事項)

---

## 概要・目的

### Phase 8 のゴール

Workspace データをサーバー側（Vercel Postgres）で**完全暗号化**し、以下を実現する：

- 顧客データ・営業情報の保護（DB管理者でも復号不可）
- ローカル localStorage は一時キャッシュに限定
- Phase 9（AI自走ワークフロー統合）に備えたクラウドファースト構造

### Phase 8-1 の目的

**暗号化の全体方針を確定し、8-2以降の実装タスクを明確化する。**

---

## 現状分析

### データフロー（Phase 7時点）

```
[フロントエンド]
  ↓ 平文JSON (AppData)
[API: /api/workspaces/{id}/data]
  ↓ 平文JSON
[Postgres: workspace_data]
  data JSONB NOT NULL  ← 平文保存！
```

### 問題点

1. **機密情報が平文で保存**
   - 顧客名・連絡先・商談メモ・売上情報が暗号化されていない
   - DB管理者・バックアップファイル漏洩時のリスク

2. **localStorage も平文**
   - ブラウザのローカルストレージに平文キャッシュ
   - デバイス紛失・共有PC利用時のリスク

3. **暗号化なしでクラウドファースト移行は危険**
   - Phase 9でAIと連携する際、データ保護が不十分

### 既存のセキュリティ対策（継続利用）

- ✅ Google OAuth 認証
- ✅ RLS（Row Level Security）によるDB レベルアクセス制御
- ✅ 監査ログ（audit_logs テーブル）
- ✅ レート制限（rate-limit.ts）

**Phase 8では、これらに「暗号化」を追加する。**

---

## 暗号方式・キー階層

### 採用する暗号方式

**AES-256-GCM（Galois/Counter Mode）**

- **理由**:
  - 認証付き暗号化（改ざん検知）
  - パフォーマンス良好（ハードウェアアクセラレーション対応）
  - Node.js標準（`crypto.createCipheriv('aes-256-gcm', ...)`）
  - NIST推奨・業界標準

### キー階層設計

```
[レベル1: マスター鍵]
  MASTER_ENCRYPTION_KEY (環境変数)
  ↓ 暗号化
[レベル2: Workspace鍵]
  workspace_keys テーブル
    - workspace_id: INTEGER
    - encrypted_key: TEXT (Base64)
    - created_at: TIMESTAMP
  ↓ 復号（API実行時）
[レベル3: データ暗号化]
  workspace_data.data (暗号化済みJSON)
    - ciphertext: 暗号文
    - iv: 初期化ベクトル
    - authTag: 認証タグ
```

### キー管理の詳細

#### 1. マスター鍵（Master Encryption Key）

- **保存場所**: Vercel環境変数 `MASTER_ENCRYPTION_KEY`
- **生成方法**: `openssl rand -base64 32` で生成
- **用途**: Workspace鍵を暗号化・復号するためのキー
- **ローテーション**: 年1回（手動）

#### 2. Workspace鍵（Workspace Encryption Key）

- **保存場所**: `workspace_keys` テーブル（マスター鍵で暗号化）
- **生成タイミング**: Workspace作成時に自動生成
- **用途**: 各Workspaceのデータを暗号化・復号
- **ライフサイクル**: Workspace削除時に同時削除

#### 3. 初期化ベクトル（IV）

- **生成**: 暗号化ごとにランダム生成（`crypto.randomBytes(16)`）
- **保存**: 暗号化データと一緒に保存（`{iv, ciphertext, authTag}`）

### データ構造（暗号化後）

```json
{
  "workspace_id": 1,
  "data": {
    "version": 1,
    "iv": "random16bytes_base64",
    "authTag": "authTag16bytes_base64",
    "ciphertext": "encrypted_json_base64"
  },
  "updated_at": "2025-11-13T10:00:00Z"
}
```

**復号後の `ciphertext`:**

```json
{
  "workspaceId": "1",
  "mvv": {...},
  "okr": {...},
  "prospects": [...],
  "clients": [...],
  "templates": {...}
}
```

---

## API/フロント責務分担

### サーバー側（API）の責務

#### `/api/workspaces/{id}/data` (PUT)

1. ユーザー認証（`verifyGoogleIdToken`）
2. RLS設定（`setRLSUserId`）
3. 認可チェック（`assertWorkspaceAccess`）
4. **Workspace鍵の取得**（`getWorkspaceKey(workspaceId)`）
5. **データの暗号化**（`encrypt(JSON.stringify(data), workspaceKey)`）
6. 暗号化済みデータをDB保存
7. 監査ログ記録（`workspace_data_encrypted`）

#### `/api/workspaces/{id}/data` (GET)

1. ユーザー認証
2. RLS設定
3. 認可チェック
4. 暗号化済みデータをDB取得
5. **Workspace鍵の取得**
6. **データの復号**（`decrypt(encryptedData, workspaceKey)`）
7. 復号済みデータを返却
8. 監査ログ記録（`workspace_data_decrypted`）

#### 新規API: `/api/workspaces/{id}/key` (GET)

- **用途**: Workspace鍵をフロントエンドに配布（セッション管理用、オプション）
- **認可**: member 以上
- **返却**: 復号済みWorkspace鍵（Base64）

### フロントエンド（Client）の責務

#### 基本方針: **サーバー側で暗号化・復号を完結**

- フロントエンドは**平文データ**のみ扱う
- 暗号化処理はサーバー側に委譲
- localStorage は平文キャッシュ（漏洩リスクは限定的）

#### データフロー

```
[フロント]
  ↓ 平文 AppData
[apiClient.saveWorkspaceData()]
  ↓ HTTP PUT (平文JSON)
[API]
  ↓ 暗号化
[Postgres: workspace_data]
  暗号化済みデータ保存

---

[Postgres: workspace_data]
  ↓ 暗号化済みデータ取得
[API]
  ↓ 復号
[apiClient.loadWorkspaceData()]
  ↓ 平文 AppData
[フロント]
```

#### localStorage の扱い

- **用途**: オフライン時・API障害時のフォールバック
- **保存形式**: 平文（暗号化しない）
- **リスク評価**: デバイス紛失リスクはあるが、以下の理由で許容
  - サーバー側データは暗号化済み
  - localStorage は一時キャッシュに限定
  - ユーザーはログアウト時に localStorage クリアを推奨

#### 将来的な拡張（Phase 8-4, オプション）

**Worker での非同期復号**（大容量データ対応）

```javascript
// js/workers/sync-worker.ts
self.onmessage = async (event) => {
  const { encryptedData, workspaceKey } = event.data;
  const decrypted = await decrypt(encryptedData, workspaceKey);
  self.postMessage({ success: true, data: decrypted });
};
```

---

## ロール別アクセスルール

### Workspace Key へのアクセス制御

| ロール | データ閲覧 | データ編集 | Key取得 | Key管理 |
|--------|-----------|-----------|---------|---------|
| **owner** | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ❌ |
| **member** | ✅ | ✅ | ✅ | ❌ |
| **viewer** | ✅ | ❌ | ✅ | ❌ |

### RLS ポリシーとの統合

既存のRLS ポリシーは**引き続き有効**：

```sql
-- workspace_data テーブルのRLS（Phase 7で実装済み）
CREATE POLICY workspace_data_select_member ON workspace_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = workspace_data.workspace_id
        AND wm.user_id::text = current_setting('app.current_user_id', true)
    )
  );
```

**暗号化は追加の防御層として機能する（多層防御）。**

### 監査ログの記録

以下の操作を `audit_logs` テーブルに記録：

```typescript
await createAuditLog({
  workspaceId,
  userId,
  action: 'workspace_data_encrypted', // または 'workspace_data_decrypted'
  resourceType: 'workspace_data',
  resourceId: workspaceId,
  details: {
    dataSize: dataStr.length,
    encryptionMethod: 'AES-256-GCM'
  }
});
```

---

## 8-2以降の改修計画

### 8-2: 暗号鍵管理モジュール実装

#### 新規ファイル

- `api/_lib/encryption.ts`: AES-256-GCM暗号化/復号ロジック
  - `encrypt(plaintext: string, key: Buffer): EncryptedData`
  - `decrypt(encrypted: EncryptedData, key: Buffer): string`
  - `generateWorkspaceKey(): Buffer`

- `api/_lib/keyManagement.ts`: Workspace鍵管理
  - `createWorkspaceKey(workspaceId: string): Promise<void>`
  - `getWorkspaceKey(workspaceId: string): Promise<Buffer>`
  - `deleteWorkspaceKey(workspaceId: string): Promise<void>`

#### DB マイグレーション

```sql
-- migrations/002-workspace-keys.sql
CREATE TABLE workspace_keys (
  workspace_id INTEGER PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,  -- Base64エンコード済み
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workspace_keys_workspace_id ON workspace_keys(workspace_id);
```

#### ユニットテスト

- `tests/unit/encryption.test.ts`
- `tests/unit/keyManagement.test.ts`

#### 完了条件（DOD）

- ✅ `encrypt()` / `decrypt()` が正常動作
- ✅ ランダムIV対応
- ✅ 復号失敗時のエラーハンドリング
- ✅ ユニットテスト全てパス
- ✅ ChatGPTセキュリティレビュー承認

---

### 8-3: サーバー保存プロトコル整備

#### 改修ファイル

- `api/workspaces/[workspaceId]/data.ts`
  - PUT: 保存前に暗号化
  - GET: 取得後に復号

- `api/_lib/db.ts`
  - `saveWorkspaceData()`: 暗号化データを受け取る仕様に変更
  - `getWorkspaceData()`: 暗号化データを返す仕様に変更

- `api/workspaces/index.ts`
  - POST: Workspace作成時に鍵を自動生成

#### 実装例

```typescript
// api/workspaces/[workspaceId]/data.ts (PUT)

// 1. Workspace鍵取得
const workspaceKey = await getWorkspaceKey(workspaceId);

// 2. データ暗号化
const encryptedData = encrypt(JSON.stringify(body.data), workspaceKey);

// 3. DB保存
await saveWorkspaceData(workspaceId, encryptedData);

// 4. 監査ログ
await createAuditLog({
  workspaceId,
  userId: user.id,
  action: 'workspace_data_encrypted',
  resourceType: 'workspace_data',
  resourceId: workspaceId,
  details: { dataSize: JSON.stringify(body.data).length }
});
```

#### 完了条件（DOD）

- ✅ 保存前に必ず暗号化される
- ✅ 取得時に必ず復号される
- ✅ 暗号化漏れチェックのテスト追加
- ✅ エラーハンドリング（鍵取得失敗・復号失敗）
- ✅ 既存E2Eテスト全てパス

---

### 8-4: フロント復号・同期Worker統合（オプション）

#### 新規ファイル

- `js/workers/sync-worker.ts`: 非同期復号処理

#### 改修ファイル

- `js/core/apiClient.ts`: Worker統合（大容量データ対応）

#### 実装方針

**基本: サーバー側で復号**（Phase 8-3で完結）
**オプション: フロント側Worker復号**（大容量データのみ）

```typescript
// 大容量データ（1MB以上）の場合のみWorker使用
if (dataSize > 1024 * 1024) {
  const worker = new Worker('/js/workers/sync-worker.js');
  worker.postMessage({ encryptedData, workspaceKey });
  worker.onmessage = (event) => {
    setAppData(event.data.data);
  };
} else {
  // 通常はサーバー側で復号済みデータを受け取る
  setAppData(response.data);
}
```

#### 完了条件（DOD）

- ✅ Worker で非同期復号が正常動作
- ✅ 大容量JSON（1-2MB）でも処理完了
- ✅ フリーズしない
- ✅ オフライン→オンライン同期も正常

---

### 8-5: Workspace切替・同期安定化

#### 改修ファイル

- `js/core/apiClient.ts`
- `js/tabs/dashboard.ts`（Workspace切替UI）

#### 実装内容

- Race condition 対策（切替中の重複リクエスト防止）
- エラーリカバリー強化
- E2Eテスト（複数Workspace間の切替）

#### 完了条件（DOD）

- ✅ WorkspaceID切替時のrace condition解消
- ✅ `APP_STATE.currentWorkspace` が常時正確
- ✅ タブ単位のローカルキャッシュが破綻しない
- ✅ E2E: EXEC → MANAGER → MEMBER の全操作が安定

---

### 8-6: セキュリティ検証・最終統合レビュー

#### レビュー項目

- 暗号化→サーバー保存→復号→同期が全て連動
- 暗号鍵が外部漏洩しない設計
- DB側はまだRLSなし（8-7のため）
- Phase 8 全体の統合レポート（1枚）作成
- 人間（ユーザー）の承認取得

#### 完了条件（DOD）

- ✅ ChatGPTセキュリティレビュー完了
- ✅ 統合レポート作成
- ✅ 人間承認取得

---

### 8-7: RLSマイグレーション適用 & 本番DB切替

#### 実施内容

- テストDBでRLS適用・検証
- 本番DBへRLS適用
- 動作確認・ロールバック手順確認

#### 完了条件（DOD）

- ✅ テストDBでRLS完全機能確認
- ✅ 自分のWorkspaceのデータだけ見える状態
- ✅ 本番適用→動作確認
- ✅ ロールバック手順書（1枚）準備
- ✅ 最終セキュリティレビュー（ChatGPT）完了

---

## RLS/監査ログ連携

### RLS との関係

- **RLS**: DBレベルのアクセス制御（第1層）
- **暗号化**: データレベルの保護（第2層）

**多層防御（Defense in Depth）を実現。**

### 監査ログの拡張

既存の `audit_logs` テーブルに以下のアクションを追加：

| action | 説明 |
|--------|------|
| `workspace_data_encrypted` | データ暗号化時 |
| `workspace_data_decrypted` | データ復号時 |
| `workspace_key_created` | Workspace鍵生成時 |
| `workspace_key_rotated` | 鍵ローテーション時 |

### setRLSUserId() の継続利用

全てのAPIエンドポイントで**引き続き必須**：

```typescript
// ユーザー認証
const user = await getUserByGoogleSub(payload.sub);

// RLS設定（必須）
await setRLSUserId(user.id);

// この後のDBクエリにRLSポリシーが自動適用
```

---

## リスク・考慮事項

### リスク管理

#### 1. マスター鍵の漏洩

**リスク**: マスター鍵が漏洩すると全Workspace鍵が復号可能

**対策**:
- 環境変数として厳重管理（Vercel Dashboard）
- `.env` ファイルは `.gitignore` に追加
- 定期的なローテーション（年1回）

#### 2. パフォーマンス低下

**リスク**: 暗号化・復号処理によるレイテンシ増加

**対策**:
- AES-256-GCMはハードウェアアクセラレーション対応（高速）
- データサイズ < 1MB であれば影響は軽微（<10ms）
- 大容量データはWorkerで非同期処理（8-4）

#### 3. 鍵管理の複雑性

**リスク**: Workspace鍵の管理ミスによるデータ復旧不可

**対策**:
- 鍵のバックアップ機能（`workspace_keys` テーブルのエクスポート）
- ロールバック手順の明確化
- テスト環境での十分な検証

#### 4. 既存データのマイグレーション

**リスク**: Phase 7で保存された平文データの扱い

**対策**:
- 初回アクセス時に自動暗号化（マイグレーション処理）
- データ損失防止のため、平文データも一定期間保持
- バックアップ取得後にマイグレーション実行

### 考慮事項

#### localStorage の平文保存

**決定**: 暗号化しない（現行のまま）

**理由**:
- サーバー側データは暗号化済み（主要リスクは軽減）
- フロント暗号化はパフォーマンス・UX悪化
- デバイス紛失リスクはユーザー教育で対応

#### フロント側暗号化の将来対応

Phase 9以降で必要に応じて検討：
- Web Crypto API を使用したlocalStorage暗号化
- IndexedDB を使用した大容量データ管理

---

## 承認プロセス

### Phase 8-1 完了条件

- ✅ 本ドキュメント作成
- ✅ ChatGPTレビュー完了（セキュリティ観点）
- ✅ 人間開発者承認

### 次のステップ

承認後、**Phase 8-2（暗号鍵管理モジュール実装）**に進む。

---

**作成日**: 2025-11-13
**作成者**: Claude Code (Phase 8-1)
**バージョン**: 1.0
**次回レビュー**: Phase 8-2 開始前
