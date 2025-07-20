import CryptoJS from 'crypto-js'

export const encryptData = (data: string, password: string): string => {
  return CryptoJS.AES.encrypt(data, password).toString()
}

export const decryptData = (encryptedData: string, password: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString()
}

export const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128 / 8).toString()
}

export const deriveKey = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString()
}