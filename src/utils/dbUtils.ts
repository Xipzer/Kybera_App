/**
 * Database utility functions for wallet data management
 */

import { db } from '../services/storage/database'
import { encryptData, decryptData } from './crypto'

/**
 * Re-encrypt all wallet data when password changes
 */
export async function reencryptWalletData(oldPassword: string, newPassword: string): Promise<void> {
  try {
    await db.transaction('rw', db.walletGroups, db.wallets, async () => {
      // Re-encrypt wallet groups
      const groups = await db.walletGroups.toArray()
      for (const group of groups) {
        if (group.encryptedSeed) {
          const decryptedSeed = decryptData(group.encryptedSeed, oldPassword)
          const reencryptedSeed = encryptData(decryptedSeed, newPassword)
          await db.walletGroups.update(group.id!, { encryptedSeed: reencryptedSeed })
        }
      }

      // Re-encrypt imported wallets
      const wallets = await db.wallets.toArray()
      for (const wallet of wallets) {
        if (wallet.encryptedPrivateKey) {
          const decryptedKey = decryptData(wallet.encryptedPrivateKey, oldPassword)
          const reencryptedKey = encryptData(decryptedKey, newPassword)
          await db.wallets.update(wallet.id!, { encryptedPrivateKey: reencryptedKey })
        }
      }
    })
  } catch (error) {
    console.error('Failed to re-encrypt wallet data:', error)
    throw new Error('Failed to re-encrypt wallet data. Your password has not been changed.')
  }
}

/**
 * Cleanup auto-discovered tokens that may be causing RPC overload
 */
export async function cleanupDiscoveredTokens() {
  try {
    const allTokens = await db.discoveredTokens.toArray()
    const tokensToClean = allTokens.filter((token) => !token.addedManually)

    let deleteCount = 0
    for (const token of tokensToClean) {
      await db.discoveredTokens.delete(token.id)
      deleteCount++
    }

    // Also clean up zero balance tokens
    const allBalances = await db.tokenBalances.toArray()
    const zeroBalances = allBalances.filter((balance) => parseFloat(balance.balance) === 0)

    let deletedZeroBalances = 0
    for (const balance of zeroBalances) {
      await db.tokenBalances.delete(balance.id)
      deletedZeroBalances++
    }

    return { deletedTokens: deleteCount, deletedZeroBalances }
  } catch (error) {
    console.error('Error cleaning up tokens:', error)
    throw error
  }
}

// Export for browser console debugging
if (typeof window !== 'undefined') {
  ;(window as any).cleanupDiscoveredTokens = cleanupDiscoveredTokens
}
