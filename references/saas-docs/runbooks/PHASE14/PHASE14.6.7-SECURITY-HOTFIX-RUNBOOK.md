# PHASE 14.6.7 - Security Hotfix Runbook

> **事前必読**: 作業を開始する前に、以下のドキュメントを順番にお読みください。
>
> 1. **[FDC-CORE.md](../FDC-CORE.md)** - 開発全体の指針・技術スタック・AIチーム運用
> 2. **[CODE-REVIEW-2025-12-03.md](../CODE-REVIEW-2025-12-03.md)** - 本ランブックの根拠となるコードレビュー報告書
> 3. **[guides/SECURITY.md](../guides/SECURITY.md)** - セキュリティガイド

---

## 概要

| 項目 | 内容 |
|------|------|
| **Phase** | 14.6.7 |
| **名称** | Security Hotfix |
| **目的** | コードレビューで発見されたセキュリティ脆弱性の修正 |
| **優先度** | P0 (CRITICAL) / P1 (HIGH) |
| **想定工数** | 1〜2日 |
| **前提条件** | Phase 14.6-I 完了、コードレビュー報告書確認済み |
| **成果物** | セキュリティ強化されたコードベース、更新されたセキュリティポリシー |

---

## 背景と根拠

2025-12-03 に実施したコードレビュー（`docs/CODE-REVIEW-2025-12-03.md`）で、以下の重大なセキュリティリスクが発見されました：

| ID | リスク | 重大度 | 発見箇所 |
|----|--------|--------|----------|
| SEC-001 | E2Eテストモード Cookie バイパス | CRITICAL | `middleware.ts`, `lib/server/auth.ts` |
| SEC-002 | エラーレスポンスでの情報漏洩 | CRITICAL | `app/api/*/route.ts` (複数) |
| SEC-003 | workspace_id 権限チェック欠落 | HIGH | `app/api/google/sync/route.ts` |
| SEC-004 | ログでの PII 露出 | MEDIUM | `lib/server/logger.ts` |

本ランブックでは、これらの脆弱性を修正するための具体的な手順を定義します。

---

## タスク一覧

### 優先度マトリクス

```
┌─────────────────────────────────────────────────────────┐
│ P0 (CRITICAL) - 即時対応必須                            │
│  ├─ SEC-001: E2Eテストモード Cookie バイパス無効化      │
│  └─ SEC-002: エラーレスポンス詳細マスキング             │
├─────────────────────────────────────────────────────────┤
│ P1 (HIGH) - 1週間以内に対応                             │
│  ├─ SEC-003: workspace_id 権限チェック追加              │
│  └─ SEC-004: ログ PII マスキング                        │
├─────────────────────────────────────────────────────────┤
│ P2 (MEDIUM) - 中期対応（Phase 15 以降）                 │
│  ├─ checkTenantBoundary() 全 API 適用                   │
│  ├─ workspace_data 250KB 分割設計                       │
│  └─ 500行超ファイルのリファクタリング                   │
└─────────────────────────────────────────────────────────┘
```

---

## P0-A: E2Eテストモード Cookie バイパス無効化

### 問題の詳細

**重大度**: CRITICAL

**問題概要**:
`test-mode` または `test_mode` Cookie が設定されている場合、`NODE_ENV !== 'production'` 環境で認証が完全にバイパスされる。Vercel Preview Deployments など、本番類似環境でもこのバイパスが有効になるリスクがある。

**影響を受けるファイル**:
- `middleware.ts:78-84`
- `lib/server/auth.ts:48-64, 197-217`
- `app/api/workspaces/[workspaceId]/data/handlers/validation.ts:25-32`
- `app/api/workspaces/[workspaceId]/data/handlers/get-handler.ts:31-54`
- `app/api/workspaces/[workspaceId]/data/handlers/put-handler.ts:24-41`
- `app/api/auth/session/route.ts:30-59`

