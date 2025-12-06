あなたは Founders Direct Cockpit (FDC) の Phase 9 認証まわりを
「JWT ベース → サーバーサイドセッション方式」に全面移行する
リファクタリング担当エンジニアです。

目的：
- 既存の JWT Cookie (`fdc_jwt`) ベース認証を廃止し、
  サーバー側セッション（DB＋ランダムID Cookie）方式に移行する。
- その際、DB スキーマ/RLS/暗号化設計/既存の API 群に対する外部インターフェースは
  できるだけ壊さず、変更範囲を「認証レイヤー」に集中させる。
- Phase 9 RUNBOOK と HOW-TO-DEVELOP のポリシーに従い、
  破壊的変更を最小限にしつつ、長期安定運用に耐える設計にする。

プロジェクトルート（仮）：
- /Users/5dmgmt/プラグイン/founderdirect/founders-direct-modular
（実際のパスが違う場合は `pwd` で確認して読み替えること）

--------------------------------
【事前に必ず読むドキュメント】
--------------------------------

作業前に、以下のドキュメントを開き、認証・暗号化・RLS の前提と制約を把握してください。

- DOCS/FDC-GRAND-GUIDE.md
- DOCS/PHASE9-ENCRYPTION-AND-API-RUNBOOK.md
- DOCS/PHASE9_AUTH_ISSUE_SUMMARY.md（名称に揺れがあれば `ls DOCS` で探索）
- DOCS/HOW-TO-DEVELOP.md

特に守るべき点：
- Phase 9 は「既存機能の完成」フェーズである事
- 暗号化テーブルや workspace_data の設計、RLS ポリシーは基本変更しない
- 変更は「認証ロジック」と「フロントのログインフロー」に集中させる
- diff ベースの最小パッチで実装する

--------------------------------
【今回のゴール（要件定義）】
--------------------------------

1. JWT を廃止し、以下のモデルの「セッション方式」に移行すること：

   - DB に `sessions`（仮名）テーブルを追加：
     - id（session_id）: ランダム文字列 or UUID（主キー）
     - user_id: 既存 users テーブルの id
     - workspace_id: 該当ワークスペースID
     - role: EXEC / MANAGER / MEMBER / ADMIN など
     - created_at, expires_at
     - revoked_at（任意）
   - バックエンドは **このセッションテーブルを唯一の認証情報** として使う

2. Cookie 設計：

   - 名前：`fdc_session`
   - 値：セッションID（ランダム文字列 or UUID）
   - 属性：
     - HttpOnly
     - Path=/ 
     - Max-Age=604800（7日） ※後で調整可
     - SameSite=Lax
     - Domain は **指定しない**
     - Secure は APP_ENV=production または NODE_ENV=production のときのみ付与

3. 新規 API（または既存の置き換え）：

   - `POST /api/auth/google`
     - Google トークンを検証し、user + workspace + role を確定
     - `sessions` テーブルに新しいセッションを INSERT
     - `Set-Cookie: fdc_session=...` を返す
     - レスポンス JSON: `{ success: true, data: { user: {...}, workspaceId, role } }`

   - `GET /api/auth/session`（新規）
     - Cookie の fdc_session からセッションを検索
     - 有効であれば user + role + workspaceId を返す
     - 無効/期限切れなら 401 or 403 を返す

   - `POST /api/auth/logout`（新規 or 既存修正）
     - Cookie の fdc_session を参照し、該当セッションを無効化（削除 or revoked_at 設定）
     - `Set-Cookie` で `fdc_session` を Max-Age=0 で破棄

4. 認証ミドルウェア：

   - これまで JWT を検証していた `api/_lib/middleware.ts` を
     「セッションテーブル読み込み」ベースに書き換える。
   - 流れ：
     1. Request Headers から Cookie を取得
     2. `fdc_session` をパース
     3. DB の `sessions` テーブルから該当行を取得
     4. 存在し、有効期限内かつ revoked されていなければ `user_id` / `workspace_id` / `role` をコンテキストに載せる
     5. RLS 用の `setRLSUserId()` なども、この `user_id` を元に呼び出す

