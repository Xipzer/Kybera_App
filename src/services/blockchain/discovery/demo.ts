/**
 * Demonstration of Step 3: Intelligent Token Discovery
 */

import { tokenDiscoveryService } from './tokenDiscoveryService'
import { blockchainEventBus } from '../core/eventBus'
import { enhancedBlockchainServiceV2 } from '../enhancedBlockchainServiceV2'

console.log('=== Step 3: Intelligent Token Discovery Demo ===\n')

async function demonstrateTokenDiscovery() {
  // 1. Token Discovery Strategies Demo
  console.log('1. Token Discovery Strategies:')
  
  // Set up event listeners
  const unsubStart = blockchainEventBus.on('token:discovery:start', (data) => {
    console.log(`  Discovery started for ${data.wallet} on chain ${data.chainId}`)
  })
  
  const unsubComplete = blockchainEventBus.on('token:discovery:complete', (data) => {
    console.log(`  Discovery completed: ${data.count} tokens found`)
  })
  
  // Simulate discovery for Ethereum mainnet
  const testWallet = '0x742d35Cc6634C0532925a3b844Bc9e7095833a06' // Example address
  const ethMainnetChainId = 1
  const mockNetwork = {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: ethMainnetChainId,
    rpcUrl: 'https://eth.example.com'
  }
  
  console.log('- Running token discovery for Ethereum mainnet...')
  const discoveredTokens = await tokenDiscoveryService.discoverTokens(
    testWallet,
    ethMainnetChainId,
    mockNetwork,
    {
      includeZeroBalance: true,
      strategies: ['popular', 'defi'] // Just use popular and defi for demo
    }
  )
  
  console.log(`  Found ${discoveredTokens.length} tokens:`)
  discoveredTokens.slice(0, 5).forEach(token => {
    console.log(`    - ${token.symbol} (${token.name}) - Source: ${token.metadata?.discoverySource}`)
  })
  
  // 2. Token Scoring Demo
  console.log('\n2. Token Scoring System:')
  console.log('- Scoring factors:')
  console.log('  Manual tokens: 1000 points (highest priority)')
  console.log('  Tokens with balance: 100 points')
  console.log('  Recent activity: 50 points')
  console.log('  Age bonus: up to 10 points')
  console.log('  Popularity: up to 25 points')
  
  // 3. Manual Token Management Demo
  console.log('\n3. Manual Token Management:')
  
  // Add a manual token
  console.log('- Adding manual token...')
  await tokenDiscoveryService.addManualToken(
    testWallet,
    ethMainnetChainId,
    '0x1234567890123456789012345678901234567890',
    {
      symbol: 'DEMO',
      name: 'Demo Token',
      decimals: 18
    }
  )
  console.log('  ✅ Manual token added')
  
  // Get discovery stats
  const stats = await tokenDiscoveryService.getDiscoveryStats(testWallet, ethMainnetChainId)
  console.log('- Discovery stats:', {
    totalDiscovered: stats.totalDiscovered,
    manualTokens: stats.manualTokens,
    tokensBySource: stats.tokensBySource
  })
  
  // 4. Integration with Enhanced Service
  console.log('\n4. Integration with Enhanced Blockchain Service:')
  
  // Show how the service integrates token discovery
  const serviceStats = enhancedBlockchainServiceV2.getStats()
  console.log('- Service integration:')
  console.log('  Event listeners:', serviceStats.eventBus.listeners)
  console.log('  Active monitoring:', serviceStats.monitoring.activeWallets)
  
  // 5. Discovery Strategies Overview
  console.log('\n5. Available Discovery Strategies:')
  console.log('  1. Manual - User-added tokens (highest priority)')
  console.log('  2. Historical - Tokens from transaction history')
  console.log('  3. Alchemy - Automatic discovery via Alchemy SDK')
  console.log('  4. Popular - Common tokens for the chain')
  console.log('  5. DeFi - Major DeFi protocol tokens')
  
  console.log('\n✅ Step 3 Complete: Intelligent Token Discovery is ready!')
  
  // Cleanup
  unsubStart()
  unsubComplete()
  
  // Clean up demo data
  await tokenDiscoveryService.removeManualToken(
    testWallet,
    ethMainnetChainId,
    '0x1234567890123456789012345678901234567890'
  )
}

// Run demo
demonstrateTokenDiscovery().catch(console.error)

export {}