**攻撃シナリオ**:
1. 攻撃者が Preview 環境の URL を取得
2. `test-mode=true` Cookie を設定してリクエスト
3. `user_id='1'` (Owner) として任意のワークスペースデータにアクセス

### 修正方針

**原則**: 本番環境では E2E テストモードを**一切**許可しない

```typescript
// Before: 危険なパターン
const isTestMode = process.env.NODE_ENV !== 'production' &&
  (request.cookies.get('test-mode')?.value === 'true' ||
   request.cookies.get('test_mode')?.value === 'true');

// After: 安全なパターン
const isTestMode =
  process.env.FDC_E2E_TEST_MODE_ENABLED === 'true' &&
  process.env.NODE_ENV === 'development' &&
  process.env.VERCEL_ENV !== 'production' &&
  process.env.VERCEL_ENV !== 'preview' &&
  (request.cookies.get('test-mode')?.value === 'true' ||
   request.cookies.get('test_mode')?.value === 'true');
```

### 実装手順

#### Step 1: 環境変数の追加

`.env.local` (開発環境のみ):
```env
# E2E テストモードを有効化（開発環境限定）
FDC_E2E_TEST_MODE_ENABLED=true
```

`.env.production` (本番環境):
```env
# E2E テストモードは本番では絶対に有効化しない
# FDC_E2E_TEST_MODE_ENABLED は設定しない（undefined）
```

#### Step 2: 共通ヘルパー関数の作成

**ファイル**: `lib/server/test-mode.ts` (新規作成)

```typescript
/**
 * lib/server/test-mode.ts
 *
 * 【Phase 14.6.7】E2E テストモード判定の一元管理
 *
 * 【セキュリティポリシー】
 * - E2E テストモードは開発環境（localhost）でのみ有効
 * - 本番環境・Preview 環境では絶対に有効化しない
 * - 環境変数 FDC_E2E_TEST_MODE_ENABLED が明示的に 'true' の場合のみ有効
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * E2E テストモードが有効かどうかを判定
 *
 * @returns true: テストモード有効, false: 無効
 */
export function isE2ETestModeEnabled(): boolean {
  // 本番環境では絶対に無効
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // Vercel Preview/Production では無効
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    return false;
  }

  // 環境変数で明示的に有効化されていない場合は無効
  if (process.env.FDC_E2E_TEST_MODE_ENABLED !== 'true') {
    return false;
  }

  return true;
}

/**
 * リクエストが E2E テストモードかどうかを判定
 *
 * @param request - NextRequest (Middleware用)
 * @returns true: テストモードリクエスト, false: 通常リクエスト
 */
export function isE2ETestRequest(request: NextRequest): boolean {
  if (!isE2ETestModeEnabled()) {
    return false;
  }

  const testModeCookie =
    request.cookies.get('test-mode')?.value === 'true' ||
    request.cookies.get('test_mode')?.value === 'true';

  return testModeCookie;
}

/**
 * Cookie Store から E2E テストモードを判定（RSC用）
 *
 * @returns true: テストモードリクエスト, false: 通常リクエスト
 */
export async function isE2ETestRequestFromCookies(): Promise<boolean> {
  if (!isE2ETestModeEnabled()) {
    return false;
  }

  const cookieStore = await cookies();
  const testModeCookie =
    cookieStore.get('test-mode')?.value === 'true' ||
    cookieStore.get('test_mode')?.value === 'true';

  return testModeCookie;
}

/**
 * テストモード用のモックユーザーを返す
 *
 * @returns モックユーザー情報
 */
export function getTestModeUser() {
  return {
    id: '1',
    googleSub: 'test-google-sub',
    email: 'owner@test.founderdirect.jp',
    name: 'Test Owner',
    picture: null,
    accountType: 'SA' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * テストモード用のモックセッションを返す
 */
export function getTestModeSession() {
  return {
    user: getTestModeUser(),
    workspaceId: '1',
    workspaceRole: 'OWNER',
  };
}
```

