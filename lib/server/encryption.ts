import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  }
  return Buffer.from(key, 'base64');
}

/**
 * 文字列を AES-256-GCM で暗号化
 * @param text 暗号化する文字列
 * @returns Base64エンコードされた暗号文（iv:authTag:encrypted）
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // iv:authTag:encrypted の形式で返す
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * AES-256-GCM で暗号化された文字列を復号
 * @param encryptedData Base64エンコードされた暗号文（iv:authTag:encrypted）
 * @returns 復号された文字列
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * トークンが期限切れかどうかを確認
 * @param expiresAt ISO形式の日時文字列
 * @param bufferMinutes 余裕を持たせる分数（デフォルト5分）
 */
export function isTokenExpired(expiresAt: string | null, bufferMinutes = 5): boolean {
  if (!expiresAt) return true;
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const buffer = bufferMinutes * 60 * 1000;
  return now >= expiryTime - buffer;
}
