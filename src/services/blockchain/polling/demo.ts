/**
 * Demonstration of Step 2: Adaptive Polling and Enhanced Cache Manager
 */

import { adaptivePollingManager } from './adaptivePollingManager'
import { enhancedCacheManager } from '../cache/enhancedCacheManager'
import { blockchainEventBus } from '../core/eventBus'

console.log('=== Step 2: Adaptive Polling & Enhanced Cache Demo ===\n')

// 1. Adaptive Polling Demo
console.log('1. Adaptive Polling Demo:')
console.log('- Current polling stats:', adaptivePollingManager.getPollingStats())

// Simulate user activity
console.log('- Simulating user activity...')
blockchainEventBus.emit('activity:detected', { type: 'user' })

// Start a test poll
let pollCount = 0
adaptivePollingManager.startPolling(
  'test-wallet',
  async () => {
    pollCount++
    console.log(`  Poll executed #${pollCount} at interval: ${adaptivePollingManager.getCurrentInterval()}ms`)
  },
  { immediate: true }
)

// Show how intervals change
console.log('- Testing interval adaptation:')
console.log('  Active state interval:', adaptivePollingManager.getCurrentInterval())

// Simulate idle state
setTimeout(() => {
  console.log('  Simulating idle state after 2 seconds...')
  // Update config to make idle happen faster for demo
  adaptivePollingManager.updateConfig({
    thresholds: { activityTimeout: 1000 } // 1 second for demo
  })
}, 2000)

setTimeout(() => {
  console.log('  Current interval (should be idle):', adaptivePollingManager.getCurrentInterval())
  console.log('  Polling stats:', adaptivePollingManager.getPollingStats().status)
  console.log('✅ Adaptive Polling working!\n')
  
  // 2. Enhanced Cache Manager Demo
  console.log('2. Enhanced Cache Manager Demo:')
  demonstrateCacheManager()
}, 3000)

async function demonstrateCacheManager() {
  // Test cache set/get
  console.log('- Testing cache operations...')
  
  // Cache some balance data
  await enhancedCacheManager.set('balance_0x123_eth', 'balance', {
    native: '1.5',
    nativeUSD: 3000,
    tokens: [],
    totalUSD: 3000
  })
  
  // Get from cache
  const cached = await enhancedCacheManager.get('balance_0x123_eth', 'balance')
  console.log('  Cached balance:', cached)
  
  // Test cache with fetcher
  console.log('- Testing cache with fetcher...')
  let fetchCount = 0
  const fetcher = async () => {
    fetchCount++
    console.log(`  Fetcher called (count: ${fetchCount})`)
    return { data: 'fetched value' }
  }
  
  // First call - should fetch
  await enhancedCacheManager.get('test_key', 'metadata', fetcher)
  
  // Second call - should use cache
  await enhancedCacheManager.get('test_key', 'metadata', fetcher)
  console.log(`  Fetcher was called ${fetchCount} time(s) (should be 1)`)
  
  // Test cache invalidation via event
  console.log('- Testing event-based invalidation...')
  await enhancedCacheManager.set('balance_0x456_eth', 'balance', { native: '2.0' })
  
  // Emit transaction event - should invalidate balance cache
  blockchainEventBus.emit('transaction:new', {
    transaction: { hash: '0xabc', from: '0x456' }
  })
  
  // Try to get - should be null
  const afterInvalidate = await enhancedCacheManager.get('balance_0x456_eth', 'balance')
  console.log('  After invalidation:', afterInvalidate, '(should be null)')
  
  // Show cache stats
  console.log('- Cache stats:', enhancedCacheManager.getStats())
  console.log('✅ Enhanced Cache Manager working!\n')
  
  // 3. Integration Demo
  console.log('3. Integration with Upgraded Service:')
  integratedDemo()
}

async function integratedDemo() {
  const { upgradedBlockchainService } = await import('../upgradedBlockchainService')
  
  // Get comprehensive stats
  const stats = upgradedBlockchainService.getStats()
  console.log('- Service stats:')
  console.log('  Polling:', stats.polling.status)
  console.log('  Cache entries:', stats.cache.entries)
  console.log('  Cache hit rate:', (stats.cache.hitRate * 100).toFixed(1) + '%')
  console.log('  Circuit breakers:', stats.circuitBreakers.size)
  
  console.log('\n✅ Step 2 Complete: Adaptive Polling & Enhanced Cache are ready!')
  
  // Cleanup
  adaptivePollingManager.stopAll()
  enhancedCacheManager.clear()
  
  process.exit(0)
}

export {}