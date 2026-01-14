/**
 * lib/utils/import.ts
 *
 * CSV インポートユーティリティ
 */

export interface ParsedRow {
  [key: string]: string;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  errors: ValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * BOM を除去する
 */
function removeBOM(content: string): string {
  // UTF-8 BOM (U+FEFF)
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  // UTF-8 BOM as string (\uFEFF)
  if (content.startsWith('\uFEFF')) {
    return content.slice(1);
  }
  // UTF-8 BOM bytes が文字列として残っている場合
  if (content.startsWith('\xEF\xBB\xBF')) {
    return content.slice(3);
  }
  return content;
}

/**
 * CSV の1行をパースする（クォート対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * ヘッダーを正規化する（クォート、空白、不可視文字を除去）
 */
function normalizeHeader(header: string): string {
  return header
    .replace(/^[\s"']+|[\s"']+$/g, '') // 前後のクォート・空白を除去
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅文字を除去
    .normalize('NFC') // Unicode正規化
    .trim();
}

/**
 * CSV 文字列をパースする
 */
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const cleanContent = removeBOM(content);
  const lines = cleanContent.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  return { headers, rows };
}

/**
 * ヘッダーのマッピング定義
 */
export const COLUMN_MAPPINGS = {
  tasks: {
    タイトル: 'title',
    説明: 'description',
    ステータス: 'status',
    優先度: 'suit',
    期限: 'scheduled_date',
    予定日: 'scheduled_date',
    作成日: 'created_at',
    title: 'title',
    description: 'description',
    status: 'status',
    suit: 'suit',
    priority: 'suit',
    scheduled_date: 'scheduled_date',
    due_date: 'scheduled_date',
    created_at: 'created_at',
  } as Record<string, string>,
  prospects: {
    会社名: 'company',
    担当者名: 'name',
    メールアドレス: 'email',
    電話番号: 'phone',
    ステータス: 'status',
    備考: 'notes',
    作成日: 'created_at',
    company: 'company',
    name: 'name',
    email: 'email',
    phone: 'phone',
    status: 'status',
    notes: 'notes',
    created_at: 'created_at',
  } as Record<string, string>,
  clients: {
    会社名: 'company',
    担当者名: 'name',
    メールアドレス: 'email',
    電話番号: 'phone',
    契約日: 'contract_date',
    契約開始日: 'contract_date',
    備考: 'notes',
    作成日: 'created_at',
    company: 'company',
    name: 'name',
    email: 'email',
    phone: 'phone',
    contract_date: 'contract_date',
    notes: 'notes',
    created_at: 'created_at',
  } as Record<string, string>,
};

/**
 * 必須カラム定義
 */
export const REQUIRED_COLUMNS = {
  tasks: ['title'],
  prospects: ['name', 'company'],
  clients: ['name', 'company'],
};

/**
 * ステータスの有効値
 */
export const VALID_VALUES = {
  taskStatus: ['not_started', 'in_progress', 'done', '未着手', '進行中', '完了'],
  taskSuit: ['spade', 'heart', 'diamond', 'club', 'スペード', 'ハート', 'ダイヤ', 'クラブ', ''],
  prospectStatus: ['new', 'approaching', 'negotiating', 'proposing', 'won', 'lost', '新規', 'アプローチ中', '商談中', '提案中', '成約', '失注'],
};

/**
 * 値の正規化
 */
export function normalizeValue(key: string, value: string): string {
  const statusMap: Record<string, string> = {
    未着手: 'not_started',
    進行中: 'in_progress',
    完了: 'done',
    新規: 'new',
    アプローチ中: 'approaching',
    商談中: 'negotiating',
    提案中: 'proposing',
    成約: 'won',
    失注: 'lost',
  };

  const suitMap: Record<string, string> = {
    スペード: 'spade',
    ハート: 'heart',
    ダイヤ: 'diamond',
    クラブ: 'club',
  };

  if (key === 'status' && statusMap[value]) {
    return statusMap[value];
  }

  if (key === 'suit' && suitMap[value]) {
    return suitMap[value];
  }

  return value;
}

/**
 * CSV をパースしてバリデーション付きで結果を返す
 */
export function parseAndValidate(
  content: string,
  type: 'tasks' | 'prospects' | 'clients'
): ParseResult {
  const { headers, rows } = parseCSV(content);
  const mapping = COLUMN_MAPPINGS[type];
  const required = REQUIRED_COLUMNS[type];

  const errors: ValidationError[] = [];
  const parsedRows: ParsedRow[] = [];

  // ヘッダーをマッピング（正規化したキーで検索）
  const mappedHeaders = headers.map((h) => {
    // 直接マッチ
    if (mapping[h]) return mapping[h];
    // 正規化してマッチ
    const normalizedH = h.normalize('NFC').trim();
    if (mapping[normalizedH]) return mapping[normalizedH];
    // マッピングのキーも正規化して比較
    for (const [key, value] of Object.entries(mapping)) {
      if (key.normalize('NFC').trim() === normalizedH) {
        return value;
      }
    }
    return h;
  });

  // 必須カラムのチェック
  for (const req of required) {
    if (!mappedHeaders.includes(req)) {
      errors.push({
        row: 0,
        column: req,
        message: `必須カラム「${req}」がありません（検出されたカラム: ${headers.join(', ')}）`,
      });
    }
  }

  if (errors.length > 0) {
    return {
      headers: mappedHeaders,
      rows: [],
      errors,
      totalRows: rows.length,
      validRows: 0,
    };
  }

  // 各行をパース
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowData: ParsedRow = {};
    let rowValid = true;

    for (let j = 0; j < mappedHeaders.length; j++) {
      const key = mappedHeaders[j];
      const value = row[j] || '';

      // 必須チェック
      if (required.includes(key) && !value) {
        errors.push({
          row: i + 2, // 1-indexed + header row
          column: key,
          message: `「${key}」は必須です`,
        });
        rowValid = false;
        continue;
      }

      // 値の正規化
      rowData[key] = normalizeValue(key, value);
    }

    if (rowValid) {
      parsedRows.push(rowData);
    }
  }

  return {
    headers: mappedHeaders,
    rows: parsedRows,
    errors,
    totalRows: rows.length,
    validRows: parsedRows.length,
  };
}
