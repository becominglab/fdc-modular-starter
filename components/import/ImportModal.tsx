/**
 * components/import/ImportModal.tsx
 *
 * CSV インポートモーダル
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useImport, type ImportType } from '@/lib/hooks/useImport';

interface ImportModalProps {
  isOpen: boolean;
  type: ImportType;
  onClose: () => void;
  onComplete: () => void;
}

const TYPE_LABELS: Record<ImportType, string> = {
  tasks: 'タスク',
  prospects: 'リード',
  clients: 'クライアント',
};

const SAMPLE_FORMATS: Record<ImportType, string> = {
  tasks: 'タイトル,説明,ステータス,優先度,予定日\n会議準備,資料作成,not_started,spade,2024-01-20',
  prospects: '会社名,担当者名,メールアドレス,電話番号,ステータス\n株式会社ABC,山田太郎,yamada@example.com,03-1234-5678,new',
  clients: '会社名,担当者名,メールアドレス,電話番号,契約日\n株式会社XYZ,鈴木花子,suzuki@example.com,03-9876-5432,2024-01-01',
};

export function ImportModal({ isOpen, type, onClose, onComplete }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const {
    importing,
    preview,
    result,
    error,
    uploadForPreview,
    confirmImport,
    reset,
  } = useImport();

  useEffect(() => {
    if (!isOpen) {
      reset();
      setClearExisting(false);
    }
  }, [isOpen, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadForPreview(file, type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadForPreview(file, type);
    }
  };

  const handleConfirm = async () => {
    await confirmImport(clearExisting);
  };

  const handleClose = () => {
    if (result?.success) {
      onComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {TYPE_LABELS[type]}のCSVインポート
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* 結果表示 */}
          {result && (
            <div className={`p-4 rounded-lg mb-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
                <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message}
                </span>
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ファイル選択 */}
          {!result && (
            <>
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  } ${importing ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2 text-gray-600">
                    {importing ? (
                      <Loader2 size={32} className="animate-spin" />
                    ) : (
                      <Upload size={32} />
                    )}
                    <span>CSVファイルを選択</span>
                    <span className="text-sm text-gray-400">
                      または、ここにドラッグ＆ドロップ
                    </span>
                  </div>
                </div>
              </div>

              {/* サンプルフォーマット */}
              {!preview && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">CSVフォーマット例:</p>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {SAMPLE_FORMATS[type]}
                  </pre>
                </div>
              )}

              {/* プレビュー */}
              {preview && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      プレビュー（{preview.validRows} / {preview.totalRows} 件が有効）
                    </p>
                  </div>

                  {/* バリデーションエラー */}
                  {preview.errors.length > 0 && (
                    <div className="mb-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-1">
                        {preview.errors.length}件のエラー
                      </p>
                      <ul className="text-xs text-yellow-700 list-disc list-inside">
                        {preview.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>
                            {err.row > 0 ? `行${err.row}: ` : ''}{err.message}
                          </li>
                        ))}
                        {preview.errors.length > 5 && (
                          <li>他 {preview.errors.length - 5} 件...</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* データテーブル */}
                  {preview.rows.length > 0 && (
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {preview.headers.map((h, i) => (
                              <th key={i} className="px-3 py-2 text-left font-medium text-gray-600">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i} className="border-t">
                              {preview.headers.map((h, j) => (
                                <td key={j} className="px-3 py-2 text-gray-700">
                                  {row[h] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          {/* 既存データクリアオプション */}
          <div>
            {preview && preview.validRows > 0 && !result && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className={clearExisting ? 'text-red-600 font-medium' : ''}>
                  既存データをクリアして取り込む
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2">
            {result ? (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                閉じる
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  キャンセル
                </button>
                {preview && preview.validRows > 0 && (
                  <button
                    onClick={handleConfirm}
                    disabled={importing}
                    className={`px-4 py-2 text-white rounded-md disabled:opacity-50 flex items-center gap-2 ${
                      clearExisting
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {importing && <Loader2 size={16} className="animate-spin" />}
                    {clearExisting ? '既存をクリアして' : ''}{preview.validRows}件をインポート
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