5. フロントエンド側：

   - `js/main.ts` の Google ログインフローを、新しい `/api/auth/google` + `/api/auth/session` に対応させる。
   - 初期ロード時、`unlockApp()` または同等処理では
     - `/api/auth/session` を叩いてログイン状態を判定
     - 成功なら APP_STATE.currentUser に反映し Dashboard を表示
     - 401/403 ならロック画面を表示
   - 既存の `fetchCurrentUserWithRole()` / `/api/auth/roles` がある場合、
     可能であれば `/api/auth/session` を内部で呼ぶようにリファクタして徐々に置き換える。

6. JWT 関連コードの扱い：

   - JWT 生成/検証ロジック（例：`api/_lib/jwt.ts`）は **新コードでは使わない**。
   - ただし急に全削除せず、次のポリシーで扱う：
     - まずは新セッション方式に移行し、動作確認が取れてから
     - 未使用になった JWT ユーティリティ/コードを別 PR で削除できるよう、
       コメントや TODO で「現在未使用」であることを明示する。

--------------------------------
【作業ステップの指示】
--------------------------------

### Step 0. 関連ファイルの洗い出し

次のファイルを検索・確認し、どこを触るかを最初に箇条書きしてください：

- `api/auth/google.ts`
- `api/auth/roles.ts`（あれば）
- `api/auth/logout.ts` / `api/auth/signout.ts` 等（あれば）
- `api/_lib/middleware.ts`
- `api/_lib/jwt.ts` や Token 関連ユーティリティ
- `api/_lib/db.ts` / Prisma schema / Supabase クライアント定義
- `js/main.ts`（Google ログイン関連・unlockApp）
- `js/core/apiClient.ts`（`fetchCurrentUserWithRole`など）
- 認証やユーザー情報取得に関する他の API

この時点で、
「どのファイルのどの関数をどう置き換えるつもりか」を簡潔にまとめてから実装に入ってください。

### Step 1. セッションテーブルを設計・実装

1. 現在の ORM / DB アクセス層を確認する（Prisma か、Supabase client か等）。
2. それに合わせて `sessions` テーブル（または同等モデル）を追加する。

例（Prisma の場合のイメージ。実際の schema.prisma に合わせて調整してください）：

