# Phase 15-A: Google Token Encryption Runbook

**Version:** 1.0
**Date:** 2024-12-04
**Status:** Implemented
**Author:** Claude Code (Phase 15-A)

---

## 1. 目的

Google リフレッシュトークン（refresh_token）をアプリ層で暗号化し、以下のセキュリティリスクを軽減する:

- **DB ダンプ流出時**: 暗号化データのみが流出し、平文トークンは取得不可
- **Service Role Key 漏えい時**: 暗号鍵がなければトークン復号不可
- **内部関係者アクセス時**: DB 管理者でも平文トークンにアクセス不可

---

## 2. 暗号方式と鍵管理

### 2-1. 暗号方式

| 項目 | 仕様 |
|------|------|
| アルゴリズム | AES-256-GCM |
| 鍵長 | 256ビット（32バイト） |
| IV（nonce） | 16バイト、毎回ランダム生成 |
| 認証タグ | 16バイト |
| エンコード | Hex（IV, authTag, ciphertext） |

### 2-2. 暗号化データ形式

**新形式（Phase 15-A 以降）:**
```json
{
  "formatVersion": 1,
  "keyVersion": "v1",
  "iv": "hex_string_32chars",
  "authTag": "hex_string_32chars",
  "ciphertext": "hex_string_variable"
}
```

**旧形式（Phase 14.6.4）:** 互換性のため引き続き復号可能
```json
{
  "version": 1,
  "iv": "hex_string",
  "authTag": "hex_string",
  "ciphertext": "hex_string"
}
```

### 2-3. 環境変数

| 環境変数名 | 用途 | 形式 |
|-----------|------|------|
| `FDC_GOOGLE_TOKEN_KEY_V1` | v1 暗号鍵（推奨） | Base64 or Hex（32バイト） |
| `MASTER_ENCRYPTION_KEY` | v1 フォールバック鍵 | Base64 or Hex（32バイト） |

**優先順位:**
1. `FDC_GOOGLE_TOKEN_KEY_V1` が設定されていれば使用
2. 未設定の場合は `MASTER_ENCRYPTION_KEY` にフォールバック（v1 のみ）

### 2-4. 鍵の生成方法

```bash
# 新しい 256 ビット鍵を生成（Base64 形式）
openssl rand -base64 32

# 出力例: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=

# Hex 形式が必要な場合
openssl rand -hex 32
```

---

## 3. 実装の要点

### 3-1. ファイル構成

| ファイル | 役割 |
|---------|------|
| `lib/server/encryption/google-tokens.ts` | 暗号化/復号モジュール |
| `lib/server/encryption/index.ts` | 統合エクスポート |
| `app/api/google/callback/route.ts` | トークン保存処理 |
| `app/api/google/sync/handlers/token-utils.ts` | トークン取得・更新処理 |
| `migrations/025-google-token-key-version.sql` | DB スキーマ変更 |

### 3-2. DB スキーマ

**テーブル:** `users`

| カラム | 型 | 説明 |
|--------|-----|------|
| `google_refresh_token` | TEXT | 暗号化されたリフレッシュトークン（JSON） |
| `token_key_version` | TEXT | 鍵バージョン（`v1`, `v2` など） |
| `google_access_token` | TEXT | 暗号化されたアクセストークン（既存形式） |

### 3-3. 主要関数

```typescript
// 暗号化
import { encryptRefreshToken } from '@/lib/server/encryption';

const { ciphertext, version } = encryptRefreshToken(plainToken);
// ciphertext: JSON 文字列
// version: "v1"

// 復号
import { decryptRefreshToken } from '@/lib/server/encryption';

const plainToken = decryptRefreshToken(ciphertext, version);
// version 省略時は ciphertext 内の keyVersion を使用
// 旧形式（legacy）も自動検出して復号
```

---

## 4. 運用手順

### 4-1. 初期セットアップ

1. **鍵の生成**
   ```bash
   openssl rand -base64 32 > /tmp/google-token-key-v1.txt
   cat /tmp/google-token-key-v1.txt
   # 安全な場所にバックアップ後、ファイルを削除
   rm /tmp/google-token-key-v1.txt
   ```

