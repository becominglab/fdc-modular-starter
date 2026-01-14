# Phase 24: データインポート（CSV取り込み）

## 概要
CSV ファイルからデータを一括インポートする機能を実装します。
Phase 23 の CSV エクスポートと対になる機能です。

## 機能要件

### 対応データ
- タスク
- リード（見込み客）
- クライアント

### インポート機能
- CSV ファイルアップロード
- プレビュー表示（取り込み前確認）
- バリデーション（必須項目・形式チェック）
- エラー行のスキップ/修正オプション
- インポート結果サマリー

## 実装ステップ

### Step 1: インポートユーティリティ作成
**ファイル**: `lib/utils/import.ts`

```typescript
/**
 * CSV パース・バリデーションユーティリティ
 */

export interface ParseResult<T> {
  data: T[];
  errors: { row: number; message: string }[];
  totalRows: number;
  validRows: number;
}

export function parseCSV(content: string): string[][] {
  // BOM除去、行分割、カンマ分割
}

export function validateRow<T>(
  row: string[],
  columns: { key: keyof T; required: boolean; validate?: (v: string) => boolean }[],
  rowIndex: number
): { data: Partial<T> | null; error: string | null } {
  // 各カラムのバリデーション
}
```

### Step 2: インポート API 作成
**ファイル**:
- `app/api/import/tasks/route.ts`
- `app/api/import/prospects/route.ts`
- `app/api/import/clients/route.ts`

```typescript
// POST /api/import/tasks
export async function POST(request: NextRequest) {
  // 1. 認証チェック
  // 2. FormData から CSV ファイル取得
  // 3. パース & バリデーション
  // 4. プレビューモードならデータ返却
  // 5. 確定モードなら DB 挿入
  // 6. 結果サマリー返却
}
```

### Step 3: インポートフック作成
**ファイル**: `lib/hooks/useImport.ts`

```typescript
export function useImport(workspaceId: string | null) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const uploadForPreview = async (file: File, type: ImportType) => { ... };
  const confirmImport = async () => { ... };
  const cancelImport = () => { ... };

  return { importing, preview, result, uploadForPreview, confirmImport, cancelImport };
}
```

### Step 4: インポートモーダル作成
**ファイル**: `components/import/ImportModal.tsx`

```typescript
interface ImportModalProps {
  isOpen: boolean;
  type: 'tasks' | 'prospects' | 'clients';
  onClose: () => void;
  onComplete: () => void;
}

export function ImportModal({ isOpen, type, onClose, onComplete }: ImportModalProps) {
  // 1. ファイル選択 UI
  // 2. プレビューテーブル
  // 3. エラー表示
  // 4. 確定/キャンセルボタン
  // 5. 結果サマリー表示
}
```

### Step 5: 各ページにインポートボタン追加
- `app/(app)/tasks/page.tsx`
- `app/(app)/leads/page.tsx`
- `app/(app)/clients/page.tsx`

```tsx
<button onClick={() => setIsImportOpen(true)}>
  <Upload size={18} />
  CSV取り込み
</button>

<ImportModal
  isOpen={isImportOpen}
  type="tasks"
  onClose={() => setIsImportOpen(false)}
  onComplete={refresh}
/>
```

### Step 6: 型チェック & ビルド
```bash
npm run type-check
npm run build
```

### Step 7: 動作確認
1. タスクページで CSV 取り込みボタンをクリック
2. サンプル CSV をアップロード
3. プレビュー表示を確認
4. インポート実行
5. データが追加されることを確認
6. エラー行がある場合のハンドリング確認

### Step 8: Git プッシュ
```bash
git add -A
git commit -m "Phase 24: データインポート（CSV取り込み）機能を実装"
git push
```

## CSV フォーマット

### タスク
```csv
タイトル,説明,ステータス,優先度,期限
会議準備,資料作成,not_started,spade,2024-01-20
```

### リード
```csv
会社名,担当者名,メールアドレス,電話番号,ステータス,流入元
株式会社ABC,山田太郎,yamada@example.com,03-1234-5678,new,web
```

### クライアント
```csv
会社名,担当者名,メールアドレス,電話番号,契約金額,契約開始日
株式会社XYZ,鈴木花子,suzuki@example.com,03-9876-5432,500000,2024-01-01
```

## 注意事項
- 文字コード: UTF-8（BOM あり/なし両対応）
- 1行目はヘッダー行として扱う
- 空行はスキップ
- 重複チェックはしない（同じデータが複数回インポートされる可能性あり）

## 完了条件
- [ ] CSV パースユーティリティが動作する
- [ ] インポート API が動作する
- [ ] プレビュー表示が正しく動作する
- [ ] バリデーションエラーが表示される
- [ ] インポート成功後にデータが追加される
- [ ] 型チェック・ビルドが通る
