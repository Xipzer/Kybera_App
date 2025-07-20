import { db } from '../services/storage/database'
import { encryptData, decryptData } from './crypto'

export async function reencryptWalletData(oldPassword: string, newPassword: string): Promise<void> {
  try {
    // Start a transaction to ensure atomicity
    await db.transaction('rw', db.walletGroups, db.wallets, async () => {
      // Re-encrypt wallet groups
      const groups = await db.walletGroups.toArray()
      for (const group of groups) {
        if (group.encryptedSeed) {
          // Decrypt with old password
          const decryptedSeed = decryptData(group.encryptedSeed, oldPassword)
          // Re-encrypt with new password
          const reencryptedSeed = encryptData(decryptedSeed, newPassword)
          
          // Update the group
          await db.walletGroups.update(group.id!, {
            encryptedSeed: reencryptedSeed
          })
        }
      }
      
      // Re-encrypt imported wallets (those with private keys)
      const wallets = await db.wallets.toArray()
      for (const wallet of wallets) {
        if (wallet.encryptedPrivateKey) {
          // Decrypt with old password
          const decryptedKey = decryptData(wallet.encryptedPrivateKey, oldPassword)
          // Re-encrypt with new password
          const reencryptedKey = encryptData(decryptedKey, newPassword)
          
          // Update the wallet
          await db.wallets.update(wallet.id!, {
            encryptedPrivateKey: reencryptedKey
          })
        }
      }
    })
  } catch (error) {
    console.error('Failed to re-encrypt wallet data:', error)
    throw new Error('Failed to re-encrypt wallet data. Your password has not been changed.')
  }
}