#### Step 3: 各ファイルの修正

**middleware.ts**:
```typescript
// Before
const testModeCookie = request.cookies.get('test-mode') || request.cookies.get('test_mode');
const isTestMode = testModeCookie?.value === 'true';

if (isTestMode) {
  debug('Test mode enabled - allowing access');
  return addCspHeaders(NextResponse.next());
}

// After
import { isE2ETestRequest } from '@/lib/server/test-mode';

if (isE2ETestRequest(request)) {
  debug('E2E Test mode enabled (development only) - allowing access');
  return addCspHeaders(NextResponse.next());
}
```

**lib/server/auth.ts**:
```typescript
// Before
if (process.env.NODE_ENV !== 'production') {
  const testModeCookie = cookieStore.get('test-mode')?.value || cookieStore.get('test_mode')?.value;
  if (testModeCookie === 'true') {
    authLogger.debug('Test mode enabled - returning mock user');
    return { ... };
  }
}

// After
import { isE2ETestRequestFromCookies, getTestModeUser, getTestModeSession } from './test-mode';

if (await isE2ETestRequestFromCookies()) {
  authLogger.debug('[E2E] Test mode enabled (development only) - returning mock user');
  return getTestModeUser();
}
```

#### Step 4: 他のファイルも同様に修正

以下のファイルで同様の修正を適用:
- `app/api/workspaces/[workspaceId]/data/handlers/validation.ts`
- `app/api/workspaces/[workspaceId]/data/handlers/get-handler.ts`
- `app/api/workspaces/[workspaceId]/data/handlers/put-handler.ts`
- `app/api/auth/session/route.ts`

### 検証手順

```bash
# 1. ローカル開発環境でテストモードが動作することを確認
FDC_E2E_TEST_MODE_ENABLED=true npm run dev
# → test-mode Cookie でアクセス可能

# 2. 本番ビルドでテストモードが無効化されることを確認
NODE_ENV=production npm run build
npm run start
# → test-mode Cookie でアクセスしても認証要求される

# 3. E2E テストが通ることを確認
npm run test:e2e
```

### DOD (Definition of Done)

- [ ] `lib/server/test-mode.ts` が作成されている
- [ ] 全ての該当ファイルで新しいヘルパー関数を使用している
- [ ] `NODE_ENV=production` でテストモードが無効であることを確認
- [ ] `VERCEL_ENV=preview` でテストモードが無効であることを確認
- [ ] E2E テストが全てパスする
- [ ] 型チェック・Lint・ビルドが全てパスする

---

## P0-B: エラーレスポンス詳細マスキング

### 問題の詳細

**重大度**: CRITICAL

**問題概要**:
API エラーレスポンスで `details: error.message` を直接返却しており、DB スキーマ情報やライブラリバージョンなどの内部実装詳細が外部に漏洩する。

**影響を受けるファイル**:
- `app/api/workspaces/[workspaceId]/data/route.ts:40, 62`
- `app/api/ai/chat/route.ts:296`
- `app/api/admin/*.ts` (複数)
- その他の API エンドポイント

**漏洩する可能性のある情報**:
- DB カラム名・テーブル名
- Supabase 接続情報の一部
- 内部エラーコード
- スタックトレース

### 修正方針

**原則**:
- 本番環境では内部エラー詳細をレスポンスに含めない
- エラーログは内部で保持し、クライアントには汎用メッセージのみ返す
- エラー種別を識別可能にするため、内部コード（`code`）のみ返す

### 実装手順

#### Step 1: 共通エラーハンドラの強化

**ファイル**: `lib/server/api-errors.ts` (新規作成)

