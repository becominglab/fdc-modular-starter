# Encryption Allocation Table（暗号化割当表）

**Version:** 1.4 (Phase 14.6 対応)
**作成日:** 2025-11-24
**最終更新:** 2025-12-02
**参照元:** `docs/runbooks/PHASE14.6-*.md`
**適用範囲:** Founders Direct Cockpit 全データ項目

---

## 1. 目的と変更点 (v1.1)

本ドキュメントは、FDC で扱うデータ項目の**暗号化・圧縮・AI利用ポリシー**を定義します。
Phase 9.8 で導入される「AI機能」と「データ圧縮」に対応するため、以下のルールを追加しました。

1.  **AI プライバシー**: 外部 LLM (OpenAI等) 送信時に、個人情報 (PII) をどう処理するか。
2.  **容量最適化**: 暗号化によるサイズ増大を防ぐための圧縮プロセス。
3.  **検索性**: 暗号化データの検索方針。

---

## 2. 暗号化割当表（Encryption Allocation Table）

| UI項目 | データ種別 | 暗号化レベル | DB保存時 | API応答時 | **AI送信時 (Sanitize)** | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lead関連** |
| Lead名（氏名） | PII | High | ✓暗号化 | ✓復号 | **Mask / ID置換** | AIには "Lead A" 等で渡す |
| メールアドレス | PII | High | ✓暗号化 | ✓復号 | **× 除外** | AI分析に不要 |
| 電話番号 | PII | High | ✓暗号化 | ✓復号 | **× 除外** | AI分析に不要 |
| 会社名 | PII | High | ✓暗号化 | ✓復号 | **Mask / そのまま** | 設定依存 |
| 役職 | PII | Medium | ✓暗号化 | ✓復号 | ✓送信 | 分析に有用 |
| **Client関連** |
| クライアント名 | PII | High | ✓暗号化 | ✓復号 | **Mask / ID置換** | |
| 担当者氏名 | PII | High | ✓暗号化 | ✓復号 | **× 除外** | |
| 契約金額 | Business | Medium | ✓暗号化 | ✓復号 | ✓送信 | LTV分析等に使用 |
| **Task/Note関連** |
| タスクタイトル | Business | Medium | ✓暗号化 | ✓復号 | ✓送信 | |
| タスク詳細 | Business | Medium | ✓暗号化 | ✓復号 | ✓送信 | |
| メモ/ノート本文 | Business | High | ✓暗号化 | ✓復号 | ✓送信 | 最もAI活用する領域 |
| **Workspace全体** |
| workspace_data | Aggregate | Special | **圧縮 + 暗号化** | ✓復号 + 解凍 | **Sanitize処理** | Phase 9.8で圧縮導入 |

---

## 3. データ処理フロー定義

### 3.1 保存フロー（圧縮 + 暗号化）

Phase 9.8 以降、`workspace_data` などの巨大 JSON Blob は以下の順序で処理し、**250KB 制限** と **暗号化によるサイズ増大** のバランスを取ります。

```mermaid
graph LR
    A[Raw JSON] --> B[Minify]
    B --> C[Compress (Gzip)]
    C --> D[Encrypt (AES-256)]
    D --> E[DB Storage]
```

*   **Minify**: 不要な空白除去（JSON.stringify）
*   **Compress**: `CompressionStream` (Gzip/Deflate) を使用。**目安 50% 以下のサイズ** に縮小。
*   **Encrypt**: 圧縮されたバイナリに対して AES-256-GCM を適用。

### 3.2 AI 送信フロー（Sanitize + Proxy）

AI (LLM) はサーバーサイド (`api/ai/chat`) からのみアクセス可能とし、クライアントから送信されたデータは以下のフィルターを通します。

1.  **Decrypt**: クライアントサイドで復号。
2.  **Sanitize (AI Context Serializer)**:
    *   **PII 除去**: メール、電話番号、住所などのフィールドを削除。
    *   **ID 置換**: 具体的な個人名を "User A", "Client B" などの仮名、または内部IDに置換（文脈維持のため）。
    *   **構造簡素化**: JSON から Markdown 形式等へ変換し、トークン消費を抑える。
