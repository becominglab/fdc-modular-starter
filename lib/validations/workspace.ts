import { z } from 'zod';

/**
 * スラッグのバリデーション
 * - 3〜30文字
 * - 小文字英数字とハイフンのみ
 * - ハイフンで始まらない・終わらない
 */
const slugSchema = z
  .string()
  .min(3, 'スラッグは3文字以上必要です')
  .max(30, 'スラッグは30文字以内です')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'スラッグは小文字英数字とハイフンのみ使用可能です'
  );

/**
 * ワークスペース作成のスキーマ
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内です'),
  slug: slugSchema,
  description: z
    .string()
    .max(200, '説明は200文字以内です')
    .optional(),
});

/**
 * ワークスペース更新のスキーマ
 */
export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内です')
    .optional(),
  description: z
    .string()
    .max(200, '説明は200文字以内です')
    .nullable()
    .optional(),
});

/**
 * メンバー招待のスキーマ
 */
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'member'], {
    error: 'ロールは admin または member です',
  }),
});

/**
 * ロール更新のスキーマ
 */
export const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member'], {
    error: '有効なロールを選択してください',
  }),
});

// 型のエクスポート
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
