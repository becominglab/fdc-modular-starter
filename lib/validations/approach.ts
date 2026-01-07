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

// 結果ステータス
const resultStatusSchema = z.enum(['success', 'pending', 'failed'], {
  error: 'ステータスを選択してください',
});

// 目標期間タイプ
const goalPeriodSchema = z.enum(['weekly', 'monthly'], {
  error: '期間を選択してください',
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
  result_status: resultStatusSchema.optional(),
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
  result_status: resultStatusSchema.optional(),
  approached_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, '日時形式が正しくありません')
    .optional(),
});

// 目標作成スキーマ
export const createGoalSchema = z.object({
  period: goalPeriodSchema,
  target_count: z
    .number()
    .int('目標は整数で入力してください')
    .min(1, '目標は1以上を設定してください')
    .max(1000, '目標は1000以下で設定してください'),
  year: z.number().int().min(2020).max(2100).optional(),
  week_or_month: z.number().int().min(1).max(53).optional(),
});

// 目標更新スキーマ
export const updateGoalSchema = z.object({
  target_count: z
    .number()
    .int('目標は整数で入力してください')
    .min(1, '目標は1以上を設定してください')
    .max(1000, '目標は1000以下で設定してください'),
});

export type CreateApproachInput = z.infer<typeof createApproachSchema>;
export type UpdateApproachInput = z.infer<typeof updateApproachSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
