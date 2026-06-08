export interface EncryptedPayload {
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2' | 'Argon2id';
  salt: string;
  iv: string;
  ciphertext: string;
}

// Placeholder for Web Crypto API helpers.
// Implement before writing sensitive backups to Google Drive.
export async function encryptJson(payload: unknown, passphrase: string): Promise<EncryptedPayload> {
  void payload;
  void passphrase;
  throw new Error('Encryption is not implemented yet.');
}

export async function decryptJson<TPayload>(payload: EncryptedPayload, passphrase: string): Promise<TPayload> {
  void payload;
  void passphrase;
  throw new Error('Decryption is not implemented yet.');
}