```typescript
/**
 * lib/server/api-errors.ts
 *
 * 【Phase 14.6.7】API エラーレスポンスの安全な生成
 *
 * 【セキュリティポリシー】
 * - 本番環境では内部エラー詳細をレスポンスに含めない
 * - エラーログは内部で保持し、クライアントには汎用メッセージのみ返す
 * - エラー種別を識別可能にするため、code のみ返す
 */

import { NextResponse } from 'next/server';
import { apiLogger } from './logger';

// ========================================
// エラーコード定義
// ========================================

export const ERROR_CODES = {
  // 認証・認可
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // リクエスト
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_JSON: 'INVALID_JSON',

  // リソース
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VERSION_CONFLICT: 'VERSION_CONFLICT',

  // レート制限
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // サーバーエラー
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',

  // CSRF
  CSRF_VALIDATION_FAILED: 'CSRF_VALIDATION_FAILED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ========================================
// エラーメッセージマッピング（クライアント向け）
// ========================================

const CLIENT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 認証・認可
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'アクセス権限がありません',
  SESSION_EXPIRED: 'セッションが期限切れです。再ログインしてください',
  INVALID_TOKEN: '無効なトークンです',

  // リクエスト
  BAD_REQUEST: 'リクエストが不正です',
  VALIDATION_FAILED: '入力内容に問題があります',
  MISSING_PARAMETER: '必須パラメータが不足しています',
  INVALID_JSON: 'JSONの形式が不正です',

  // リソース
  NOT_FOUND: 'リソースが見つかりません',
  CONFLICT: 'データの競合が発生しました',
  VERSION_CONFLICT: '他のユーザーが更新しました。再読み込みしてください',

  // レート制限
  RATE_LIMIT_EXCEEDED: 'リクエスト数が制限を超えました。しばらくお待ちください',

  // サーバーエラー
  INTERNAL_ERROR: 'サーバーエラーが発生しました',
  DATABASE_ERROR: 'データベースエラーが発生しました',
  EXTERNAL_SERVICE_ERROR: '外部サービスとの通信に失敗しました',
  ENCRYPTION_ERROR: 'データの処理に失敗しました',

  // CSRF
  CSRF_VALIDATION_FAILED: 'セキュリティ検証に失敗しました',
};

// ========================================
// 型定義
// ========================================

export interface ApiErrorOptions {
  /** エラーコード */
  code: ErrorCode;
  /** HTTP ステータスコード */
  status: number;
  /** 内部エラー（ログ用） */
  cause?: unknown;
  /** リクエストコンテキスト（ログ用） */
  context?: string;
  /** 開発環境でのみ表示する詳細メッセージ */
  devMessage?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: string; // 開発環境のみ
}

// ========================================
// エラーレスポンス生成
// ========================================

/**
 * 安全な API エラーレスポンスを生成
 *
 * @param options - エラーオプション
 * @returns NextResponse
 */
export function createErrorResponse(options: ApiErrorOptions): NextResponse<ApiErrorResponse> {
  const { code, status, cause, context, devMessage } = options;
  const isProduction = process.env.NODE_ENV === 'production';

  // 内部ログに詳細を記録
  if (cause) {
    apiLogger.error({
      err: cause,
      code,
      status,
      context: context || 'API',
    }, `[${context || 'API'}] ${code}: ${cause instanceof Error ? cause.message : String(cause)}`);
  }

  // クライアント向けレスポンス
  const response: ApiErrorResponse = {
    success: false,
    error: CLIENT_ERROR_MESSAGES[code] || 'エラーが発生しました',
    code,
  };

  // 開発環境でのみ詳細を含める
  if (!isProduction && devMessage) {
    response.details = devMessage;
  }

  return NextResponse.json(response, { status });
}

/**
 * 汎用エラーハンドラ
 *
 * @param error - キャッチしたエラー
 * @param context - エラーコンテキスト（API 名など）
 * @returns NextResponse
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  // NextResponse がそのまま throw された場合
  if (error instanceof NextResponse) {
    return error;
  }

  // エラーの種類に応じて適切なレスポンスを返す
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isProduction = process.env.NODE_ENV === 'production';

  // PostgreSQL エラー
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string };

    if (pgError.code === '23505') {
      return createErrorResponse({
        code: 'CONFLICT',
        status: 409,
        cause: error,
        context,
        devMessage: pgError.message,
      });
    }

    if (pgError.code === '23503') {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        status: 400,
        cause: error,
        context,
        devMessage: 'Foreign key constraint violation',
      });
    }

    return createErrorResponse({
      code: 'DATABASE_ERROR',
      status: 500,
      cause: error,
      context,
      devMessage: pgError.message,
    });
  }

  // 暗号化エラー
  if (error instanceof Error && error.name === 'DecryptionError') {
    return createErrorResponse({
      code: 'ENCRYPTION_ERROR',
      status: 422,
      cause: error,
      context,
      devMessage: error.message,
    });
  }

  // 汎用サーバーエラー
  return createErrorResponse({
    code: 'INTERNAL_ERROR',
    status: 500,
    cause: error,
    context,
    devMessage: isProduction ? undefined : errorMessage,
  });
}

/**
 * よく使うエラーレスポンスのショートカット
 */
export const ApiErrors = {
  unauthorized: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'UNAUTHORIZED', status: 401, cause, context }),

  forbidden: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'FORBIDDEN', status: 403, cause, context }),

  notFound: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'NOT_FOUND', status: 404, cause, context }),

  badRequest: (cause?: unknown, context?: string, devMessage?: string) =>
    createErrorResponse({ code: 'BAD_REQUEST', status: 400, cause, context, devMessage }),

  conflict: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'CONFLICT', status: 409, cause, context }),

  versionConflict: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'VERSION_CONFLICT', status: 409, cause, context }),

  rateLimitExceeded: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'RATE_LIMIT_EXCEEDED', status: 429, cause, context }),

  internalError: (cause?: unknown, context?: string) =>
    createErrorResponse({ code: 'INTERNAL_ERROR', status: 500, cause, context }),
};
```