```prisma
model Session {
  id           String   @id @default(cuid())
  userId       String
  workspaceId  String
  role         String
  createdAt    DateTime @default(now())
  expiresAt    DateTime
  revokedAt    DateTime?

  user         User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([workspaceId])
}
実際の User / Workspace モデル名に合わせて修正すること。

Supabase の生 SQL を使っている場合は、migration SQL を作成すること。

セッション生成・検証・無効化のユーティリティ関数を api/_lib/session.ts のような新規ファイルにまとめることを推奨：

createSession(userId, workspaceId, role): Promise<Session>

getSessionById(sessionId): Promise<Session | null>

revokeSession(sessionId): Promise<void>

有効期限切れをチェックするロジックもここにまとめる。

Step 2. /api/auth/google.ts の全面リファクタ
現状の /api/auth/google.ts を読み、JWT 発行部分を特定する。

ロジックを次のように書き換える：

Google の Access Token / ID Token 検証ロジックは基本そのまま活かす。

検証後：

users テーブルで該当ユーザーを upsert（既存ロジックを流用）

workspaceId / role を決定（既存ロジックを流用）

createSession(userId, workspaceId, role) を呼び出し、新しい Session を作成

レスポンスヘッダに Set-Cookie: fdc_session=... をセット

Cookie 属性は前述の要件通り：

HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; (APP_ENV/ NODE_ENV が production のときのみ Secure)

Domain は指定しない

レスポンスボディ例：

ts
コードをコピーする
return new Response(JSON.stringify({
  success: true,
  data: {
    user: { id: user.id, email: user.email, role, workspaceId },
  },
}), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Set-Cookie': setCookieHeader,
    // CORSヘッダは既存の response.ts のヘルパーで統一
  },
});
export const runtime = 'nodejs'; を明示して、Edge Runtime を避ける。

JWT 関連の import / 呼び出しは削除 or コメントアウトし、
「セッション方式に移行済み」であることをコメントしておく。

Step 3. /api/auth/session.ts（新規）を実装
新しい Route Handler /api/auth/session を追加。

処理フロー：

Request から Cookie ヘッダを取得

fdc_session をパース

getSessionById(sessionId) でセッションを取得

無効/期限切れなら 401

有効なら、userId からユーザー情報を取得し、以下の JSON を返す：

json
コードをコピーする
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "role": "EXEC",
    "workspaceId": "..."
  }
}
ここでも export const runtime = 'nodejs'; を指定。

将来的には /api/auth/roles をこの /api/auth/session を使う実装に置き換えても良いが、Phase 9 では互換性を維持するため roles.ts 側を内部委譲する形にしてもよい。

Step 4. middleware.ts をセッション方式に書き換え
getTokenFromRequest() など JWT 専用のメソッドがある場合、次のように変更：

Cookie ヘッダから fdc_session を最優先で読む

取得した sessionId を getSessionById() に渡す

有効なセッションがあれば userId を RLS にセット

JWT の decode/verify は新コードでは使わない

すべての認証必須 API がこのミドルウェア経由で
「セッション→ユーザー情報→RLS」になるように整合を取る。

ログには、次のようなステップを出力しておくとデバッグしやすい：

Step 1: Getting sessionId from Cookie

Step 2: Fetching session from DB

Step 3: Validating session expiry

Step 4: Setting RLS userId

Step 5. /api/auth/roles.ts の扱い
既存の /api/auth/roles.ts を開き、

現在 JWT から payload を読む実装を、

新セッション方式のヘルパー（例：getCurrentUserFromSession(request)）を呼ぶ実装に差し替える。

つまり /api/auth/roles は内部的に /api/auth/session 相当の処理を呼び、
既存のフロントコードとの互換性を維持する。

可能であれば、コメントで

「Phase 9 時点では互換レイヤーとして残している」

「将来的には /api/auth/session に統合予定」
を明記する。

Step 6. /api/auth/logout.ts（無ければ新規）を実装
Cookie の fdc_session を読み取る。

revokeSession(sessionId) を呼んでセッションを無効化。

Set-Cookie で fdc_session を Max-Age=0 / 空文字 などにして削除。

Step 7. フロントエンド（js/main.ts / js/core/apiClient.ts）の調整
Google ログイン後のフロー：

これまで：/api/auth/google → JWT Cookie → unlockApp() → /api/auth/roles

今後： /api/auth/google → fdc_session Cookie → unlockApp() → /api/auth/session（または /api/auth/roles 経由）

fetchCurrentUserWithRole() が /api/auth/roles を呼んでいる場合、

/api/auth/session を呼ぶヘルパーに置き換えるか、

/api/auth/roles 側でセッション方式に対応していることを前提にそのままでも良い。

unlockApp() のロジックは基本そのまま活かしつつ、

401/403 の場合は「未ログイン」として auth guard を維持するようにエラーハンドリングを整理する。

ログイン状態の復元（リロード時）は

初回ロード時に /api/auth/session を叩いて currentUser をセットする形を推奨。

Step 8. テスト・検証・diff 出力
ローカルで以下を必ず実行：

npm run type-check

npm run build

可能であれば認証関連の E2E テストも実行

動作確認手順を明記：

ローカル（http://localhost:3000）で Google ログイン

Developer Tools → Application → Cookies で fdc_session が存在すること

Network タブで /api/auth/session が 200 を返すこと

リロードしても Dashboard が表示され続けること

/api/auth/logout の後に fdc_session が削除され、再読み込みでログイン画面に戻ること

最後に、変更したファイルの diff を
1つのコードブロックにまとめて出力すること（git diff 相当）。

schema（もしくは migration）、session ユーティリティ

/api/auth/google.ts

/api/auth/session.ts

/api/auth/logout.ts

api/_lib/middleware.ts

必要に応じて /api/auth/roles.ts

js/main.ts

js/core/apiClient.ts 等

diff の最後に PATCH COMPLETE と記載すること。

【重要】
Phase 9 の他タスクに影響を出さないよう、変更は「認証・認可レイヤー」に集中させる。

セッション方式移行後も、暗号化・RLS・workspace_data テーブルは一切変更しない。

既存の JWT ユーティリティは、この Phase では 削除せず 未使用コメントを付ける程度に留め、
後続フェーズで「安全に削除するためのタスクリスト」を作成して報告すること。

以上に従い、セッション方式への移行パッチと検証レポートを作成してください。
