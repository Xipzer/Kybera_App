/**
 * Code by Xipzer
 */

const SALT_LENGTH = 32
const ITERATIONS = 600_000
const KEY_LENGTH = 32

export interface PasswordHash {
  hash: string
  salt: string
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, salt?: Uint8Array): Promise<PasswordHash> {
  const saltBytes = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8,
  )
  return {
    hash: toHex(derivedBits),
    salt: toHex(saltBytes),
  }
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const saltBytes = Uint8Array.from(storedSalt.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const { hash } = await hashPassword(password, saltBytes)
  return hash === storedHash
}
