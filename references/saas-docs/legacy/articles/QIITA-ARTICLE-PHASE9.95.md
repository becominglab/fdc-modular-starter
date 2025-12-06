# 【続々々報】Claude Code for Desktopが神すぎる件 - OAuthトークンの落とし穴と4並列開発術

## はじめに

[前回の記事](https://qiita.com/Takao-Mochizuki/items/4ad7bbb6ce217d2b8246)では、Claude Code for Desktopを使った4並列開発術を紹介しました。

今回はさらに踏み込んで、**9つのバグを並列worktreeで同時修正し、30分でmainにマージ完了**した実例をお見せします。

特に注目してほしいのは：
- **実際のプロンプト**（私がClaudeに投げた指示そのまま）
- **Gitの使い方**（worktree、stash、マージ戦略）
- **驚異的なスピード**（従来なら1日仕事が30分）

## 今回のミッション：Phase 9.95 バグ修正

Phase 9.92-9.94でReact移行を行った結果、9つのタブでバグが発生しました。

| # | タブ | 問題 |
|---|------|------|
| 1 | ダッシュボード | スキップリンクが常に表示 |
| 2 | ブランド指針 | API Error: 500 |
| 3 | 既存客管理 | データ取得失敗、終了客UI消失 |
| 4 | 見込み客追加 | 追加失敗、会社名必須誤り |
| 5 | 失注管理 | データ取得失敗 |
| 6 | テンプレート集 | workspace data取得失敗 |
| 7 | レポート | SA権限エラー |
| 8 | 管理者 | メンバー・監査ログ取得失敗 |
| 9 | SA | 表示不具合、試用期間機能なし |

従来の開発なら、1つずつ修正して「1日仕事」。でも今回は違います。

## 実際のプロンプト公開

### プロンプト1：技術負債の分析依頼

```
9.94の技術負債解消状況を分析して
```

たった1行。これだけで、Claudeは：
- ESLint警告の件数と内訳
- 4ワークストリームの進捗状況
- 残存課題と推奨アクション

を詳細にレポートしてくれました。

### プロンプト2：作業開始

```
では9.94 進めて
```

これで型チェック、ESLint修正、ユニットテスト、ビルド確認まで自動実行。

### プロンプト3：繰り越し理由の説明依頼

```
この残務を１０に残す合理的な説明を
```

Claudeの回答：

> 「外部境界の型定義は、Phase 10のアーキテクチャ変更（RSCフル導入）と同時に行う方が、二重作業を避けられ効率的」

納得感のある説明を即座に生成。

### プロンプト4：ランブック作成

```
１２の後の１３のランブックとして残務をまとめて　メインにもコピーして
```

Phase 13用のランブック（202行）を自動生成し、worktreeとmain両方にコミット。

### プロンプト5：並列作業のドキュメント化

```
ありがとう　今並列で処理させていることを9.95ランブックとして
```

**これが今回のハイライト**。私は別ターミナルで複数のClaude Codeセッションを並列実行していました。その全容を1つのランブック（273行）にまとめる指示です。

### プロンプト6：mainへのマージ

```
まずこれをメインにマージして
```

### プロンプト7：完了後のマージ統合

```
9.95　完了したよう　ランブックを修正し　全てのブランチをメインにマージ　コンフリクトも適切に解決して
```

**これ1行で**：
- 32個のworktreeを走査
- マージが必要な2ブランチを特定
- 順番にマージ
- 型エラーを発見・修正
- ビルド確認
- 完了コミット

## Gitの使い方が秀逸

### worktree一覧の把握

```bash
$ git worktree list
/Users/5dmgmt/プラグイン/foundersdirect                              4c08355 [main]
/Users/5dmgmt/.claude-worktrees/foundersdirect/bold-morse            3803df5 [bold-morse]
/Users/5dmgmt/.claude-worktrees/foundersdirect/condescending-cray    3fd6bcd [condescending-cray]
/Users/5dmgmt/.claude-worktrees/foundersdirect/strange-einstein      8156e70 [strange-einstein]
/Users/5dmgmt/.claude-worktrees/foundersdirect/serene-moore          4ce469d [serene-moore]
... (全32個)
```

Claudeは自動で**形容詞-科学者名**のブランチを生成します。`strange-einstein`とか`serene-moore`とか。

### mainとの差分チェック

```bash
for branch in bold-morse condescending-cray ...; do
  echo "=== $branch ==="
  git log $branch -1 --format="%h %s"
  ahead=$(git rev-list --count main..$branch)
  echo "  → main より $ahead コミット先行"
done
```

結果：
```
=== strange-einstein ===
8156e70 fix: 3つのUI/APIバグを修正
  → main より 1 コミット先行
=== serene-moore ===
4ce469d fix: レポート/管理者/SAタブの不具合修正と機能追加
  → main より 1 コミット先行
```

30個以上のworktreeから、**マージが必要な2つを自動特定**。

### stashを使ったコンフリクト回避

mainに未コミットの変更があると：

```
error: Your local changes to the following files would be overwritten by merge
```

Claudeは自動で：

```bash
git stash push -m "WIP: 9.95 bugfix progress"
git merge strange-einstein -m "Merge message..."
git stash pop
```

stash → マージ → pop の流れを自動実行。

### マージコミットの生成

```bash
git merge strange-einstein -m "$(cat <<'EOF'
Merge strange-einstein: UI/APIバグ修正

- ダッシュボード: スキップリンクCSS（フォーカス時のみ表示）
- ブランド指針・既存客管理: API 500エラー修正（JSONB/Base64両対応）
- 既存客管理: 契約満了先セクションUI復活

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

HEREDOCを使った複数行コミットメッセージ。絵文字とCo-Authored-Byも自動付与。

## 型エラーの自動修正

マージ後、型チェックでエラー発生：

```
app/api/audit-logs/route.ts(152,44): error TS2345
  Type '{ email: any; name: any; }[]' is missing the following properties
```

Supabaseのjoin結果が配列で返ってくる問題。Claudeは即座に修正：

```typescript
// Before
const userEmail = log.users?.email || '';

// After
const user = Array.isArray(log.users) ? log.users[0] : log.users;
const userEmail = user?.email || '';
```

型エラー2件を発見から修正まで**2分**。

## 最終結果

### コミット履歴

```
24297f7 fix: Phase 9.95完了 - 型エラー修正 + ランブック更新
13a5381 Merge serene-moore: レポート/管理者/SAタブ修正
91c5d97 Merge strange-einstein: UI/APIバグ修正
4ce469d fix: レポート/管理者/SAタブの不具合修正と機能追加
4c08355 fix: 見込み客追加・失注管理・テンプレート集タブのバグ修正
8156e70 fix: 3つのUI/APIバグを修正
```

### ビルド結果

```
Route (app)                    Size  First Load JS
├ ○ /dashboard               33.8 kB         145 kB
├ ○ /clients                  4.95 kB        107 kB
├ ƒ /api/audit-logs            153 B         102 kB
├ ƒ /api/workspaces/.../members 153 B        102 kB
```

**Dashboard First Load JS: 145KB**（目標達成）

### 追加されたファイル

```
app/api/admin/users/account-type/route.ts   - アカウント種別変更API
app/api/audit-logs/route.ts                  - 監査ログAPI
app/api/workspaces/[workspaceId]/members/route.ts - メンバー一覧API
lib/hooks/useSADashboardViewModel.ts         - SA管理画面ViewModel
migrations/011-add-account-type.sql          - account_type列追加
```

## スピード比較

| 作業 | 従来 | Claude Code |
|------|------|-------------|
| 9タブのバグ分析 | 2時間 | 3分 |
| 並列修正（9ブランチ） | 不可能 | 同時実行 |
| マージ・コンフリクト解決 | 1時間 | 5分 |
| 型エラー修正 | 30分 | 2分 |
| ドキュメント作成 | 2時間 | 3分 |
| **合計** | **1日（8時間）** | **30分** |

**16倍の高速化**。

## なぜこんなに速いのか

### 1. コンテキストの維持

Claude Codeはセッション中、すべてのファイル変更を記憶しています。「さっき直したあのファイル」と言えば通じる。

### 2. 並列worktreeの自動管理

`git worktree`という機能を知っている開発者は多いですが、実際に30個以上を同時運用している人は少ないでしょう。Claudeは：

- worktreeの作成
- ブランチ名の自動生成
- 変更状況の追跡
- マージ対象の特定

すべてを自動化します。

### 3. 「ゴールから逆算」する思考

「9.95完了したよう」と言うだけで、Claudeは：

1. 全worktreeの状態確認
2. mainとの差分チェック
3. マージ順序の決定
4. コンフリクト回避戦略
5. ビルド確認
6. ドキュメント更新

を自律的に実行。**私が指示したのは「完了したよう」の5文字だけ**。

## まとめ

Claude Code for Desktopは、もはや「コード補完ツール」ではありません。

**「プロジェクトマネージャー + シニアエンジニア + テクニカルライター」が1人で憑依したような存在**です。

次回予告：Phase 10（TODO機能 × 4象限 × Elastic Habits）の開発も、きっと神速で終わるでしょう。

---

**使用環境**
- Claude Code for Desktop
- Claude Opus 4（claude-opus-4-5-20251101）
- Next.js 15.5.6
- TypeScript 5.x
- Git worktree

**関連記事**
- [【続報】Claude Code for Desktopが神すぎる件](https://qiita.com/Takao-Mochizuki/items/xxx)
- [【続々報】Claude Code for Desktopが神すぎる件](https://qiita.com/Takao-Mochizuki/items/4ad7bbb6ce217d2b8246)
