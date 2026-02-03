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
