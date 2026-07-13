/**
 * Secret vault — AES-256-GCM encryption for sensitive settings fields.
 *
 * The encryption key is derived from the machine identity (hostname +
 * username) via scrypt, combined with a per-installation random salt
 * stored in ~/.tavernos/.vault-salt. This is NOT as strong as the OS
 * keychain (Electron safeStorage), but the backend server runs as a
 * standalone Node process without access to Electron's safeStorage API.
 *
 * Threat model:
 *   - Protects against casual file theft / backup leakage (attacker
 *     has the settings.json but not the machine identity).
 *   - Does NOT protect against an attacker with full machine access
 *     (they can derive the key from hostname + username).
 *
 * Encrypted values are stored as objects: { __enc: true, v, i, t }
 * where v = ciphertext, i = iv, t = auth tag (all hex strings).
 * Plaintext values are still accepted on read for backward compat.
 */

import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "node:crypto";
import { hostname, userInfo } from "node:os";
import { readFileSync, mkdirSync, openSync, closeSync, writeSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const SALT_FILE = join(homedir(), ".tavernos", ".vault-salt");
const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM standard
const SCRYPT_N = 16384; // cost factor

let _cachedKey: Buffer | null = null;

function getSalt(): Buffer {
  mkdirSync(dirname(SALT_FILE), { recursive: true });
  try {
    const fd = openSync(SALT_FILE, "wx");
    // we created it, write the salt
    const salt = randomBytes(16);
    writeSync(fd, salt.toString("hex"));
    closeSync(fd);
    return salt;
  } catch (e: any) {
    if (e.code === "EEXIST") {
      return Buffer.from(readFileSync(SALT_FILE, "utf8").trim(), "hex"); // another process created it
    }
    throw e;
  }
}

function deriveKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const machineId = `${hostname()}:${userInfo().username}`;
  const salt = getSalt();
  _cachedKey = scryptSync(machineId, salt, KEY_LEN, { N: SCRYPT_N });
  return _cachedKey;
}

export interface EncryptedBlob {
  __enc: true;
  v: string; // ciphertext (hex)
  i: string; // IV (hex)
  t: string; // auth tag (hex)
}

export function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).__enc === true &&
    typeof (value as Record<string, unknown>).v === "string" &&
    typeof (value as Record<string, unknown>).i === "string" &&
    typeof (value as Record<string, unknown>).t === "string"
  );
}

/**
 * Encrypt a plaintext string into an EncryptedBlob.
 * Returns null if input is null/undefined/empty.
 */
export function encryptSecret(plaintext: string | null | undefined): EncryptedBlob | null {
  if (plaintext == null || plaintext === "") return null;
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    __enc: true,
    v: encrypted.toString("hex"),
    i: iv.toString("hex"),
    t: tag.toString("hex"),
  };
}

/**
 * Decrypt an EncryptedBlob back to plaintext.
 * If the value is already a plaintext string, returns it as-is (backward compat).
 * Returns empty string if decryption fails or value is null/undefined.
 */
export function decryptSecret(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value; // plaintext (old format)
  if (isEncryptedBlob(value)) {
    try {
      const key = deriveKey();
      const iv = Buffer.from(value.i, "hex");
      const tag = Buffer.from(value.t, "hex");
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(Buffer.from(value.v, "hex")), decipher.final()]);
      return decrypted.toString("utf8");
    } catch {
      // Decryption failed (wrong machine, corrupted data, etc.)
      return "";
    }
  }
  return "";
}

/**
 * List of sensitive field paths in settings that should be encrypted.
 * Nested fields are represented as "parent.child".
 */
export const SENSITIVE_FIELDS = [
  "apiKey",
  "oauthToken",
  "imageConfig.apiKey",
  "ttsConfig.apiKey",
  "videoConfig.apiKey",
  "musicConfig.apiKey",
  "webdavConfig.password",
] as const;

/**
 * Recursively encrypt all string values inside an object that look like
 * API keys. Used for providerCredentials which is a Record<string, {apiKey, ...}>.
 */
export function encryptSecretFields<T>(obj: T): T {
  if (obj == null) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj;
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      // Encrypt string values that look like secrets (apiKey, password, token, secret)
      const lower = key.toLowerCase();
      if (lower.includes("apikey") || lower.includes("api_key") ||
          lower === "password" || lower === "token" || lower === "secret" ||
          lower === "refreshtoken" || lower === "refresh_token") {
        const enc = encryptSecret(val);
        if (enc) result[key] = enc;
      }
    } else if (typeof val === "object" && val !== null && !isEncryptedBlob(val)) {
      result[key] = encryptSecretFields(val);
    }
  }
  return result as T;
}

/**
 * Recursively decrypt all EncryptedBlob values inside an object.
 */
export function decryptSecretFields<T>(obj: T): T {
  if (obj == null) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj;
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (isEncryptedBlob(val)) {
      result[key] = decryptSecret(val);
    } else if (typeof val === "object" && val !== null) {
      result[key] = decryptSecretFields(val);
    }
  }
  return result as T;
}
