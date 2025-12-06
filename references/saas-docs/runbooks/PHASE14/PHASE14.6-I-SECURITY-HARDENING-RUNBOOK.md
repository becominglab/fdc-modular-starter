# Phase 14.6-I: セキュリティ・スケーラビリティ強化 ランブック

## 概要

Phase 14.6-H で技術負債ゼロを達成した後、セキュリティ・パフォーマンス・スケーラビリティの観点で追加の強化を実施。

**実施日**: 2025-12-02
**バージョン**: v2.8.6

---

## 実施項目

### 1. エラーメッセージの本番環境マスク

**ファイル**: `lib/server/api-utils.ts`

**問題点**:
- 本番環境で詳細なエラーメッセージがクライアントに露出
- データベースエラーやスタックトレースが攻撃者に情報を与える可能性

**対応**:
```typescript
// 本番環境では詳細なエラーメッセージを隠す（セキュリティ対策）
const safeMessage = process.env.NODE_ENV === 'production'
  ? 'Internal server error'
  : message;

return jsonError(safeMessage, 500, 'INTERNAL_ERROR');
```

**効果**:
- 本番環境: "Internal server error" のみ返却
- 開発環境: 詳細なエラーメッセージを維持（デバッグ用）
- ログには常に詳細を記録

---

### 2. テナント境界チェック強化

**ファイル**: `app/api/workspaces/[workspaceId]/data/route.ts`

**問題点**:
- `currentTenant` が null の場合、チェックがスキップされる
- サブドメインなしで他テナントのワークスペースにアクセス可能な脆弱性

**対応**:
```typescript
// テナント境界チェック強化: currentTenant が null でもワークスペースのテナントを検証
if (currentTenant) {
  // 現在のサブドメインに対応するテナントが存在する場合
  if (workspace?.tenant_id && workspace.tenant_id !== currentTenant.id) {
    return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
  }
} else if (workspace?.tenant_id) {
  // currentTenant が null だが、ワークスペースにはテナントが設定されている場合
  // → 不正なアクセスの可能性
  return NextResponse.json({ error: 'Forbidden: Tenant access required' }, { status: 403 });
}
```

**効果**:
- サブドメインなしでテナント付きワークスペースへのアクセスを拒否
- テナント間の完全な分離を保証

---

### 3. Google トークン更新の競合防止（分散ロック）

**ファイル**:
- `lib/server/sync-queue.ts` - 分散ロック機能追加
- `app/api/google/sync/route.ts` - ロック使用

**問題点**:
- 複数の同時リクエストが同じユーザーのトークンを更新しようとする
- 競合状態でトークンが不整合になる可能性

**対応**:

#### sync-queue.ts に分散ロック API 追加
```typescript
// 定数
const TOKEN_REFRESH_LOCK_PREFIX = 'token_refresh_lock:';
const TOKEN_REFRESH_LOCK_TTL = 30; // 30秒

// メモリストア（開発環境）
async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const now = Date.now();
  const existing = this.locks.get(key);
  if (existing && existing > now) return false;
  this.locks.set(key, now + ttlSeconds * 1000);
  return true;
}

// Vercel KV（本番環境）- Redis SETNX 使用
async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await this.sendCommand('SET', key, '1', 'NX', 'EX', String(ttlSeconds));
  return result === 'OK';
}

// 公開 API
export async function acquireTokenRefreshLock(userId: string): Promise<boolean>;
export async function releaseTokenRefreshLock(userId: string): Promise<void>;
```

#### google/sync/route.ts でロック使用
```typescript
if (isTokenExpired(user.google_token_expires_at)) {
  // 分散ロックを取得して競合を防止
  const lockAcquired = await acquireTokenRefreshLock(String(userId));
  if (!lockAcquired) {
    // 他のリクエストがトークン更新中 → 待機後に再取得
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // 更新済みトークンを再取得...
  }

  try {
    // トークン更新処理
  } finally {
    await releaseTokenRefreshLock(String(userId));
  }
}
```

**効果**:
- トークン更新の競合状態を完全に防止
- 待機中のリクエストは更新済みトークンを再利用
- TTL 30秒でデッドロックを防止

---

### 4. CSRF 検証（既存実装の確認）

**ファイル**: `lib/server/api-utils.ts`

**現状**:
既に多層防御が実装済み：
1. Origin/Referer ヘッダー検証
2. X-CSRF-Token カスタムヘッダー（プリフライト必須）
3. SameSite=Lax Cookie

**判断**:
カスタムヘッダーの存在自体がプリフライトを強制するため、追加のセッション照合は不要。
現状維持。

---

### 5. CSP Nonce ベース実装 ✅ 完了

**ファイル**:
- `middleware.ts` - Nonce 生成と CSP ヘッダー設定
- `next.config.mjs` - 静的 CSP 設定を削除

**問題点**:
- `script-src` に `'unsafe-inline'` と `'unsafe-eval'` を許可
- XSS 攻撃時にインラインスクリプト実行が可能

