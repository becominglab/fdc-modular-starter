import { z } from 'zod';

/**
 * リードステータスのスキーマ
 */
const prospectStatusSchema = z.enum(
  ['new', 'approaching', 'negotiating', 'proposing', 'won', 'lost'],
  {
    error: '有効なステータスを選択してください',
  }
);

/**
 * リード作成のスキーマ
 */
export const createProspectSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内です'),
  company: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内です'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内です')
    .optional()
    .or(z.literal('')),
  status: prospectStatusSchema.optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .optional()
    .or(z.literal('')),
});

/**
 * リード更新のスキーマ
 */
export const updateProspectSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内です')
    .optional(),
  company: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内です')
    .optional(),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .nullable()
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内です')
    .nullable()
    .optional()
    .or(z.literal('')),
  status: prospectStatusSchema.optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .nullable()
    .optional()
    .or(z.literal('')),
});

/**
 * ステータス更新のスキーマ
 */
export const updateStatusSchema = z.object({
  status: prospectStatusSchema,
});

// 型のエクスポート
export type CreateProspectInput = z.infer<typeof createProspectSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