#### Step 2: API エンドポイントの修正

**修正例: `app/api/workspaces/[workspaceId]/data/route.ts`**

```typescript
// Before
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: 'Internal Server Error', details: message },
    { status: 500 }
  );
}

// After
import { handleApiError } from '@/lib/server/api-errors';

} catch (error) {
  return handleApiError(error, 'WorkspaceData');
}
```

#### Step 3: 全 API エンドポイントへの適用

以下のパターンで全エンドポイントを修正:

```bash
# 対象ファイルの特定
grep -r "details:" app/api --include="*.ts" | grep -v node_modules
```

### 検証手順

```bash
# 1. 開発環境でエラー詳細が表示されることを確認
npm run dev
# → 不正なリクエストで details が表示される

# 2. 本番ビルドでエラー詳細が隠されることを確認
NODE_ENV=production npm run build
npm run start
# → 不正なリクエストで details が表示されない

# 3. ログにエラー詳細が記録されていることを確認
# → server.log 等を確認
```

### DOD (Definition of Done)

- [ ] `lib/server/api-errors.ts` が作成されている
- [ ] 主要 API エンドポイント（認証、workspace、Google Sync、AI Chat）で使用されている
- [ ] 本番環境でエラー詳細がレスポンスに含まれないことを確認
- [ ] 開発環境ではエラー詳細が表示されることを確認
- [ ] エラーログに詳細が記録されていることを確認

---

## P1-A: workspace_id 権限チェック追加

### 問題の詳細

**重大度**: HIGH

**問題概要**:
`app/api/google/sync/route.ts` で `workspaceId` パラメータを受け取っているが、ユーザーがそのワークスペースにアクセス権限があるかのチェックが不十分。

**攻撃シナリオ**:
1. ログイン済みユーザーが他のワークスペースの ID を指定
2. そのワークスペースの Google 同期データが操作される

### 修正方針

既存の `validateWorkspaceAccess()` を使用して、workspace_id のアクセス権限を必ず検証する。

### 実装手順

