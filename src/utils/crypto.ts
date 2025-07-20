import CryptoJS from 'crypto-js'

export const encryptData = (data: string, password: string): string => {
  return CryptoJS.AES.encrypt(data, password).toString()
}

export const decryptData = (encryptedData: string, password: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) {
      throw new Error('Invalid password or corrupted data')
    }
    return decrypted
  } catch (error) {
    throw new Error('Decryption failed: Invalid password or corrupted data')
  }
}

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString()
}

export const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128 / 8).toString()
}

export const deriveKey = (password: string, salt: string, iterations: number = 100000): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: iterations,
  }).toString()
}

// Enhanced encryption with key derivation
export const encryptWithDerivedKey = (data: string, password: string, salt: string): string => {
  const key = deriveKey(password, salt)
  return CryptoJS.AES.encrypt(data, key).toString()
}

export const decryptWithDerivedKey = (encryptedData: string, password: string, salt: string): string => {
  try {
    const key = deriveKey(password, salt)
    const bytes = CryptoJS.AES.decrypt(encryptedData, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) {
      throw new Error('Invalid password or corrupted data')
    }
    return decrypted
  } catch (error) {
    throw new Error('Decryption failed: Invalid password or corrupted data')
  }
}