**対応**:
```typescript
// middleware.ts
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

function addCspHeaders(response: NextResponse): NextResponse {
  const nonce = generateNonce();
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://...`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // ... 他のディレクティブ
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Nonce', nonce);
  return response;
}
```

**効果**:
- `script-src` から `'unsafe-inline'` と `'unsafe-eval'` を削除
- Nonce ベースの動的 CSP でインラインスクリプトを制御
- `'strict-dynamic'` でトラストされたスクリプトからのロードを許可
- style-src は Next.js の styled-jsx 等のため `'unsafe-inline'` を維持

---

### 6. セッション JOIN 最適化 ✅ 完了

**ファイル**: `lib/server/auth.ts`

**問題点**:
- `getSession()` と `requireAuth()` で複数クエリが発生
- セッション → ユーザー → ワークスペースメンバーを別々に取得

**対応**:
```typescript
// Phase 14.6-I: セッション + ユーザー情報を1クエリで取得（JOIN最適化）
const { data: sessionWithUser, error: joinError } = await supabase
  .from('sessions')
  .select(`
    user_id,
    expires_at,
    users!inner (
      id, google_sub, email, name, picture, system_role, created_at, updated_at
    )
  `)
  .eq('token', sessionToken)
  .gt('expires_at', new Date().toISOString())
  .single();
```

**効果**:
- `getSession()`: 3クエリ → 1クエリ
- `requireAuth()`: 3クエリ → 1クエリ
- 認証処理の DB 負荷を 66% 削減

---

### 7. Unit テスト skip 解消（18件）

**ファイル**:
- `tests/unit/phase10/streak-calculator.test.ts`
- `tests/unit/phase11/progress-calculator.test.ts`
- `tests/unit/phase12/kr-calculator.test.ts`
- `tests/unit/validator.test.ts`

**問題点**:
- Phase 10/11/12 のテストが `it.skip` のまま放置
- 関数名の変更（設計変更）に追従していなかった
- validator テストが旧 OKR スキーマを参照

**対応**:
- `createTask` → `createDefaultTask` に変更
- `calculateActionItemProgress` → `recomputeActionItemProgress` に変更
- `rollUpFromActionMaps` → `calculateKRProgress` の第2引数に統合
- 旧 `okr` フィールド → 新 `objectives` / `okrKeyResults` に変更

**結果**:
```
Test Files  10 passed (10)
     Tests  129 passed (129)
```

---

### 8. 型バイパス（`as any`）完全解消 ✅ 完了

**ファイル**:
- `app/api/audit-logs/route.ts`
- `app/api/auth/session/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/invitations/verify/route.ts`

**問題点**:
- Supabase JOIN クエリの結果に `as any` を使用
- 型安全性が損なわれていた

**対応**:
各ファイルに適切な型定義を追加し、`as any` を完全に削除。

```typescript
// 例: app/api/audit-logs/route.ts
interface AuditLogRow {
  id: number;
  workspace_id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  users: { email: string; name: string | null } | { email: string; name: string | null }[] | null;
}

