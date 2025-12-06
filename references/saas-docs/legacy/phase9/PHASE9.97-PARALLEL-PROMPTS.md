# Phase 9.97 並列作業プロンプト

> **実行順序**: Step 1 → (Step 2 || Step 3) → Step 4
> Step 1完了後、Step 2とStep 3は並列実行可能

---

## Step 1: 権限体系シンプル化 ✅ 完了

> **状態**: 完了（2025-11-26）
> **コミット**: `46ec8b2` Phase 9.97: global_role → system_role 完全移行

### 実装結果

**DB変更**（マイグレーション: `migrations/012-permission-system-update.sql`, `migrations/014-unify-system-role.sql`）:
- `users.system_role` カラムを SA/USER/TEST の3値に統一（旧 account_type を廃止）
- `workspace_members.role` を大文字に統一（OWNER/ADMIN/MEMBER）

**コード変更**:
- `lib/utils/permissions.ts` 新規作成（権限チェック関数を集約）
- `lib/types/database.ts` で `User.accountType: 'SA' | 'USER' | 'TEST'` を定義
- `lib/server/auth.ts` で `system_role` → `accountType` マッピング
- `lib/hooks/useWorkspace.ts` で `accountType` を返却

**注意**:
- DBカラムは `system_role` (SA/USER/TEST)、コード内での参照は `accountType`
- Phase 9.97 で旧 `account_type` カラムを廃止し、`system_role` を3値に統一

---

## Step 2: データ取得エラー修正 🔄 作業中

> **状態**: 作業中
> **前提**: Step 1 完了済み ✅

### 作業場所
```bash
# worktreeを使用中の場合
cd /Users/5dmgmt/.claude-worktrees/foundersdirect/<worktree-name>
git pull origin main  # Step 1の変更を取得
```

### プロンプト

```
Phase 9.97 Step 2: データ取得エラー修正

【前提】Step 1（権限整理）が完了していること
git pull origin main で最新を取得してから作業

【担当項目】
#1 ダッシュボード表示速度（5秒→3秒）
#6 既存客管理「データの取得に失敗しました」
#7 失注管理「データの取得に失敗しました」
#9 テンプレート集「Failed to fetch workspace data」

【共通問題の根本原因】
1. workspaceId が null の状態でAPI呼び出し
2. useWorkspace() の loading 完了前に fetch 実行

【修正パターン】
const { workspaceId, loading: workspaceLoading } = useWorkspace();

useEffect(() => {
  if (workspaceLoading || !workspaceId) return;
  fetchData();
}, [workspaceId, workspaceLoading]);

const fetchData = async () => {
  try {
    setLoading(true);
    const response = await fetch(`/api/workspaces/${workspaceId}/data`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    const { data } = await response.json();
    // データ処理...
  } catch (err) {
    setError(err instanceof Error ? err.message : '不明なエラー');
  } finally {
    setLoading(false);
  }
};

【#1 パフォーマンス改善】
複数APIを Promise.all で並列化

【対象ファイル】
- lib/hooks/useDashboardViewModel.ts
- lib/hooks/useClientsViewModel.ts
- lib/hooks/useLostDealsViewModel.ts
- lib/hooks/useTemplatesViewModel.ts

【確認方法】
1. npm run type-check && npm run build
2. 各タブを開いてエラーなし確認
3. ダッシュボード表示時間計測（3秒以内）

【コミット】
git commit -m "fix: Phase 9.97 Step 2 - データ取得エラー修正

- #1 ダッシュボード: API並列化で高速化
- #6 既存客管理: workspaceId nullチェック追加
- #7 失注管理: 同上
- #9 テンプレート集: 同上"
```

---

## Step 3: データ保存ロジック修正 + UI統一 🔄 作業中

> **状態**: 作業中（Step 2と並列実行可能）
> **前提**: Step 1 完了済み ✅

### 作業場所
```bash
# worktreeを使用中の場合
cd /Users/5dmgmt/.claude-worktrees/foundersdirect/<worktree-name>
git pull origin main  # Step 1の変更を取得
```

### プロンプト

```
Phase 9.97 Step 3: データ保存ロジック修正 + UI統一

【前提】Step 1（権限整理）が完了していること
git pull origin main で最新を取得してから作業

【担当項目】
#2 MVV保存失敗 + UI統一（閲覧/編集モード）
#3 ブランド指針保存 + UI統一（閲覧/編集モード）
#4 リーンキャンバス保存失敗
#5 見込み客追加失敗

【共通問題の根本原因】
PUT /api/workspaces/:id/data で version パラメータ未送信
楽観的排他制御で version が必須

【修正パターン】
const saveData = async (fieldName: string, newValue: unknown) => {
  // 1. GETでバージョン取得
  const { data: currentData, version } = await fetch(...).then(r => r.json());

  // 2. PUTでバージョン付き保存
  await fetch(..., {
    method: 'PUT',
    body: JSON.stringify({ data: { ...currentData, [fieldName]: newValue }, version }),
  });
};

【#2, #3 UI統一】リーンキャンバスタブと同じUIパターンを適用
参考：LeanCanvasTab.tsx 46-85行目のヘッダー実装

変更内容：
1. メインヘッダーに「閲覧モード/編集モード」切り替えボタンを追加
2. 編集モード時はヘッダー右側に「保存」ボタンも表示
3. 各セクションカード内の個別「編集」ボタンは廃止
4. 編集セクション内の「保存」「キャンセル」ボタンを削除（ヘッダーに移動）

MVVTab.tsx のヘッダー修正例:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
  <div>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
      <Target size={24} /> MVV・OKR
    </h2>
    <p style={{ margin: '5px 0 0 0', color: 'var(--text-light)' }}>
      Mission・Vision・Value と目標管理（OKR）を設定します。
    </p>
  </div>
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    <button onClick={toggleEditMode} className="btn btn-secondary">
      {editMode ? <Eye size={16} /> : <Edit3 size={16} />}
      {editMode ? '表示モード' : '編集モード'}
    </button>
    {editMode && (
      <button onClick={saveAll} disabled={saving} className="btn btn-primary">
        {saving ? '保存中...' : '保存'}
      </button>
    )}
  </div>
</div>
```

