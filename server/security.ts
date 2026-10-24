import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const SECRET_KEY_FILE = path.join(DATA_DIR, '.secret.key');

// Ensure persistent 32-byte master encryption key
function getOrCreateMasterKey(): Buffer {
  // If SERVER_SECRET is set in environment (e.g. on Render), derive 32-byte key from it
  if (process.env.SERVER_SECRET && process.env.SERVER_SECRET.trim().length >= 8) {
    return crypto.createHash('sha256').update(process.env.SERVER_SECRET.trim()).digest();
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(SECRET_KEY_FILE)) {
    try {
      const keyHex = fs.readFileSync(SECRET_KEY_FILE, 'utf-8').trim();
      if (keyHex.length === 64) {
        return Buffer.from(keyHex, 'hex');
      }
    } catch (e) {
      console.warn('Could not read master key file, generating new one:', e);
    }
  }

  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(SECRET_KEY_FILE, newKey.toString('hex'), { mode: 0o600 });
  } catch (err) {
    console.error('Failed to write secret key file:', err);
  }
  return newKey;
}

const MASTER_KEY = getOrCreateMasterKey();

// --- AES-256-GCM Encryption for Telegram Bot Token & Sensitive Secrets ---

export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `aes-gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith('aes-gcm:')) {
    // If not encrypted (e.g. legacy plain text), return as is
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) return '';
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedHex = parts[3];

    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('Failed to decrypt secret:', err.message);
    return '';
  }
}

// Mask token for safe UI display (e.g. 7123••••••••4567)
export function maskToken(token: string): string {
  if (!token) return '';
  const clean = token.trim();
  if (clean.length <= 8) return '••••••••';
  return clean.slice(0, 4) + '••••••••' + clean.slice(-4);
}

// --- Password Hashing with scrypt and random salt ---

export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash) return false;

  // Support scrypt format
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const originalHash = parts[2];
    const derivedHash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derivedHash, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  // Backwards compatibility for plain text initial seed before first change
  const legacyAllowed = ['admin', 'admin123', 'admin12345678', 'shubrend2025', 'shubrend_admin', 'password123'];
  return legacyAllowed.includes(plainPassword) && (storedHash === plainPassword || legacyAllowed.includes(storedHash));
}
