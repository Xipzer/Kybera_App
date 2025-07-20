/**
 * Code by Xipzer
 */

import { db } from '../services/database'
import { encryptData, decryptData } from './crypto'

export async function reencryptWalletData(oldPassword: string, newPassword: string): Promise<void> {
  try {
    await db.transaction('rw', db.walletGroups, db.wallets, async () => {
      for (const group of await db.walletGroups.toArray()) {
        if (group.encryptedSeed) {
          await db.walletGroups.update(group.id!, {
            encryptedSeed: await encryptData(
              await decryptData(group.encryptedSeed, oldPassword),
              newPassword,
            ),
          })
        }
      }

      const wallets = await db.wallets.toArray()
      for (const wallet of wallets) {
        if (wallet.encryptedPrivateKey) {
          await db.wallets.update(wallet.id!, {
            encryptedPrivateKey: await encryptData(
              await decryptData(wallet.encryptedPrivateKey, oldPassword),
              newPassword,
            ),
          })
        }
      }
    })
  } catch (error) {
    console.error('Failed to re-encrypt wallet data:', error)
    throw new Error('Failed to re-encrypt wallet data. Your password has not been changed.')
  }
}

export async function cleanupDiscoveredTokens() {
  try {

    let deleteCount = 0
    for (const token of (await db.discoveredTokens.toArray()).filter(
      (token) => !token.addedManually,
    )) {
      await db.discoveredTokens.delete(token.id)
      deleteCount++
    }

    const zeroBalances = (await db.tokenBalances.toArray()).filter(
      (balance) => parseFloat(balance.balance) === 0,
    )

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