3.  **Send**: サーバーへ送信（サーバーはログに残さず LLM へスルー）。

---

## 4. 検索性（Searchability）ポリシー

現在 FDC は「クライアントサイド全件取得」アーキテクチャのため、サーバーサイドでの暗号化データの検索（LIKE検索等）は原則行いません。

ただし、将来的にユニーク制約チェック（重複登録防止）などが必要になった場合は、以下の手法を採用します：

*   **Blind Indexing**:
    *   検索が必要なカラム（Email等）に対し、`hmac(email, search_key)` を計算したハッシュ値を別カラム `email_index` として保存する。
    *   これにより、平文を保存せずに完全一致検索が可能になる。
    *   *Phase 9.8 時点では未実装（必要になったら追加）。*

---

## 5. 凡例（用語定義）

| 用語 | 定義 | AI送信時の扱い |
| :--- | :--- | :--- |
| **PII** | 個人識別情報 (氏名, 連絡先) | **原則除外** (分析に必須な場合のみMaskして送信) |
| **Business** | 機密ビジネス情報 (戦略, 売上) | **送信可** (AI分析の主対象) |
| **Mask** | マスキング | "J*** D**" や "Client-001" のように匿名化すること |
| **Omit** | 除外 | JSON キーごと削除し、AI に渡さないこと |
| **Sanitize** | 無害化処理 | Mask と Omit を組み合わせ、AI 用コンテキストを生成する処理 |

---

## 6. 実装チェックリスト

**Phase 14.4 完了状況（2025-12-02）:**

### AI 基盤
*   ✅ `lib/core/ai-context.ts` (Serializer) が、メール・電話番号を **除外** していること。
    - `excludeEmail()` 実装完了
    - `excludePhone()` 実装完了
*   ✅ `lib/core/ai-context.ts` が、氏名を **イニシャルまたはID** に置換していること。
    - `maskName()` 実装完了
    - 例: "田中太郎" → "T***"
*   ✅ AI Gateway (`app/api/ai/chat/route.ts`) 実装完了
    - レート制限 5req/min
    - AI有効化フラグチェック
    - 監査ログ記録
*   ✅ Pino 構造化ログで機密情報マスキング
    - password, token, accessToken, refreshToken, apiKey, secret, authorization, cookie, sessionId, encryptionKey, privateKey, clientSecret, googleClientSecret, googleRefreshToken

### セキュリティ基盤
*   ✅ セッションキャッシュ（Vercel KV）
    - TTL 5分、DB 負荷 90% 削減
*   ✅ セッション JOIN 最適化（Phase 14.6）
    - 3クエリ → 1クエリ（users INNER JOIN）
*   ✅ レート制限（Sliding Window Counter）
    - エンドポイント別設定
*   ✅ 楽観的ロック API 実装（409 Conflict 対応）
    - `workspace_data.version` カラム
*   ✅ スキーマバリデーション（Zod）
    - `lib/core/validator.ts`
*   ✅ AI使用量追跡（Phase 14.6）
    - `lib/server/ai-cost.ts`

### データ処理
*   ✅ データ圧縮（Gzip）
    - 50-70% サイズ削減
*   ✅ キャッシュ制御
    - セッション: Vercel KV (5分)
    - ワークスペースデータ: 60秒

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
| :--- | :--- | :--- |
| 1.0 | 2025-11-16 | 初版作成 |
| 1.1 | 2025-11-24 | AI送信ポリシー(Sanitize)、データ圧縮(Gzip)ポリシーを追加 |
| 1.2 | 2025-01-24 | Phase 9.8-B 完了ステータス反映（AI Context Control 実装完了） |
| 1.3 | 2025-12-02 | Phase 14.4 完了反映（セッションキャッシュ、レート制限、構造化ログ追加） |
| **1.4** | **2025-12-02** | **Phase 14.6 対応（セッション JOIN 最適化、AI使用量追跡追加）** |
