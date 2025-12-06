# Phase 9.91 ランブック：大規模クリーンアップ & 構造改革 v2.0（Phase 9.93 統合版）

**最終更新:** 2025-11-25
**ステータス:** ✅ **完了（クローズ済み）**
**フェーズ役割**: 大規模クリーンアップ & 構造改革（レガシーコード隔離・ドキュメント標準化）

---

## ⚠️ 重要なお知らせ

**Phase 9.91 は正式に完了しました。本フェーズはクローズ済みです。**

このフェーズで定義されたタスクのうち、**未処理の残務はすべて Phase 9.92（全タブ再生）および Phase 9.93（最終バグ修正）へ引き継がれます。**

### 残務の引き継ぎ先

- **構造整合性検証系** → **Phase 9.93（最終バグ修正フェーズ）** に統合
  - Legacy Archiving 検証（CL-01）
  - Root Cleaning 検証（CL-02）
  - Docs Renaming 検証（CL-03）
  - Config Update 検証（CL-04）

本ランブックは記録として保持し、残務管理は Phase 9.93 で実施します。

### Phase 9.91 → Phase 9.93 の引き継ぎ内容

Phase 9.91 で定義された以下の 4つのタスクは、Phase 9.93 で完全に処理されます：

| タスクID | タスク名 | Phase 9.93 での扱い |
|---------|---------|-------------------|
| **CL-01** | Legacy Archiving | 「1.2 Phase 9.91 残務の統合」で検証・確認 |
| **CL-02** | Root Cleaning | 「1.2 Phase 9.91 残務の統合」で検証・確認 |
| **CL-03** | Docs Renaming | 「1.2 Phase 9.91 残務の統合」で検証・確認 |
| **CL-04** | Config Update | 「1.2 Phase 9.91 残務の統合」で検証・確認 |

### 次のアクション

Phase 9.91 の残務を処理する場合は、**Phase 9.93 ランブック**（`docs/PHASE9.93-BUGFIX-RUNBOOK.md`）を参照してください。

---

## 1. 目的と概要（アーカイブ）

Phase 10 の本格開発に入る前に、Next.js 移行過渡期に発生した「新旧コードの混在」と「ルートディレクトリの肥大化」を解消します。
これにより、AI エージェントのコンテキスト認識精度を高め、開発ミスを予防します。

### 1.1 達成目標

1.  **レガシーコードの隔離**: 旧 `js/` ディレクトリ等を `archive/` へ完全移動し、開発対象から外す。
2.  **ルートディレクトリの浄化**: 直下のスクリプト群や `index.html` を整理し、Next.js 標準構成にする。
3.  **ドキュメント標準化**: `DOCS/` を `docs/` (小文字) にリネームし、パスを標準化する。
4.  **ビルド設定の正常化**: 不要なファイルを除外し、`npm run build` / `test` が通る状態を維持する。

---

## 2. タスクカタログ（アーカイブ）

| ID | タスク名 | 対象 | 処置 | 完了指標 | Phase 9.93 での扱い |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CL-01** | **Legacy Archiving** | `js/`, `dist/`, `legacy-php/` | `archive/` へ移動 | ルートから消滅 | 検証・確認 |
| **CL-02** | **Root Cleaning** | `test-*.js`, `benchmark.js`, `index.html` | `scripts/` へ移動 or 削除 | ルートがすっきりする | 検証・確認 |
| **CL-03** | **Docs Renaming** | `DOCS/` | `docs/` へリネーム | フォルダ名変更完了 | 検証・確認 |
| **CL-04** | **Config Update** | `tsconfig.json`, `package.json` | パス参照の修正 | ビルド・スクリプトが通る | 検証・確認 |

---

## 3. サブフェーズ構成（アーカイブ）

### Phase 9.91-A: レガシーコードの隔離 (Archiving)

**目的**: AI が誤って古い `js/` 以下のファイルを読み込まないようにする。

**タスク**:
1.  **Archive Move**:
    - `js/` -> `archive/phase9-legacy-js/`
    - `dist/` -> `archive/phase9-legacy-dist/` (または削除)
    - `legacy-php/` -> `archive/legacy-php/`
2.  **Git Ignore**:
    - `.gitignore` から `dist/` を削除（アーカイブしたので）し、代わりに `.next/` が含まれているか確認。

**DOD**:
- [ ] ルートに `js/` フォルダが存在しない。
- [ ] `npm run build` が、移動した `js/` を参照せずに成功する（import エラーがあれば修正）。

**Phase 9.93 での扱い**:
- 「1.2 Phase 9.91 残務の統合 > CL-01: Legacy Archiving」で検証・確認

---

