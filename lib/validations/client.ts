import { z } from 'zod';

/**
 * クライアント作成のスキーマ
 */
export const createClientSchema = z.object({
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
  contract_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .optional()
    .or(z.literal('')),
  prospect_id: z
    .string()
    .uuid('無効なリードIDです')
    .optional(),
});

/**
 * クライアント更新のスキーマ
 */
export const updateClientSchema = z.object({
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
  contract_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .nullable()
    .optional()
    .or(z.literal('')),
});

/**
 * リード→クライアント変換のスキーマ
 */
export const convertToClientSchema = z.object({
  prospect_id: z
    .string()
    .uuid('無効なリードIDです'),
  contract_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .optional()
    .or(z.literal('')),
});

// 型のエクスポート
export type CreateClientSchemaInput = z.infer<typeof createClientSchema>;
export type UpdateClientSchemaInput = z.infer<typeof updateClientSchema>;
export type ConvertToClientSchemaInput = z.infer<typeof convertToClientSchema>;