BrandTab.tsx のヘッダー修正例:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
  <div>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
      <Gem size={24} /> ブランド指針
    </h2>
    <p style={{ margin: '5px 0 0 0', color: 'var(--text-light)' }}>
      プロフィールとブランドガイドラインを設定します。
    </p>
  </div>
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    <button onClick={toggleEditMode} className="btn btn-secondary">
      {editMode ? <Eye size={16} /> : <Edit3 size={16} />}
      {editMode ? '表示モード' : '編集モード'}
    </button>
    {editMode && (
      <button onClick={saveAll} disabled={saving} className="btn btn-primary">
        {saving ? '保存中...' : '保存'}
      </button>
    )}
  </div>
</div>
```

ViewModel側の修正:
- useMVVOKRViewModel.ts: 統一された editMode と saveAll() 関数を追加
- useBrandViewModel.ts: 統一された editMode と saveAll() 関数を追加

【対象ファイル】
- lib/hooks/useMVVOKRViewModel.ts
- lib/hooks/useBrandViewModel.ts
- lib/hooks/useLeanCanvasViewModel.ts
- lib/hooks/useLeads.ts
- app/_components/mvv/MVVTab.tsx（UI統一）
- app/_components/brand/BrandTab.tsx（UI統一）

【確認方法】
1. npm run type-check && npm run build
2. 各タブで編集→保存→リロード
3. データが維持されていることを確認
4. UI確認：リーンキャンバスタブと同じ閲覧/編集モード切り替えパターンになっているか

【コミット】
git commit -m "fix: Phase 9.97 Step 3 - データ保存ロジック修正 + UI統一

- #2 MVV: version付きPUT + 閲覧/編集モードUI統一
- #3 ブランド指針: version付きPUT + 閲覧/編集モードUI統一
- #4 リーンキャンバス: version付きPUT
- #5 見込み客追加: version付きPUT
- UI統一: リーンキャンバスタブと同じヘッダーパターン適用"
```

---

## Step 4: UI/SA機能修正 ⏳ 待機

> **状態**: 待機（Step 2, 3 完了後に実行）
> **前提**: Step 1-3 全て完了後

### 作業場所
```bash
cd /Users/5dmgmt/プラグイン/foundersdirect
git pull origin main  # Step 2, 3 のマージ後
```

### プロンプト

```
Phase 9.97 Step 4: UI/SA機能修正

【前提】Step 1-3が全て完了してmainにマージされていること

【担当項目】
#8 設定タブ完了メッセージ削除
#10 SAタブ表示・試用期間機能

【#8 設定タブ】
以下の表示を完全削除:
✓ Phase 9.92-11 完了
設定タブの React 化が完了しました。

grep -rn "Phase 9.92-11\|完了しました" app/_components/settings/ lib/hooks/useSettingsViewModel.ts
該当箇所を特定して削除

【#10 SAタブ】
1. 表示条件: accountType === 'SA' のみ
2. ユーザー一覧をテーブル形式で美しく表示
3. 経過日数をバッジ表示
4. 14日超過ユーザーに警告表示

【対象ファイル】
- app/_components/settings/SettingsTab.tsx
- app/_components/admin/SADashboard.tsx
- lib/hooks/useSADashboardViewModel.ts

【確認方法】
1. npm run type-check && npm run build
2. 設定タブ: 完了メッセージなし
3. SAタブ: SA権限でログイン→表示確認

【コミット】
git commit -m "fix: Phase 9.97 Step 4 - UI/SA機能修正

- #8 設定タブ: 完了メッセージ削除
- #10 SAタブ: accountType対応、ユーザー一覧UI改善、経過日数表示"
```

---

## マージ手順

### Step 1完了後
```bash
git push origin main
```

### Step 2 & Step 3完了後
```bash
cd /Users/5dmgmt/プラグイン/foundersdirect
git merge phase997-step2 -m "Merge: データ取得エラー修正"
git merge phase997-step3 -m "Merge: データ保存ロジック修正"
npm run type-check && npm run build
git push origin main
```

### Step 4完了後
```bash
npm run type-check && npm run build
git push origin main

# worktree削除
git worktree remove ../.worktrees/step2-fetch
git worktree remove ../.worktrees/step3-save
```

---

## 実行フロー

```
Step 1: 権限体系シンプル化
          │
          ▼
    DB変更 + コード変更
          │
          ▼
    npm run type-check && build
          │
    ┌─────┴─────┐
    ▼           ▼
Step 2       Step 3
(取得)       (保存)
    │           │
    └─────┬─────┘
          ▼
    マージ & ビルド確認
          │
          ▼
    Step 4: UI/SA修正
          │
          ▼
    最終確認・プッシュ
```

---

## 現在の進捗状況

```
Step 1: 権限体系シンプル化 ✅ 完了
          │
          ▼
    ┌─────┴─────┐
    ▼           ▼
Step 2       Step 3
(取得)       (保存)
🔄 作業中   🔄 作業中
    │           │
    └─────┬─────┘
          ▼
Step 4: UI/SA修正 ⏳ 待機
```

---

**作成日**: 2025-11-26
**最終更新**: 2025-11-26