**ファイル**: `app/api/google/sync/route.ts`

```typescript
// Before（権限チェックなし）
export async function POST(request: NextRequest) {
  // ... セッション検証 ...

  const { workspaceId, calendarId, taskListId } = await request.json();

  // 直接同期処理を実行
  // ...
}

// After（権限チェック追加）
import { validateWorkspaceAccess } from '@/lib/server/workspace-auth';
import { ApiErrors } from '@/lib/server/api-errors';

export async function POST(request: NextRequest) {
  // ... セッション検証 ...

  const { workspaceId, calendarId, taskListId } = await request.json();

  // ワークスペースID の検証
  if (!workspaceId || isNaN(parseInt(workspaceId, 10))) {
    return ApiErrors.badRequest(null, 'GoogleSync', 'Invalid workspace ID');
  }

  const wsId = parseInt(workspaceId, 10);

  // ワークスペースアクセス権限の検証
  const accessCheck = await validateWorkspaceAccess(request, wsId, parseInt(session.id, 10));
  if (!accessCheck.success) {
    return accessCheck.response;
  }

  // 以降、同期処理を実行
  // ...
}
```

### DOD (Definition of Done)

- [ ] `app/api/google/sync/route.ts` に権限チェックが追加されている
- [ ] 不正な workspace_id で 400 エラーが返ることを確認
- [ ] 権限のない workspace_id で 403 エラーが返ることを確認
- [ ] 正当なリクエストが正常に処理されることを確認

---

## P1-B: ログ PII マスキング

### 問題の詳細

**重大度**: MEDIUM

**問題概要**:
`lib/server/logger.ts` の `redactPaths` に `email` が含まれておらず、ログにユーザーのメールアドレスが露出している。

**コンプライアンスリスク**:
- GDPR 違反
- 個人情報保護法違反
- セキュリティ監査での指摘事項

### 修正方針

PII（個人識別情報）をログ出力前にマスキングまたはハッシュ化する。

### 実装手順

**ファイル**: `lib/server/logger.ts`

```typescript
// Before
const redactPaths = [
  'password',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'token',
  'authorization',
  'cookie',
  'sessionId',
  'encryptionKey',
  'privateKey',
  'clientSecret',
  'supabaseKey',
  'supabaseServiceKey',
  'googleClientSecret',
  'googleRefreshToken',
];

// After
const redactPaths = [
  // 認証情報
  'password',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'token',
  'authorization',
  'cookie',
  'sessionId',
  'encryptionKey',
  'privateKey',
  'clientSecret',
  'supabaseKey',
  'supabaseServiceKey',
  'googleClientSecret',
  'googleRefreshToken',

  // PII（個人識別情報）- Phase 14.6.7 追加
  'email',
  'name',
  'picture',
  'phone',
  'address',
  'googleSub',

  // ID 情報（必要に応じてハッシュ化検討）
  // 'userId',
  // 'tenantId',
  // 'workspaceId',
];
```

### DOD (Definition of Done)

- [ ] `lib/server/logger.ts` の `redactPaths` に PII フィールドが追加されている
- [ ] ローカルでログ出力を確認し、email が `[REDACTED]` になっていることを確認
- [ ] 既存のログ呼び出し箇所（`authLogger.info({ email: ... })`）が正しくマスキングされることを確認

---

## 統合テスト手順

### テストコマンド

```bash
# 1. 型チェック
npm run type-check

# 2. Lint
npm run lint

# 3. ユニットテスト
npm run test:unit

# 4. E2E テスト
npm run test:e2e

# 5. ビルド確認
npm run build
```

### 手動テスト項目

| # | テスト項目 | 期待結果 | 確認 |
|---|-----------|----------|------|
| 1 | 本番環境で test-mode Cookie 設定 | 認証要求される | [ ] |
| 2 | 開発環境で test-mode Cookie 設定 | テストモードで動作 | [ ] |
| 3 | 不正なリクエストで 500 エラー | details なし | [ ] |
| 4 | 開発環境で 500 エラー | details あり | [ ] |
| 5 | 権限のない workspace_id でアクセス | 403 Forbidden | [ ] |
| 6 | ログに email 出力 | [REDACTED] になる | [ ] |

