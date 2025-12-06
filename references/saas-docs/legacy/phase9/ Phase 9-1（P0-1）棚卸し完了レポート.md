  ✅ Phase 9-1（P0-1）棚卸し完了レポート

  実施日: 2025-11-16
  対象範囲: Phase 8 までの既存機能に属する API（Phase 10〜12 の新規機能は対象外）

  ---
  📋 1. 未実装API一覧表（優先度順）

  🔴 P0（最優先：API実装が必須）

  | #   | カテゴリ         | エンドポイント                 | 必要ファイル                  | 実装状況    |
  紐づくスキップテスト                         | 備考                    |
  |-----|--------------|-------------------------|-------------------------|---------|------------------------------------|----
  -------------------|
  | 1   | JWT認証        | POST /api/auth/token    | /api/auth/token.ts      | ❌ 未実装   | 10件（api-analyze.spec.ts）
      | JWT発行・リフレッシュロジック      |
  | 2   | JWT認証        | -                       | /api/_lib/jwt.ts        | ❌ 未実装   | -
   | verify/sign ユーティリティ関数 |
  | 3   | JWT認証        | -                       | /api/_lib/middleware.ts | ❌ 未実装   | -
   | JWT検証ミドルウェア           |
  | 4   | Leads CRUD   | GET /api/leads          | /api/leads/index.ts     | ❌ 未実装   | 3件（leads.spec.ts）
    | Leads一覧取得（暗号化復号統合）    |
  | 5   | Leads CRUD   | POST /api/leads         | /api/leads/index.ts     | ❌ 未実装   | 3件（leads.spec.ts）
    | Leads作成（暗号化統合）        |
  | 6   | Leads CRUD   | PUT /api/leads/:id      | /api/leads/[id].ts      | ❌ 未実装   | -                                  |
   Leads更新               |
  | 7   | Leads CRUD   | DELETE /api/leads/:id   | /api/leads/[id].ts      | ❌ 未実装   | -                                  |
   Leads削除               |
  | 8   | Clients CRUD | GET /api/clients        | /api/clients/index.ts   | ❌ 未実装   | -                                  |
   Clients一覧取得           |
  | 9   | Clients CRUD | POST /api/clients       | /api/clients/index.ts   | ❌ 未実装   | -                                  |
   Clients作成             |
  | 10  | Clients CRUD | PUT /api/clients/:id    | /api/clients/[id].ts    | ❌ 未実装   | -                                  |
   Clients更新             |
  | 11  | Clients CRUD | DELETE /api/clients/:id | /api/clients/[id].ts    | ❌ 未実装   | -                                  |
   Clients削除             |
  | 12  | UI実装         | Settings タブ             | js/tabs/settings.ts     | ⚠️ 部分実装 | 2件（workspace-creation）
        | Workspace切替UI未統合      |
  | 13  | UI実装         | Admin タブ                | js/tabs/admin.ts        | ⚠️ 部分実装 | 5件（workspace-creation,
  audit-logs） | メンバー管理・監査ログUI未統合      |
  | 14  | セキュリティ       | CSRF保護                  | -                       | ❌ 未実装   | 2件（security.spec.ts）
            | CSRFトークン検証ミドルウェア      |
  | 15  | セキュリティ       | レート制限                   | /api/_lib/rate-limit.ts | ⚠️ 部分実装 | 2件（security.spec.ts）
               | 各API統合未完了             |

  P0 合計: 15項目（27スキップテスト紐づけ）

  ---
  🟡 P1（P0完了後：検証・最適化）

  | #   | カテゴリ    | 項目                  | 実装状況    | 紐づくスキップテスト                      | 備考
                     |
  |-----|---------|---------------------|---------|---------------------------------|---------------------------------------|
  | 16  | RLS統合検証 | RLSセッション変数設定・検証     | ⚠️ 部分実装 | 3件（rls-policies.spec.ts）        | SET 
  app.current_user_id の全API統合確認     |
  | 17  | データ永続化  | 永続化機構検証             | ⚠️ 部分実装 | 3件（todo.spec.ts, leads.spec.ts） |
  リロード後のデータ保持確認                         |
  | 18  | 暗号化統合   | 既存APIの暗号化ミドルウェア統合確認 | ⚠️ 要確認  | -                               | workspace_data
  暗号化/復号の透過性確認           |
  | 19  | パフォーマンス | API レスポンス時間計測       | ❌ 未実施   | -                               | P95 < 350ms (GET), <
  450ms (POST/PUT) |
  | 20  | パフォーマンス | 暗号化処理時間計測           | ❌ 未実施   | -                               | P95 < 180ms (保存), <
   280ms (復号)        |

  P1 合計: 5項目（6スキップテスト紐づけ）

  ---
  📊 2. カテゴリ別未実装状況

  2.1 API実装状況サマリ

  | カテゴリ              | 実装済み | 部分実装 | 未実装 | 合計  | 完成率    |
  |-------------------|------|------|-----|-----|--------|
  | /api/auth/*       | 3    | 3⚠️  | 3   | 9   | 33%    |
  | /api/workspaces/* | 3    | 0    | 0   | 3   | 100% ✅ |
  | /api/leads/*      | 0    | 0    | 4   | 4   | 0% ❌   |
  | /api/clients/*    | 0    | 0    | 4   | 4   | 0% ❌   |
  | /api/reports/*    | 3    | 3⚠️  | 0   | 3   | 100% ✅ |
  | /api/audit-logs/* | 1    | 0    | 0   | 1   | 100% ✅ |
  | 共通ライブラリ           | 3    | 1    | 3   | 7   | 43%    |
  | UI実装              | 0    | 2    | 0   | 2   | 0% ❌   |

  全体: 13実装済み / 9部分実装 / 14未実装（合計 36項目）→ 完成率 36%

  ⚠️ 注: /api/reports/* は実装済みだが、暗号化データ復号処理の確認が必要（P1）

  ---
  2.2 TODO コメント・仮実装の抽出

  既存APIファイルから以下の「TODO」「仮実装」コメントを確認：

  | ファイル                    | 行番号      | コメント内容                                  | 対応優先度             |
  |-------------------------|----------|-----------------------------------------|-------------------|
  | /api/reports/summary.ts | 224, 255 | // TODO: 担当者フィールド実装後に集計                 | Phase 10 以降       |
  | /api/reports/summary.ts | 255      | // TODO: 担当者フィールド実装後に自分担当のみフィルタリング      | Phase 10 以降
   |
  | /api/auth/roles.ts      | 83       | // デフォルトワークスペースID（Phase 7では単一ワークスペース想定） |
  P0（複数Workspace対応） |

  Phase 9 対応必須: 1件（/api/auth/roles.ts のWorkspace ID取得ロジック）

  ---
  🎯 3. Phase 9-1の最適実装順序案

  Phase 9 RUNBOOK（STEP 1〜7）と整合した順序で提案します。

  STEP 1: 暗号化割当表の最終確定（✅ Phase 9-0 完了済み）

  - ✅ DOCS/Encryption-Allocation-Table.md 整備済み

  STEP 2: API未実装部分の実装（P0-1）

  優先順位:

  1. JWT認証基盤構築（依存関係が最も大きいため最優先）
    - POST /api/auth/token - JWT発行・リフレッシュエンドポイント
    - /api/_lib/jwt.ts - verify/sign ユーティリティ関数
    - /api/_lib/middleware.ts - JWT検証ミドルウェア
    - 既存 /api/auth/google.ts, /api/auth/me.ts, /api/auth/roles.ts をJWT検証に移行
  2. Leads/Clients API実装（暗号化統合込み）
    - /api/leads/index.ts - GET/POST（一覧・作成）
    - /api/leads/[id].ts - PUT/DELETE（更新・削除）
    - /api/clients/index.ts - GET/POST
    - /api/clients/[id].ts - PUT/DELETE
    - 暗号化対象フィールド:（Encryption Allocation Table 参照）
        - Lead: name, email, phone, company, position（High）
      - Client: name, contactPerson, contractAmount（High/Medium）
  3. Settings/Admin UI統合（API連携完成）
    - js/tabs/settings.ts - Workspace切替UI実装
    - js/tabs/admin.ts - メンバー管理・監査ログ表示UI実装
  4. セキュリティミドルウェア統合
    - CSRF保護ミドルウェア実装
    - レート制限の全API統合

  STEP 3: JWT 認証の実装（P0-2）✅ 既に STEP 2 に含まれる

  STEP 4: 暗号化ミドルウェアの完成 & API 統合（P0-3）

  - /api/leads/*, /api/clients/* の暗号化統合確認
  - Prisma middleware での透過暗号化動作確認
  - 復号失敗時の graceful fallback 実装

  STEP 5: スキップテスト 33 件の解除・修正（P1-1）

  - P0 実装完了後、順次 test.skip() を削除
  - 解除順序:
    a. JWT認証系（10件）
    b. Workspace操作系（6件）
    c. UI統合系（9件）
    d. セキュリティ系（4件）
    e. RLS/永続化系（6件）→ 合計 35件（Phase 9 対象）

  STEP 6: パフォーマンス計測 & 改善（P1-2/4/5）

  - ベースライン計測（Chrome DevTools, Lighthouse, Vercel Analytics）
  - ボトルネック特定（N+1クエリ、重いJSON、過剰レンダリング）
  - 改善実施・再計測
  - Performance Specification v1.0 準拠レポート作成

  STEP 7: コード構造・責務の最適化（P1-3）

  - HOW-TO-DEVELOP.md 違反箇所修正
  - 依存方向（core → tabs → main）遵守確認
  - window 公開関数最小化

  STEP 8: 本番統合テスト & モニタリングベースライン（P2）

  - 本番環境での end-to-end 検証
  - Vercel Logs / 監査ログ自動チェック
  - アラート設定

  ---
  📝 4. 各APIの実装方針書（P0対象）

  以下、P0対象APIの実装方針を文章で記述します。

  ---
  4.1 POST /api/auth/token（JWT発行・リフレッシュ）

  リクエスト形式:
  - Method: POST
  - Headers: Content-Type: application/json
  - Body:
  {
    "idToken": "Google ID Token" // Google OAuth で取得
  }

  実装内容:
  1. JWT の取得と検証: Google ID Token を verifyGoogleIdToken() で検証
  2. ユーザー情報取得: upsertUserByGoogleSub() で DB に upsert
  3. デフォルト Workspace 取得: getWorkspacesForUser() で所属 Workspace 一覧取得、最初の Workspace を選択
  4. Workspace ロール取得: getWorkspaceMemberRole() で Workspace 内ロール取得
  5. JWT 発行: /api/_lib/jwt.ts の signJWT() を使用
    - クレーム: { userId, workspaceId, role, exp, iat }
    - 有効期限: 1時間（access token）、7日（refresh token）
  6. RLS セッション変数: 不要（JWT 発行のみ）
  7. 暗号化要否: 不要（JWT 自体は署名のみ、暗号化不要）

  レスポンス:
  {
    "success": true,
    "data": {
      "accessToken": "JWT access token",
      "refreshToken": "JWT refresh token",
      "expiresIn": 3600,
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "name": "User Name",
        "picture": "https://...",
        "globalRole": "normal"
      },
      "workspace": {
        "id": "workspace-id",
        "name": "Workspace Name",
        "role": "owner"
      }
    }
  }

  エラーケース:
  - 401: Google ID Token 検証失敗
  - 404: ユーザーが所属する Workspace が存在しない
  - 500: JWT 発行失敗

  解除すべきテスト:
  - tests/e2e/api-analyze.spec.ts: 74, 78, 95, 98, 415, 446, 450行目（計7件）

  ---
  4.2 GET/POST /api/leads（Leads CRUD - 一覧取得・作成）

  リクエスト形式（GET）:
  - Method: GET
  - Headers: Authorization: Bearer {JWT}
  - Query: ?workspaceId={id}

  リクエスト形式（POST）:
  - Method: POST
  - Headers:
    - Authorization: Bearer {JWT}
    - Content-Type: application/json
  - Body:
  {
    "workspaceId": "workspace-id",
    "lead": {
      "name": "Lead Name",
      "email": "lead@example.com",
      "company": "Company Name",
      "phone": "090-1234-5678",
      "position": "Manager",
      "channel": "real",
      "status": "uncontacted",
      "notes": "備考"
    }
  }

  実装内容:
  1. JWT の取得と検証: verifyJWT() でトークン検証、userId, workspaceId, role を抽出
  2. RLS セッション変数: SET app.current_user_id = userId
  3. 認可チェック: assertWorkspaceAccess() で viewer 以上の権限確認
  4. 暗号化要否:（Encryption Allocation Table 参照）
    - 暗号化対象（High）: name, email, phone, company, position
    - 平文: channel, status, notes（業務情報だがLow扱い）
  5. 使用するDBテーブル: workspace_data テーブルの JSONB フィールド（appData.prospects 配列）
  6. GET 処理:
    - getWorkspaceData(workspaceId) で暗号化データ取得
    - getWorkspaceKey(workspaceId) でWorkspace鍵取得
    - decrypt() で復号
    - appData.prospects を返却
  7. POST 処理:
    - リクエストボディから Lead データ取得
    - encrypt() で暗号化対象フィールドを暗号化
    - appData.prospects 配列に追加
    - saveWorkspaceData() で保存
    - 監査ログ記録（createAuditLog() - action: 'lead.created'）

  レスポンス（GET）:
  {
    "success": true,
    "data": {
      "leads": [
        {
          "id": "lead-id",
          "name": "Lead Name",
          "email": "lead@example.com",
          "company": "Company Name",
          "status": "uncontacted",
          "createdAt": "2025-11-16T10:00:00Z"
        }
      ]
    }
  }

  レスポンス（POST）:
  {
    "success": true,
    "data": {
      "leadId": "new-lead-id",
      "lead": { ... }
    }
  }

  エラーケース:
  - 401: JWT 検証失敗
  - 403: Workspace アクセス権限なし
  - 400: リクエストボディのバリデーションエラー
  - 500: 暗号化/復号失敗、DB保存失敗

  解除すべきテスト:
  - tests/e2e/leads.spec.ts: 87, 185行目（2件）

  ---
  4.3 PUT/DELETE /api/leads/[id]（Leads更新・削除）

  リクエスト形式（PUT）:
  - Method: PUT
  - Headers:
    - Authorization: Bearer {JWT}
    - Content-Type: application/json
  - URL: /api/leads/{leadId}
  - Body:
  {
    "workspaceId": "workspace-id",
    "lead": {
      "name": "Updated Name",
      "status": "responded",
      ...
    }
  }

  リクエスト形式（DELETE）:
  - Method: DELETE
  - Headers: Authorization: Bearer {JWT}
  - URL: /api/leads/{leadId}?workspaceId={id}

  実装内容:
  1. JWT の取得と検証: 同上
  2. RLS セッション変数: SET app.current_user_id = userId
  3. 認可チェック: member 以上（viewer は更新・削除不可）
  4. 暗号化要否: POST と同じ
  5. PUT 処理:
    - appData.prospects 配列から該当Lead検索
    - 暗号化フィールド更新
    - saveWorkspaceData() で保存
    - 監査ログ記録（action: 'lead.updated'）
  6. DELETE 処理:
    - appData.prospects 配列から該当Lead削除
    - saveWorkspaceData() で保存
    - 監査ログ記録（action: 'lead.deleted'）

  レスポンス:
  {
    "success": true,
    "data": {
      "message": "Lead updated/deleted successfully"
    }
  }

  エラーケース:
  - 404: Lead が見つからない
  - その他は POST と同じ

  解除すべきテスト: なし（基本動作テストに含まれる）

  ---
  4.4 GET/POST /api/clients（Clients CRUD）

  実装方針:
  - Leads API とほぼ同じ構造
  - 暗号化対象フィールド（Encryption Allocation Table 参照）:
    - High: name, contactPerson
    - Medium: contractAmount
    - Low: status, contractStartDate, contractEndDate
  - 使用するDBテーブル: workspace_data.clients 配列
  - 監査ログ action: client.created, client.updated, client.deleted

  ---
  4.5 Settings タブ UI統合（Workspace切替）

  実装内容:
  1. 現在のWorkspace表示: appData.workspaceId を表示
  2. Workspace一覧取得: GET /api/workspaces を呼び出し
  3. Workspace切替:
    - ドロップダウンで選択
    - PUT /api/workspaces/{workspaceId}/data で切替
    - loadWorkspaceData() で新しいWorkspaceのデータ読み込み
    - setState() で状態更新
    - タブUI再描画
  4. 新規Workspace作成:
    - フォーム入力（Workspace名）
    - POST /api/workspaces で作成
    - 自動切替

  解除すべきテスト:
  - tests/e2e/phase-8-8/workspace-creation.spec.ts: 46, 106行目（2件）

  ---
  4.6 Admin タブ UI統合（メンバー管理・監査ログ）

  実装内容:
  1. メンバー一覧表示: GET /api/workspaces/{workspaceId}/members
  2. メンバー追加:
    - フォーム入力（メールアドレス、ロール）
    - POST /api/workspaces/{workspaceId}/members
  3. メンバー削除:
    - 削除ボタンクリック
    - DELETE /api/workspaces/{workspaceId}/members/{userId}
  4. ロール変更:
    - ドロップダウン選択
    - PATCH /api/workspaces/{workspaceId}/members/{userId}
  5. 監査ログ表示:
    - GET /api/audit-logs?workspaceId={id}&limit=100&offset=0
    - テーブル形式で表示（ユーザー、アクション、日時）
    - ページネーション実装

  解除すべきテスト:
  - tests/e2e/phase-8-8/workspace-creation.spec.ts: 174, 191, 208行目（3件）
  - tests/e2e/phase-8-8/audit-logs.spec.ts: 53行目（1件）
  - tests/e2e/workspace.spec.ts: 137, 142, 146行目（3件）

  ---
  4.7 CSRF保護ミドルウェア

  実装内容:
  1. CSRFトークン生成:
    - ログイン時に crypto.randomBytes(32) でトークン生成
    - セッションまたは localStorage に保存
    - レスポンスヘッダー X-CSRF-Token で返却
  2. CSRFトークン検証:
    - POST/PUT/DELETE リクエスト時に X-CSRF-Token ヘッダーチェック
    - セッションまたは localStorage の値と照合
    - 不一致の場合 403 エラー
  3. 適用対象API:
    - /api/workspaces/* (POST/PUT/DELETE)
    - /api/leads/* (POST/PUT/DELETE)
    - /api/clients/* (POST/PUT/DELETE)
    - /api/auth/token (POST)

  解除すべきテスト:
  - tests/e2e/phase-8-8/security.spec.ts: 50, 60行目（2件）

  ---
  4.8 レート制限統合

  実装内容:
  1. 既存実装確認: /api/_lib/rate-limit.ts が存在（Phase 7実装）
  2. 全APIへの統合:
    - 各APIハンドラーで applyRateLimit(req, userId, 'endpoint-name') を呼び出し
    - エンドポイント別の制限値設定（/api/auth/*: 5回/分、/api/workspaces/*: 20回/分 等）
  3. エラーレスポンス:
    - 429 Too Many Requests
    - Retry-After ヘッダー付与

  解除すべきテスト:
  - tests/e2e/phase-8-8/security.spec.ts: 95, 115行目（2件）

  ---
  🔧 5. 追加ドキュメントの提案

  Phase 9-1 を効率的に進めるため、以下のドキュメント整備を推奨します。

  5.1 必須ドキュメント（Phase 9-1開始前）

  | ドキュメント名                          | 目的              | 作成優先度 | 備考                        |
  |----------------------------------|-----------------|-------|---------------------------|
  | JWT Implementation Guide         | JWT発行・検証の詳細仕様   | P0    | クレーム構造、有効期限、リフレッシュロジック    |
  | API Testing Checklist            | API実装時の必須チェック項目 | P0    | JWT検証、RLS設定、暗号化、監査ログ      |
  | Encryption Integration Checklist | 暗号化統合の確認項目      | P0    | 暗号化対象フィールド、復号処理、エラーハンドリング |

  5.2 推奨ドキュメント（Phase 9-1中）

  | ドキュメント名                          | 目的                  | 作成優先度 | 備考                        |
  |----------------------------------|---------------------|-------|---------------------------|
  | API Response Format Spec         | 全APIのレスポンス形式統一      | P1    | success/error 共通フォーマット    |
  | Error Handling Guide             | エラーケース網羅・ステータスコード統一 | P1    | 400/401/403/404/500 の使い分け |
  | Performance Measurement Protocol | パフォーマンス計測の具体的手順     | P1    | P95/P99算出方法、計測ツール         |

  5.3 Phase 9-1完了後に更新すべきドキュメント

  - DOCS/SERVER-API-SPEC.md - 新規APIエンドポイント追加
  - tests/skipped-tests.md - 解除済みテストをマーク
  - DOCS/CHANGELOG.md - Phase 9-1 実装内容を記録

  ---
  ✅ Phase 9-1 完了基準（再確認）

  以下の条件をすべて満たした時点で Phase 9-1 完了とします。

  必須項目（Phase 10開始の前提条件）

  - ✅ P0 対象15項目が全て実装完了
    - JWT認証（3項目）
    - Leads/Clients API（8項目）
    - Settings/Admin UI（2項目）
    - セキュリティ（2項目）
  - ✅ スキップテスト 27件（P0）を解除し、全て pass
  - ✅ 既存APIが暗号化ミドルウェアと統合され、動作確認完了
  - ✅ HOW-TO-DEVELOP.md の「基本ルール」違反が 0 件

  推奨項目

  - ✅ P1 対象5項目が完了（RLS検証、永続化検証、パフォーマンス計測）
  - ✅ Performance Specification v1.0 の基準を満たす
    - API レスポンス: P95 < 350ms (GET), < 450ms (POST/PUT)
    - 暗号化処理: P95 < 180ms (保存), < 280ms (復号)
    - 初回Dashboard表示: P95 < 2.0s

  ---
  📌 次のアクション

  ユーザーの承認後、以下の順序で実装を開始します：

  1. JWT認証基盤構築（P0-2）- 最優先
    - POST /api/auth/token 実装
    - /api/_lib/jwt.ts 実装
    - /api/_lib/middleware.ts 実装
    - 既存 /api/auth/* をJWT検証に移行
  2. Leads/Clients API実装（P0-1）
    - /api/leads/* 実装（暗号化統合込み）
    - /api/clients/* 実装
  3. UI統合
    - Settings タブ（Workspace切替）
    - Admin タブ（メンバー管理・監査ログ）
  4. セキュリティミドルウェア統合
    - CSRF保護
    - レート制限
  5. スキップテスト解除（P1-1）
  6. パフォーマンス計測・改善（P1-2/4/5）

  ---
  以上で Phase 9-1（P0-1）の棚卸しレポートを完了します。

  コード変更は一切行わず、方針策定と一覧化に限定しました。
  ユーザーの承認をお待ちしています。