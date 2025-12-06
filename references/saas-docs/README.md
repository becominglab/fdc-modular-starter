# SaaS版ドキュメント（参照用）

> **本フォルダは FDC SaaS版（本番運用中）のドキュメントのコピーです。**
> **Workshop開発時の参照資料として使用してください。**

---

## コピー日時

2025-12-06

## ソース

`/Users/5dmgmt/プラグイン/foundersdirect/docs/`

---

## フォルダ構成

```
saas-docs/
├── README.md ................. 本ファイル
├── FDC-GRAND-GUIDE.md ........ SaaS版グランドガイド（最重要）
├── FDC-CORE.md ............... SaaS版コアガイド
├── CHANGELOG.md .............. SaaS版変更履歴
├── DOC-SPLIT-MAP.md .......... ドキュメント分割マップ
│
├── guides/ ................... 技術ガイド
│   └── DEVELOPMENT.md ........ 開発ガイド（700行以上の詳細）
│
├── runbooks/ ................. Phase別ランブック
│   ├── PHASE16-*.md .......... タスクシステムv4
│   ├── PHASE17-*.md .......... ActionMap v2
│   ├── PHASE18-*.md .......... OKR v2
│   └── PHASE19-*.md .......... AI実装
│
├── specs/ .................... 設計仕様書
├── 規約/ ..................... コーディング規約
├── REVIEW/ ................... レビュー資料
└── legacy/ ................... 過去のPhaseドキュメント
```

---

## 使い方

### ランブック作成時

```
## 必読ドキュメント

| ドキュメント | パス | 目的 |
|------------|------|------|
| SaaS版グランドガイド | `Workshop/references/saas-docs/FDC-GRAND-GUIDE.md` | 全体アーキテクチャ |
| SaaS版開発ガイド | `Workshop/references/saas-docs/guides/DEVELOPMENT.md` | コーディング規約・詳細技術 |
| SaaS版ランブック | `Workshop/references/saas-docs/runbooks/` | ランブック形式の参考 |
```

### 主要参照ファイル

| 目的 | ファイル |
|------|---------|
| **アーキテクチャ全体像** | `FDC-GRAND-GUIDE.md` |
| **コーディング規約** | `guides/DEVELOPMENT.md` |
| **3層アーキテクチャ設計** | `runbooks/PHASE16-TASK-SYSTEM-V4-RUNBOOK.md` |
| **ランブック形式** | `runbooks/PHASE19-AI-IMPLEMENTATION-RUNBOOK.md` |
| **セキュリティ** | `guides/DEVELOPMENT.md` セクション12 |

---

## 注意事項

1. **参照専用**: 本フォルダ内のファイルは編集しないでください
2. **最新版確認**: 最新版が必要な場合は `/foundersdirect/docs/` を参照
3. **Workshop版との違い**: SaaS版はマルチテナント対応・Supabase統合済み

---

**Last Updated**: 2025-12-06