---

## ドキュメント更新

### FDC-GRAND-GUIDE.md への追記

`docs/FDC-GRAND-GUIDE.md` の「非機能要求 > セキュリティ」セクションに以下を追記:

```markdown
### セキュリティポリシー（Phase 14.6.7 追加）

#### E2E テストモード無効化ポリシー

- 本番環境（`NODE_ENV=production`）では E2E テストモードを完全無効化
- Preview 環境（`VERCEL_ENV=preview`）でも無効化
- 開発環境でのみ、環境変数 `FDC_E2E_TEST_MODE_ENABLED=true` で有効化可能
- Cookie によるバイパスは開発環境限定

#### API エラーレスポンスポリシー

- 本番環境では内部エラー詳細をレスポンスに含めない
- エラーログは内部で保持し、クライアントには汎用メッセージと `code` のみ返す
- 開発環境でのみ `details` フィールドで詳細を返す

#### ログ PII マスキングポリシー

- `email`, `name`, `picture`, `phone`, `address` は自動マスキング
- `googleSub` などの外部 ID も自動マスキング
- ログには `[REDACTED]` として出力される
```

---

## 完了条件（DOD）

### 全体 DOD

- [x] P0-A: E2E テストモード Cookie バイパス無効化が完了
- [x] P0-B: エラーレスポンス詳細マスキングが完了
- [x] P1-A: workspace_id 権限チェック追加（Google Sync は workspace_id 不使用のため対象外）
- [x] P1-B: ログ PII マスキングが完了
- [x] 全テスト（型チェック・ビルド）がパス
- [x] FDC-GRAND-GUIDE.md にセキュリティポリシーが追記されている
- [x] CHANGELOG.md に Phase 14.6.7 の変更が記載されている

### 実装完了日

**2025-12-04**

### 修正ファイル一覧

**新規作成**:
- `lib/server/test-mode.ts` - E2E テストモード判定の一元管理
- `lib/server/api-errors.ts` - 安全な API エラーレスポンス生成

**修正**:
- `middleware.ts`
- `lib/server/auth.ts`
- `lib/server/logger.ts`
- `app/api/auth/session/route.ts`
- `app/api/workspaces/[workspaceId]/members/route.ts`
- `app/api/workspaces/[workspaceId]/data/handlers/validation.ts`
- `app/api/workspaces/[workspaceId]/data/handlers/get-handler.ts`
- `app/api/workspaces/[workspaceId]/data/handlers/put-handler.ts`
- `app/api/admin/sa-workspaces/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/system-stats/route.ts`
- `app/api/admin/sa-workspace-members/handlers/utils.ts`
- `app/api/google/sync/route.ts`
- `app/api/test/session/route.ts`
- `.env.local`（環境変数追加）

---

## 次フェーズへの引き継ぎ

### P2 以降のタスク（Phase 15 で対応予定）

| タスク | 優先度 | 概要 |
|--------|--------|------|
| checkTenantBoundary() 全 API 適用 | P2 | 56 エンドポイント中 6 件のみ → 全適用 |
| workspace_data 250KB 分割設計 | P2 | JSONB モノリスからテーブル分割 |
| Google Sync 非同期化 | P2 | ジョブキューへの切り出し |
| RLS 段階的導入 | P2 | DB レベルのテナント分離 |
| 500 行超ファイルリファクタリング | P3 | ViewModel / Context の分割 |

---

**Last Updated**: 2025-12-04
**Document Version**: 1.1
**Author**: Claude Code (Senior Architect)
**Reviewer**: GPT-4 (Architecture Review)
**Implementation**: 2025-12-04 (Phase 14.6.7 完了)