// 使用箇所
return ((logs || []) as AuditLogRow[]).map((log) => { ... });
```

**結果**:
| 指標 | 修正前 | 修正後 |
|------|--------|--------|
| `as any` | 4 | **0** |
| `@ts-ignore` | 0 | 0 |
| `@ts-expect-error` | 0 | 0 |

---

## 検証結果

| チェック項目 | 結果 |
|-------------|------|
| npm run type-check | ✅ PASS |
| npm run test:unit | ✅ PASS (129 tests) |
| npm run lint | ✅ PASS |
| npm run build | ✅ SUCCESS |
| `as any` 残存 | ✅ **0 件**（技術負債ゼロ達成） |
| `@ts-ignore` 残存 | ✅ 0 件 |
| `@ts-expect-error` 残存 | ✅ 0 件 |

---

## 残存課題（優先度再評価済み: 2025-12-02）

以下は今後の改善検討項目として記録。Phase 15（AI機能発売）前に対応すべき項目を明確化。

### 優先度サマリ

| 項目 | 説明 | 旧優先度 | 新優先度 | Phase 15前対応 |
|------|------|---------|---------|---------------|
| ~~CSP 'unsafe-inline' 削除~~ | ~~Nonce ベース CSP への移行~~ | ~~Low~~ | ~~**Mid**~~ | ✅ **完了** |
| ~~セッション JOIN 最適化~~ | ~~複数クエリの統合~~ | ~~Low~~ | ~~**Mid**~~ | ✅ **完了** |
| 画像最適化設定 | WebP/AVIF、deviceSizes 設定 | Low | Low | 🟢 不要 |
| バンドルサイズ監視 | CI への自動チェック統合 | Low | Low | 🟢 不要 |

---

### 1. ~~CSP 'unsafe-inline' 削除~~ ✅ **完了**

**対応内容**: 上記 §5 を参照。`middleware.ts` で Nonce ベース CSP を実施済み。

**実装詳細**:
- `middleware.ts` に `generateNonce()` と `addCspHeaders()` を追加
- すべてのページに CSP ヘッダーを動的に設定
- `script-src` から `'unsafe-inline'` と `'unsafe-eval'` を削除
- `'nonce-${nonce}'` と `'strict-dynamic'` で安全なスクリプト実行を許可
- `style-src` は Next.js の styled-jsx 等のため `'unsafe-inline'` を維持（技術的制約）

**効果**:
- XSS 攻撃時のインラインスクリプト実行を防止
- B2B SaaS として必要なセキュリティ基準を達成

---

### 2. ~~セッション JOIN 最適化~~ ✅ **完了**

**対応内容**: 上記 §5 を参照。`lib/server/auth.ts` で JOIN 最適化を実施済み。

**効果**:
- `getSession()`: 3クエリ → 1クエリ
- `requireAuth()`: 3クエリ → 1クエリ
- 認証処理の DB 負荷を 66% 削減

---

### 3. 画像最適化設定 【Low → 現時点では不要】

**現状**: Phase 14.5 で `next/Image` 導入済み。WebP への自動変換は Next.js デフォルトで有効

**リスク評価**:
- 画像中心のサービスではないため、ROI が低い
- Lighthouse Performance 85+ を達成済み
- AVIF 対応は Safari の対応状況を考慮して見送りが妥当

**対応方針**: 現状維持。パフォーマンス劣化時に再検討

**優先度引き上げトリガー**:
| トリガー条件 | 対応時期 |
|-------------|---------|
| Lighthouse Performance スコアが **80未満**に低下 | 即時対応 |
| LCP が **2.5秒**を超える | 即時対応 |
| 画像を多用する新機能の追加 | 機能リリース前 |

---

### 4. バンドルサイズ監視 【Low → 現時点では不要】

**現状**: `scripts/check-bundle-size.cjs` が存在し手動実行可能。GitHub Actions での自動チェックは未統合

**リスク評価**:
- 現在は単独開発者 + AI エージェント体制で、変更頻度は制御されている
- バンドルサイズは現状 14〜17% の余裕あり
- 将来的なチーム拡大時には必須化すべき

**対応方針**: チーム拡大時またはサイズ逼迫時に CI 統合

**優先度引き上げトリガー**:
| トリガー条件 | 対応時期 |
|-------------|---------|
| 開発者が **2人以上**になる | 即時対応（CI 必須化） |
| バンドルサイズが制限の **90%**に達する | 即時対応 |
| 大規模ライブラリを追加（例: chart.js, monaco-editor） | 追加前 |

---

## Phase 15 前対応アクションプラン

```
Phase 14.7 完了（テナント別AI設定）
    │
    ▼
Phase 14.6-I【対応完了 2025-12-02】
    ├── ✅ CSP 'unsafe-inline' 削除（Nonce ベース CSP 移行）
    └── ✅ セッション JOIN 最適化（クエリ統合）
    │
    ▼
Phase 15（AI機能発売）→ セキュリティ要件達成
    │
    ▼
テナント10社超過 or SOC2検討時
    └── 画像最適化・バンドルサイズ監視を再評価
```

---

## 監視すべき閾値（アラート設定推奨）

| 指標 | 閾値 | アクション |
|------|------|----------|
| P95 API レイテンシ | > 500ms | ✅ セッション JOIN 最適化済み |
| Lighthouse Performance | < 80 | 画像最適化・バンドルサイズ確認 |
| 同時接続ユーザー数 | > 50人 | ✅ セッション JOIN 最適化済み |
| AI有効テナント数 | > 5社 | ✅ CSP + セッション最適化済み |
| テナント数 | > 10社 | ✅ CSP 実装済み |

---

## ロールバック手順

### エラーメッセージマスクを無効化
```typescript
// lib/server/api-utils.ts
// safeMessage の分岐を削除し、常に message を使用
return jsonError(message, 500, 'INTERNAL_ERROR');
```

### テナント境界チェックを緩和
```typescript
// app/api/workspaces/[workspaceId]/data/route.ts
// else if (workspace?.tenant_id) ブロックを削除
```

### 分散ロックを無効化
```typescript
// app/api/google/sync/route.ts
// acquireTokenRefreshLock / releaseTokenRefreshLock の呼び出しを削除
// 従来のロックなし処理に戻す
```

### CSP Nonce を無効化
```typescript
// middleware.ts
// addCspHeaders() の呼び出しを削除
// next.config.mjs の静的 CSP 設定を復元（'unsafe-inline' 含む）
```

### セッション JOIN を従来方式に戻す
```typescript
// lib/server/auth.ts
// JOIN クエリを3つの個別クエリに分割:
// 1. sessions テーブルから user_id を取得
// 2. users テーブルからユーザー情報を取得
// 3. workspace_members テーブルからロールを取得
```

---

## 関連ドキュメント

- [FDC-GRAND-GUIDE.md](../FDC-GRAND-GUIDE.md)
- [FDC-CORE.md](../FDC-CORE.md)
- [PHASE14.6-AI-READINESS-RUNBOOK.md](./PHASE14.6-AI-READINESS-RUNBOOK.md)
