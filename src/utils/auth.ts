import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha256 } from '@noble/hashes/sha256'
import { randomBytes } from '@noble/hashes/utils'

const SALT_LENGTH = 32
const ITERATIONS = 100000
const KEY_LENGTH = 32

export interface PasswordHash {
  hash: string
  salt: string
}

/**
 * Generate a random salt for password hashing
 */
export function generateSalt(): Uint8Array {
  return randomBytes(SALT_LENGTH)
}

/**
 * Hash a password using PBKDF2 with SHA-256
 */
export async function hashPassword(password: string, salt?: Uint8Array): Promise<PasswordHash> {
  const saltBytes = salt || generateSalt()
  const passwordBytes = new TextEncoder().encode(password)
  
  // Use PBKDF2 to derive a key from the password
  const derivedKey = pbkdf2(sha256, passwordBytes, saltBytes, {
    c: ITERATIONS,
    dkLen: KEY_LENGTH
  })
  
  return {
    hash: Buffer.from(derivedKey).toString('hex'),
    salt: Buffer.from(saltBytes).toString('hex')
  }
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const saltBytes = Buffer.from(storedSalt, 'hex')
  const { hash } = await hashPassword(password, saltBytes)
  return hash === storedHash
}

/**
 * Derive an encryption key from a password
 * This key is used to encrypt/decrypt wallet data
 */
export function deriveEncryptionKey(password: string, salt: string): Uint8Array {
  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = Buffer.from(salt, 'hex')
  
  // Use a different iteration count for encryption key derivation
  return pbkdf2(sha256, passwordBytes, saltBytes, {
    c: ITERATIONS,
    dkLen: 32 // 256-bit key for AES-256
  })
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const randomValues = randomBytes(length)
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }
  
  return password
}