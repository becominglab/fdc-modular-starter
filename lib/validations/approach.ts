/**
 * lib/validations/approach.ts
 *
 * アプローチのZodバリデーションスキーマ
 */

import { z } from 'zod';

// アプローチタイプ
const approachTypeSchema = z.enum(['call', 'email', 'meeting', 'visit', 'other'], {
  error: 'タイプを選択してください',
});

// アプローチ作成スキーマ
export const createApproachSchema = z.object({
  prospect_id: z.string().uuid({
    message: '有効なリードIDを指定してください',
  }),
  type: approachTypeSchema,
  content: z
    .string()
    .min(1, '内容を入力してください')
    .max(2000, '内容は2000文字以内で入力してください'),
  result: z
    .string()
    .max(1000, '結果は1000文字以内で入力してください')
    .optional(),
  approached_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, '日時形式が正しくありません')
    .optional(),
});

// アプローチ更新スキーマ
export const updateApproachSchema = z.object({
  type: approachTypeSchema.optional(),
  content: z
    .string()
    .min(1, '内容を入力してください')
    .max(2000, '内容は2000文字以内で入力してください')
    .optional(),
  result: z
    .string()
    .max(1000, '結果は1000文字以内で入力してください')
    .optional(),
  approached_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, '日時形式が正しくありません')
    .optional(),
});

export type CreateApproachInput = z.infer<typeof createApproachSchema>;
export type UpdateApproachInput = z.infer<typeof updateApproachSchema>;
