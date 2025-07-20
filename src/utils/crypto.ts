/**
 * Code by Xipzer
 */

const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 32
const IV_BYTES = 12

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const encryptData = async (data: string, password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await deriveKey(password, salt),
      new TextEncoder().encode(data),
    ),
  )
  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.length)
  combined.set(salt, 0)
  combined.set(iv, SALT_BYTES)
  combined.set(ciphertext, SALT_BYTES + IV_BYTES)
  return btoa(String.fromCharCode(...combined))
}

export const decryptData = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const raw = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))
    const salt = raw.slice(0, SALT_BYTES)
    const iv = raw.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
    const ciphertext = raw.slice(SALT_BYTES + IV_BYTES)
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        await deriveKey(password, salt),
        ciphertext,
      ),
    )
  } catch {
    throw new Error('Decryption failed: Invalid password or corrupted data')
  }
}
