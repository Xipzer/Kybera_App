import { db } from '../services/storage/database'

/**
 * Cleanup accumulated discovered tokens that are causing RPC overload
 * This should be run once to fix the issue, then the prevention measures
 * in simpleBlockchainService.ts will prevent it from happening again
 */
export async function cleanupDiscoveredTokens() {
  try {
    // Get all discovered tokens
    const allTokens = await db.discoveredTokens.toArray()
    
    // Filter for non-manually added tokens
    const tokensToClean = allTokens.filter(token => !token.addedManually)
    
    console.log(`Found ${tokensToClean.length} auto-discovered tokens to clean up`)
    
    // Delete each non-manually added token
    let deleteCount = 0
    for (const token of tokensToClean) {
      await db.discoveredTokens.delete(token.id)
      deleteCount++
    }
    
    console.log(`Deleted ${deleteCount} auto-discovered tokens`)
    
    // Also clean up token balances with zero balance
    const allBalances = await db.tokenBalances.toArray()
    const zeroBalances = allBalances.filter(balance => parseFloat(balance.balance) === 0)
    
    let deletedZeroBalances = 0
    for (const balance of zeroBalances) {
      await db.tokenBalances.delete(balance.id)
      deletedZeroBalances++
    }
    
    console.log(`Deleted ${deletedZeroBalances} zero-balance token records`)
    
    return {
      deletedTokens: deleteCount,
      deletedZeroBalances: deletedZeroBalances
    }
  } catch (error) {
    console.error('Error cleaning up tokens:', error)
    throw error
  }
}

// Export for use in browser console if needed
if (typeof window !== 'undefined') {
  (window as any).cleanupDiscoveredTokens = cleanupDiscoveredTokens
}