### Phase 9.91-B: ルートディレクトリの浄化 (Root Cleaning)

**目的**: Next.js プロジェクトとして標準的な構成にする。

**タスク**:
1.  **Scripts Move**:
    - `mkdir -p scripts/db scripts/performance`
    - `test-crud.js`, `test-connection.js` -> `scripts/db/`
    - `benchmark.js` -> `scripts/performance/`
    - `run-migration.ts` 等が `scripts/` 直下にあるか確認・整理。
2.  **File Removal**:
    - `index.html` -> `archive/legacy-index.html` (Next.js では不要)
    - `boot.yaml` -> `archive/boot.yaml` (用途不明なら退避)

**DOD**:
- [ ] ルートディレクトリのファイル数が 15個以下 になる（設定ファイルのみ）。

**Phase 9.93 での扱い**:
- 「1.2 Phase 9.91 残務の統合 > CL-02: Root Cleaning」で検証・確認

---

### Phase 9.91-C: ドキュメント構造の標準化 (Docs Rename)

**目的**: ディレクトリ名を小文字 `docs/` に統一し、Linux/Git での扱いを標準化する。

**タスク**:
1.  **Rename**: `git mv DOCS docs`
2.  **Link Fix**:
    - `docs/FDC-GRAND-GUIDE.md` 内の内部リンク (`DOCS/...`) を `docs/...` に置換。
    - `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` 内のリンクを修正。

**DOD**:
- [ ] フォルダが `docs` になっている。
- [ ] 主要ドキュメントのリンク切れがない。

**Phase 9.93 での扱い**:
- 「1.2 Phase 9.91 残務の統合 > CL-03: Docs Renaming」で検証・確認

---

### Phase 9.91-D: 設定整合性の確保 (Final Fix)

**目的**: 移動に伴うパス切れを修正し、開発環境を正常化する。

**タスク**:
1.  **Update Scripts**:
    - `package.json` の `scripts` 欄で、移動したファイルを参照している箇所を修正（例: `node test-crud.js` -> `node scripts/db/test-crud.js`）。
2.  **Update TSConfig**:
    - `tsconfig.json` の `include`/`exclude` を確認し、`archive` が除外され、`scripts` が含まれているか確認。
3.  **Import Check**:
    - プロジェクト全体で `from '../../js/...'` のような旧パス参照がないか grep して修正。

**DOD**:
- [ ] `npm run build` が成功する。
- [ ] `npm run type-check` が成功する。
- [ ] `npm test` (E2E) が成功する。

**Phase 9.93 での扱い**:
- 「1.2 Phase 9.91 残務の統合 > CL-04: Config Update」で検証・確認

---

## 4. Phase 9.93 への移行

### 4.1 Phase 9.91 の残務を処理する場合

Phase 9.91 の残務（未処理タスク）を処理する場合は、以下の手順に従ってください：

1. **Phase 9.93 ランブックを開く**:
   - `docs/PHASE9.93-BUGFIX-RUNBOOK.md` を参照

2. **該当するタスクを確認**:
   - 「1. Phase 9.9 / 9.91 残務の統合リスト > 1.2 Phase 9.91 残務の統合」で該当するタスクを確認

3. **検証方法を実施**:
   - 各タスクの「検証方法」に従って、動作を確認

4. **不具合があれば修正**:
   - 「4. バグ修正ワークフロー」に従って修正

5. **DOD を満たすまで繰り返す**:
   - 「5. 完了条件（DOD）> 5.5 Phase 9.91 残務要件」を満たすまで修正を繰り返す

### 4.2 Phase 9.93 で使用する Claude Code への指示テンプレート

```markdown
あなたは Founders Direct Cockpit (FDC) プロジェクトの Phase 9.93 担当エンジニアです。

【作業内容】
Phase 9.91 の残務を処理します。

【タスク】
- CL-01: Legacy Archiving
- CL-02: Root Cleaning
- CL-03: Docs Renaming
- CL-04: Config Update

【作業指示】
1. `docs/PHASE9.93-BUGFIX-RUNBOOK.md` を参照
2. 「1.2 Phase 9.91 残務の統合」に従って、各タスクを検証・確認
3. 「5.5 Phase 9.91 残務要件」を満たすまで修正を繰り返す

【完了レポート】
- 検証結果
- 修正内容（あれば）
- DOD チェック結果
```

---

## 5. 運用注意（アーカイブ）

- このフェーズ中は**機能開発を停止**すること。
- ファイル移動は必ず `git mv` を使用すること（履歴保持のため）。

---

## 6. アーカイブ情報

### 6.1 Phase 9.91 の実装状況（参考）