2. **Vercel 環境変数の設定**
   ```bash
   vercel env add FDC_GOOGLE_TOKEN_KEY_V1 production
   # プロンプトで鍵を入力
   ```

3. **DB マイグレーション**
   ```bash
   psql $DATABASE_URL -f migrations/025-google-token-key-version.sql
   ```

4. **デプロイ**
   ```bash
   vercel --prod
   ```

### 4-2. 鍵ローテーション

**推奨頻度:** 年1回、またはセキュリティインシデント発生時

1. **新しい鍵を生成**
   ```bash
   openssl rand -base64 32
   ```

2. **新しい環境変数を追加**
   ```bash
   vercel env add FDC_GOOGLE_TOKEN_KEY_V2 production
   ```

3. **コードを更新**
   ```typescript
   // lib/server/encryption/google-tokens.ts

   const KEY_ENV_MAPPING: Record<string, string> = {
     v1: 'FDC_GOOGLE_TOKEN_KEY_V1',
     v2: 'FDC_GOOGLE_TOKEN_KEY_V2', // 追加
   };

   export const CURRENT_KEY_VERSION = 'v2'; // 変更
   ```

4. **デプロイ**
   - 新規連携ユーザーは v2 で暗号化
   - 既存ユーザーは v1 で継続動作

5. **（オプション）既存データの再暗号化**
   - 全ユーザーに再認可を促す
   - または、バックグラウンドマイグレーションスクリプトを実行

### 4-3. 既存データの移行方針

**採用方式:** 再認可方式 + 互換性維持

- **新規/再認可ユーザー**: 新形式（keyVersion 付き）で自動保存
- **既存ユーザー**: 旧形式のまま動作継続（`decryptRefreshToken` が自動検出）
- **移行促進**: 管理者が必要に応じてユーザーに再認可を促す

**確認クエリ:**
```sql
-- 鍵バージョンごとのユーザー数
SELECT
  COALESCE(token_key_version, 'legacy') as key_version,
  COUNT(*) as user_count
FROM users
WHERE google_api_enabled = TRUE
GROUP BY token_key_version
ORDER BY key_version;
```

---

## 5. インシデント対応

### 5-1. 鍵漏えい疑いの場合

1. **即時対応（30分以内）**
   - 漏えいした鍵の使用を停止（環境変数を削除）
   - 新しい鍵を生成して設定
   - `CURRENT_KEY_VERSION` を新バージョンに更新

2. **影響調査（1時間以内）**
   - 漏えいした鍵で暗号化されたトークン数を確認
   - アクセスログで不正使用の痕跡を確認

3. **復旧作業**
   - 影響を受けたユーザーに Google 再連携を促す通知
   - 必要に応じて Google 側でトークンを無効化

### 5-2. 復号エラーが多発する場合

1. **原因特定**
   - 環境変数が正しく設定されているか確認
   - 鍵のエンコード形式（Base64/Hex）が正しいか確認

2. **応急処置**
   - 影響を受けたユーザーの Google 連携を一時無効化
   - ログから復号エラーの詳細を確認

3. **恒久対策**
   - 鍵の再設定
   - ユーザーへの再認可依頼

---

## 6. テスト

### 6-1. 単体テスト

```bash
cd /Users/5dmgmt/プラグイン/foundersdirect
npm run test:unit -- tests/unit/encryption/google-tokens.test.ts
```

### 6-2. 結合テスト（手動）

1. **新規連携テスト**
   - `/settings` で Google 連携を開始
   - DB で `token_key_version = 'v1'` であることを確認

2. **同期テスト**
   - Dashboard でタスク同期を実行
   - エラーなく完了することを確認

3. **連携解除テスト**
   - `/settings` で Google 連携を解除
   - DB で `google_refresh_token = NULL` であることを確認

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0 | 2024-12-04 | 初版作成（Phase 15-A 実装完了） |

---

## 8. 関連ドキュメント

- [PHASE15-RUNBOOK.md](./PHASE15-RUNBOOK.md) - Phase 15 全体の設計書
- [lib/server/encryption/google-tokens.ts](../../lib/server/encryption/google-tokens.ts) - 実装コード
- [migrations/025-google-token-key-version.sql](../../migrations/025-google-token-key-version.sql) - DB マイグレーション
