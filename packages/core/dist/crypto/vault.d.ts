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
export interface EncryptedBlob {
    __enc: true;
    v: string;
    i: string;
    t: string;
}
export declare function isEncryptedBlob(value: unknown): value is EncryptedBlob;
/**
 * Encrypt a plaintext string into an EncryptedBlob.
 * Returns null if input is null/undefined/empty.
 */
export declare function encryptSecret(plaintext: string | null | undefined): EncryptedBlob | null;
/**
 * Decrypt an EncryptedBlob back to plaintext.
 * If the value is already a plaintext string, returns it as-is (backward compat).
 * Returns empty string if decryption fails or value is null/undefined.
 */
export declare function decryptSecret(value: unknown): string;
/**
 * List of sensitive field paths in settings that should be encrypted.
 * Nested fields are represented as "parent.child".
 */
export declare const SENSITIVE_FIELDS: readonly ["apiKey", "oauthToken", "imageConfig.apiKey", "ttsConfig.apiKey", "videoConfig.apiKey", "musicConfig.apiKey", "webdavConfig.password"];
/**
 * Recursively encrypt all string values inside an object that look like
 * API keys. Used for providerCredentials which is a Record<string, {apiKey, ...}>.
 */
export declare function encryptSecretFields<T>(obj: T): T;
/**
 * Recursively decrypt all EncryptedBlob values inside an object.
 */
export declare function decryptSecretFields<T>(obj: T): T;
//# sourceMappingURL=vault.d.ts.map