Phase 9.91 は以下のサブフェーズで構成されていました：

- **Phase 9.91-A**: レガシーコードの隔離 (Archiving)
- **Phase 9.91-B**: ルートディレクトリの浄化 (Root Cleaning)
- **Phase 9.91-C**: ドキュメント構造の標準化 (Docs Rename)
- **Phase 9.91-D**: 設定整合性の確保 (Final Fix)

### 6.2 Phase 9.91 の開発プロンプト（参考）

Phase 9.91 の実装時に使用していたプロンプトは、Phase 9.93 で統合されました。

Phase 9.93 の開発プロンプトは、`docs/PHASE9.93-BUGFIX-RUNBOOK.md` の「8. Claude Code への指示テンプレート」を参照してください。

---

## 7. FDC-GRAND-GUIDE 更新テンプレート

Phase 9.91 完了時に `docs/FDC-GRAND-GUIDE.md` を以下のように更新してください：

```markdown
### Phase 9.9: 緊急バグ修正 & ガバナンス強化
**ステータス**: ✅ 完了（残務は Phase 9.92/9.93 に委譲）
**目的**: 権限・リード管理・SAタブの実装
**残務**: Phase 9.93 で最終検証・修正を実施

### Phase 9.91: 大規模クリーンアップ & 構造改革
**ステータス**: ✅ 完了（残務は Phase 9.92/9.93 に委譲）
**目的**: レガシーコード隔離、ドキュメント標準化
**残務**: Phase 9.93 で最終検証を実施

### Phase 9.92: 全タブ再生プロジェクト
**ステータス**: 🚧 実装中
**目的**: 旧UI完全再現 + 全10タブのReact/ViewModel化
**アプローチ**: 1タブずつ順次移行（ダッシュボード → Leads → Clients → ...）

### Phase 9.93: 最終バグ修正 & 完全整合性確保
**ステータス**: ⏸️ 待機中（Phase 9.92 完了後に開始）
**目的**: UI差異・ロジック差異・Next.js固有バグをゼロ化
**スコープ**: Phase 9.9/9.91 残務 + Phase 9.92 移行で発生した差異修正

### Phase 10: TODO機能本格実装（Elastic Search統合）
**ステータス**: ⏸️ 待機中（Phase 9.93 完了後に開始）
**目的**: TODO管理の高度化、Elastic Action Map実装
```

---

## 8. キックオフ用プロンプト（アーカイブ）

以下のプロンプトは、Phase 9.91 の実装時に使用していたものです。
現在は Phase 9.93 に統合されているため、参考情報として残しています。

```markdown
あなたは FDC リードエンジニアです。

**状況:**
Phase 9.9（緊急バグ修正）が完了した後、Phase 10（TODO機能）へ進む前に、**プロジェクト構成の大規模なクリーンアップ**を実施します。
現状は旧構成（`js/`, `DOCS/`）と新構成（`lib/`, `docs/`）が混在しており、開発効率を阻害しています。

これを **Phase 9.91** として実行します。

**指示:**
以下の手順に従って準備と実行を行ってください。

---

## 手順 1: Grand Guide の更新

`DOCS/FDC-GRAND-GUIDE.md` を更新してください。

1.  **「0. 位置づけ > 現在の開発状況」** を更新:
    *   **Phase 9.9**: ✅ 完了
    *   **Phase 9.91**: 🚧 **進行中（大規模クリーンアップ & 構造改革）**
        *   目的: レガシーコード隔離、ドキュメントフォルダ標準化
    *   **Phase 10**: ⏸️ 待機中（9.91完了後に開始）

2.  **「10. Phase 8...」** セクションの直後に、以下の **「10-C. Phase 9.91」** を新規挿入:
    *   タイトル: Phase 9.91: クリーンアップ & 構造改革
    *   内容: `js/` 廃止、`DOCS`→`docs` リネーム、ルートディレクトリ整理。

---

## 手順 2: ランブックの作成

以下の内容で `DOCS/PHASE9.91-CLEANUP-RUNBOOK.md` を新規作成してください。

（省略）

## 手順 3: 実施

以下の順序で実施してください。

1. **Archiving**: `git mv js archive/phase9-legacy-js` 等を実行。
2. **Root Clean**: `test-*.js` 等を `scripts/db/` へ移動。
3. **Docs**: `git mv DOCS docs` を実行し、内部リンクを置換。
4. **Verification**: `npm run build` と `npm test` が通るまで修正。
```

---

**最終更新:** 2025-11-25
**次のアクション**: Phase 9.93 ランブック（`docs/PHASE9.93-BUGFIX-RUNBOOK.md`）を参照し、Phase 9.91 の残務を処理してください。
