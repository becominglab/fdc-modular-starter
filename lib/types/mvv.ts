/**
 * lib/types/mvv.ts
 *
 * MVV（Mission/Vision/Value）の型定義
 */

// MVV エンティティ
export interface MVV {
  id: string;
  brand_id: string;
  user_id: string;
  mission: string | null;
  vision: string | null;
  values: string[];
  created_at: string;
  updated_at: string;
}

// MVV 作成用
export interface MVVCreate {
  brand_id: string;
  mission?: string | null;
  vision?: string | null;
  values?: string[];
}

// MVV 更新用
export interface MVVUpdate {
  mission?: string | null;
  vision?: string | null;
  values?: string[];
}

// MVV セクション情報
export const MVV_SECTION_INFO = {
  mission: {
    label: 'Mission',
    labelJa: '使命',
    description: '会社・サービスの存在意義。なぜ存在するのか？',
    placeholder: '例: テクノロジーで人々の生活を豊かにする',
    examples: [
      'すべての人に学びの機会を届ける',
      '持続可能な社会を次世代に残す',
      'ビジネスの成長を加速させる',
    ],
  },
  vision: {
    label: 'Vision',
    labelJa: '将来像',
    description: '実現したい未来の姿。どこを目指すのか？',
    placeholder: '例: すべての人がクリエイターになれる世界',
    examples: [
      '誰もが自分らしく働ける社会',
      'テクノロジーと人間が共存する未来',
      '国境を超えてつながる世界',
    ],
  },
  values: {
    label: 'Values',
    labelJa: '価値観',
    description: '大切にする行動指針。どう行動するか？',
    placeholder: '例: ユーザーファースト',
    examples: [
      '失敗を恐れずチャレンジ',
      '透明性のあるコミュニケーション',
      'スピードを重視する',
      '多様性を尊重する',
    ],
  },
};
