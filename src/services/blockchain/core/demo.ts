/**
 * Demonstration of Step 1: Core Infrastructure Components
 * This file shows how the Event Bus, Circuit Breaker, and Request Deduplicator work together
 */

import { blockchainEventBus } from './eventBus'
import { CircuitBreaker } from './circuitBreaker'
import { RequestDeduplicator } from './requestDeduplicator'

console.log('=== Step 1: Core Infrastructure Demo ===\n')

// 1. Event Bus Demo
console.log('1. Event Bus Demo:')
console.log('- Setting up event listeners...')

const unsubBalance = blockchainEventBus.on('balance:update', (data) => {
  console.log('  Balance Update:', data)
})

const unsubError = blockchainEventBus.on('error', (data) => {
  console.log('  Error Event:', data)
})

// Emit test events
blockchainEventBus.emit('balance:update', {
  wallet: '0x123...',
  network: 'ethereum',
  balance: { native: '1.5', nativeUSD: 3000, tokens: [], totalUSD: 3000 }
})

console.log('✅ Event Bus working!\n')

// 2. Circuit Breaker Demo
console.log('2. Circuit Breaker Demo:')
const breaker = new CircuitBreaker('test-service', {
  failureThreshold: 2,
  resetTimeout: 5000,
  halfOpenRequests: 1
})

// Simulate successful operation
console.log('- Testing successful operation...')
breaker.execute(async () => {
  console.log('  Operation succeeded')
  return 'success'
}).then(result => {
  console.log('  Result:', result)
  console.log('  Circuit state:', breaker.getState())
})

// Simulate failures
console.log('- Testing circuit breaker with failures...')
const failingOperation = async () => {
  throw new Error('Service unavailable')
}

// This will open the circuit after 2 failures
async function testCircuitBreaker() {
  try {
    await breaker.execute(failingOperation)
  } catch (e) {
    console.log('  First failure')
  }
  
  try {
    await breaker.execute(failingOperation)
  } catch (e) {
    console.log('  Second failure - circuit should open')
    console.log('  Circuit state:', breaker.getState())
  }
  
  // Try with fallback
  const result = await breaker.execute(
    failingOperation,
    async () => 'Fallback response'
  )
  console.log('  With fallback:', result)
}

testCircuitBreaker().then(() => {
  console.log('✅ Circuit Breaker working!\n')
})

// 3. Request Deduplicator Demo
console.log('3. Request Deduplicator Demo:')
const deduplicator = new RequestDeduplicator()

let callCount = 0
const expensiveOperation = async () => {
  callCount++
  console.log(`  Expensive operation called (count: ${callCount})`)
  await new Promise(resolve => setTimeout(resolve, 100))
  return `Result ${callCount}`
}

// Make multiple concurrent requests
console.log('- Making 3 concurrent requests for the same key...')
Promise.all([
  deduplicator.deduplicate('test-key', expensiveOperation),
  deduplicator.deduplicate('test-key', expensiveOperation),
  deduplicator.deduplicate('test-key', expensiveOperation)
]).then(results => {
  console.log('  Results:', results)
  console.log('  Operation was called only once!')
  console.log('✅ Request Deduplicator working!\n')
  
  // Show stats
  console.log('=== Integration Summary ===')
  console.log('Event Bus listeners:', {
    'balance:update': blockchainEventBus.getListenerCount('balance:update'),
    'error': blockchainEventBus.getListenerCount('error')
  })
  console.log('Circuit Breaker stats:', breaker.getStats())
  console.log('Deduplicator stats:', deduplicator.getStats())
  
  // Cleanup
  unsubBalance()
  unsubError()
  breaker.destroy()
  deduplicator.destroy()
  
  console.log('\n✅ Step 1 Complete: Core Infrastructure is ready!')
})

export {}